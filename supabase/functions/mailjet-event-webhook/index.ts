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

  // Optional shared-secret protection. If MAILJET_WEBHOOK_TOKEN is configured,
  // Mailjet must include it as `?token=...` (Mailjet supports custom URLs).
  const expectedToken = Deno.env.get("MAILJET_WEBHOOK_TOKEN");
  if (expectedToken) {
    const url = new URL(req.url);
    if (url.searchParams.get("token") !== expectedToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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

      // Find matching log row
      const { data: row, error: fetchErr } = await supabase
        .from("email_log")
        .select(
          "id, status, mailjet_events, open_count, click_count, delivered_at, opened_at, clicked_at",
        )
        .eq("mailjet_message_id", messageId)
        .maybeSingle();

      if (fetchErr) {
        console.error("Lookup error:", fetchErr);
        continue;
      }

      if (!row) {
        unmatched++;
        console.log(`No email_log row for MessageID=${messageId} event=${eventType}`);
        continue;
      }

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

      // Set the per-event timestamp on first occurrence only
      if (column) {
        const existing = (row as Record<string, unknown>)[column];
        if (!existing) update[column] = eventTs;
      }

      // Increment counters for engagement events
      if (eventType === "open") {
        update.open_count = (row.open_count ?? 0) + 1;
      } else if (eventType === "click") {
        update.click_count = (row.click_count ?? 0) + 1;
      }

      // Promote status only when the new event is "stronger" than the current one
      if (newStatus) {
        const currentRank = STATUS_RANK[row.status as string] ?? 1;
        const nextRank = STATUS_RANK[newStatus] ?? 1;
        if (nextRank > currentRank) {
          update.status = newStatus;
        }
      }

      // Capture error message for failure events
      if (ev.error && (eventType === "bounce" || eventType === "blocked")) {
        update.error_message = ev.error;
      }

      const { error: updateErr } = await supabase
        .from("email_log")
        .update(update)
        .eq("id", row.id);

      if (updateErr) {
        console.error("Update error:", updateErr);
        continue;
      }

      processed++;
    } catch (err) {
      console.error("Event processing error:", err);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, processed, unmatched, total: events.length }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
