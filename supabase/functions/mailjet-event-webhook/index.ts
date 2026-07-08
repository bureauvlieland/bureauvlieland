import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Mailjet event types we track. Reference:
// https://dev.mailjet.com/email/guides/webhooks/
type MailjetEvent = {
  event:
    | "sent"
    | "open"
    | "click"
    | "bounce"
    | "blocked"
    | "spam"
    | "unsub"
    | "deferred";
  time?: number; // unix seconds
  MessageID?: number | string;
  Message_GUID?: string;
  email?: string;
  error?: string;
  error_related_to?: string;
  hard_bounce?: boolean;
  customcampaign?: string;
  url?: string;
};

const EVENT_TO_COLUMN: Record<string, string | null> = {
  sent: "delivered_at",
  open: "opened_at",
  click: "clicked_at",
  bounce: "bounced_at",
  blocked: "blocked_at",
  spam: "spam_at",
  unsub: "unsub_at",
  deferred: null,
};

const EVENT_TO_STATUS: Record<string, string | null> = {
  sent: "delivered",
  open: "opened",
  click: "clicked",
  bounce: "bounced",
  blocked: "blocked",
  spam: "spam",
  unsub: "unsubscribed",
  deferred: null,
};

// Status priority — never overwrite a "stronger" terminal/engagement status
// with a weaker one (e.g. don't downgrade "clicked" to "opened" if a delayed
// open event arrives later).
const STATUS_RANK: Record<string, number> = {
  pending: 0,
  failed: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
  bounced: 5,
  blocked: 5,
  spam: 5,
  unsubscribed: 5,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Mandatory shared-secret guard. Mailjet must include `?token=...` matching
  // MAILJET_WEBHOOK_TOKEN. Fail closed if the secret is not configured on the
  // server so that a missing env var never leaves this endpoint fully open.
  const expectedToken = Deno.env.get("MAILJET_WEBHOOK_TOKEN");
  if (!expectedToken) {
    console.error("mailjet-event-webhook: MAILJET_WEBHOOK_TOKEN is not configured");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== expectedToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: MailjetEvent | MailjetEvent[];
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const events: MailjetEvent[] = Array.isArray(payload) ? payload : [payload];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let processed = 0;
  let unmatched = 0;

  for (const ev of events) {
    try {
      const messageId = ev.MessageID != null ? String(ev.MessageID) : null;
      if (!messageId) {
        unmatched++;
        continue;
      }

      const eventType = ev.event;
      const column = EVENT_TO_COLUMN[eventType] ?? null;
      const newStatus = EVENT_TO_STATUS[eventType] ?? null;
      const eventTs = ev.time
        ? new Date(ev.time * 1000).toISOString()
        : new Date().toISOString();

      // Find ALL matching log rows. mailjet_message_id is niet uniek:
      // group-mails (send-items-to-partners, notify-partners-informational,
      // accept-quote-proposal) schrijven per item een aparte email_log-rij
      // met dezelfde mailjet_message_id, zodat de item-popover per rij een
      // related_item_id kan tonen. Elk Mailjet-event moet ALLE rijen
      // bijwerken — anders krijgt maar één item zijn open/click/delivered.
      const { data: rows, error: fetchErr } = await supabase
        .from("email_log")
        .select(
          "id, status, mailjet_events, open_count, click_count, delivered_at, opened_at, clicked_at, bounced_at, blocked_at, spam_at, unsub_at",
        )
        .eq("mailjet_message_id", messageId);

      if (fetchErr) {
        console.error("Lookup error:", fetchErr);
        continue;
      }

      if (!rows || rows.length === 0) {
        unmatched++;
        console.log(`No email_log row for MessageID=${messageId} event=${eventType}`);
        continue;
      }

      const updates = await Promise.all(
        rows.map(async (row) => {
          const eventsHistory = Array.isArray(row.mailjet_events)
            ? (row.mailjet_events as unknown[])
            : [];
          const newHistory = [
            ...eventsHistory,
            {
              event: eventType,
              time: eventTs,
              email: ev.email,
              error: ev.error,
              error_related_to: ev.error_related_to,
              hard_bounce: ev.hard_bounce,
              url: ev.url,
            },
          ];

          const update: Record<string, unknown> = {
            mailjet_events: newHistory,
          };

          if (column) {
            const existing = (row as Record<string, unknown>)[column];
            if (!existing) update[column] = eventTs;
          }

          if (eventType === "open") {
            update.open_count = (row.open_count ?? 0) + 1;
          } else if (eventType === "click") {
            update.click_count = (row.click_count ?? 0) + 1;
          }

          if (newStatus) {
            const currentRank = STATUS_RANK[row.status as string] ?? 1;
            const nextRank = STATUS_RANK[newStatus] ?? 1;
            if (nextRank > currentRank) {
              update.status = newStatus;
            }
          }

          if (ev.error && (eventType === "bounce" || eventType === "blocked")) {
            update.error_message = ev.error;
          }

          const { error: updateErr } = await supabase
            .from("email_log")
            .update(update)
            .eq("id", row.id);

          if (updateErr) {
            console.error(`Update error for row ${row.id}:`, updateErr);
            return false;
          }
          return true;
        }),
      );

      processed += updates.filter(Boolean).length;

      // Auto-suppress: bij een terminale negatieve gebeurtenis het adres
      // op de suppressielijst zetten zodat volgende sends direct worden
      // geweigerd. Voor 'bounce' alleen bij `hard_bounce: true` — een
      // soft bounce (mailbox vol, tijdelijk onbereikbaar) mag nog wel
      // opnieuw worden geprobeerd.
      const suppressReason = (() => {
        if (eventType === "spam") return "spam";
        if (eventType === "blocked") return "blocked";
        if (eventType === "unsub") return "unsub";
        if (eventType === "bounce" && ev.hard_bounce === true) return "bounce";
        return null;
      })();

      if (suppressReason && ev.email) {
        const { error: suppErr } = await supabase
          .from("email_suppressions")
          .upsert(
            {
              email: ev.email.trim().toLowerCase(),
              reason: suppressReason,
              source: "mailjet-webhook",
              notes: ev.error ?? null,
            },
            { onConflict: "email" },
          );
        if (suppErr) {
          console.error(
            `Failed to upsert suppression for ${ev.email}:`,
            suppErr.message,
          );
        }
      }
    } catch (err) {
      console.error("Event processing error:", err);
    }
  }



  return new Response(
    JSON.stringify({ ok: true, processed, unmatched, total: events.length }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
