// send-bureau-daily-digest
//
// Eén mail per ochtend aan het bureau (docs/plan-notificaties.md, §5 fase 4):
// wat er gisteren binnenkwam (Werkbank-cluster "Binnengekomen"), wat vandaag
// verloopt (taken met deadline, offertes die vandaag aflopen), wat langer dan
// drie dagen open staat (taken en onbeantwoorde gesprekken) en hoeveel mails
// gisteren niet aankwamen. Gaat ook als er niets is ("Niets nieuws"), zodat
// het uitblijven van de mail zelf een signaal is.
//
// Cron: dagelijks 06:30 UTC (07:30 in de winter, 08:30 in de zomer); zie de
// migratie 20261121190000. Idempotent per lokale dag via idempotency_key;
// body { force: true } stuurt opnieuw (handmatig testen).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendMailjet } from "../_shared/mailjet-send.ts";
import { logEmail } from "../_shared/email-logger.ts";
import { getPortalBaseUrl, getRecipientEmail, getSubjectPrefix, wrapEmailHtml } from "../_shared/email-templates.ts";
import { GENERAL_CONTACT_EMAIL } from "../_shared/bureau-contact.ts";
import { resolveBureauAddress } from "../_shared/bureau-event.ts";
import { INBOUND_AUTO_TYPES } from "../_shared/inboundAutoTypes.ts";
import {
  buildDailyDigest,
  DIGEST_OPEN_DAYS,
  localDate,
  localDayBounds,
  previousDate,
  type DigestConversation,
  type DigestInput,
  type DigestTodo,
} from "./digest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const EMAIL_TYPE = "bureau_daily_digest";
const FAILED_STATUSES = ["failed", "bounced", "blocked", "dlq"];

type Row = Record<string, unknown>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({})) as { force?: boolean; origin?: string };
    const origin = body.origin || req.headers.get("origin") || undefined;
    const now = new Date();
    const today = localDate(now);
    const yesterday = previousDate(today);
    const y = localDayBounds(yesterday);
    const openCutoff = new Date(now.getTime() - DIGEST_OPEN_DAYS * 86_400_000).toISOString();
    const idempotencyKey = `bureau-daily-digest-${today}`;

    if (!body.force) {
      const { data: already } = await supabase
        .from("email_log")
        .select("id")
        .eq("email_type", EMAIL_TYPE)
        .eq("status", "sent")
        .eq("idempotency_key", idempotencyKey)
        .limit(1);
      if (Array.isArray(already) && already.length > 0) {
        return json({ ok: true, skipped: "al verstuurd vandaag", today });
      }
    }

    // Dossiers voor labels en om gearchiveerde of geannuleerde buiten te laten.
    const { data: requests } = await supabase
      .from("program_requests")
      .select("id, reference_number, customer_name, customer_company, status, archived_at, quote_status, quote_valid_until")
      .is("archived_at", null)
      .not("status", "in", "(cancelled,deleted)");
    const reqById = new Map<string, Row>(((requests ?? []) as Row[]).map((r) => [String(r.id), r]));
    const label = (id: unknown): string | null => {
      const r = id ? reqById.get(String(id)) : undefined;
      if (!r) return null;
      const customer = String(r.customer_company || r.customer_name || "");
      return [r.reference_number, customer].filter(Boolean).join(" · ") || null;
    };
    const toTodo = (t: Row): DigestTodo => ({
      id: String(t.id),
      title: String(t.title ?? ""),
      auto_type: (t.auto_type as string | null) ?? null,
      priority: (t.priority as string | null) ?? null,
      created_at: String(t.created_at),
      due_date: (t.due_date as string | null) ?? null,
      related_request_id: (t.related_request_id as string | null) ?? null,
      project_label: label(t.related_request_id),
    });
    const keep = (t: Row) => !t.related_request_id || reqById.has(String(t.related_request_id));

    // 1. Gisteren binnengekomen (ongeacht of de taak intussen gezien is).
    const { data: inboundRows } = await supabase
      .from("admin_todos")
      .select("id, title, auto_type, priority, created_at, due_date, related_request_id")
      .in("auto_type", [...INBOUND_AUTO_TYPES])
      .gte("created_at", y.start)
      .lt("created_at", y.end)
      .order("created_at", { ascending: false })
      .limit(100);

    // 2. Verloopt vandaag: open taken met deadline vandaag, offertes die vandaag aflopen.
    const { data: dueRows } = await supabase
      .from("admin_todos")
      .select("id, title, auto_type, priority, created_at, due_date, related_request_id")
      .in("status", ["todo", "in_progress"])
      .eq("due_date", today)
      .limit(100);
    const expiringToday = ((requests ?? []) as Row[])
      .filter((r) => r.quote_status === "offerte_verstuurd" && String(r.quote_valid_until ?? "").slice(0, 10) === today)
      .map((r) => ({
        reference_number: (r.reference_number as string | null) ?? null,
        customer_label: String(r.customer_company || r.customer_name || ""),
        request_id: String(r.id),
        valid_until: String(r.quote_valid_until),
      }));

    // 3. Langer dan drie dagen open: taken (niet gesnoozed) en gesprekken.
    const { data: openRows } = await supabase
      .from("admin_todos")
      .select("id, title, auto_type, priority, created_at, due_date, related_request_id, snoozed_until")
      .in("status", ["todo", "in_progress"])
      .lt("created_at", openCutoff)
      .or(`snoozed_until.is.null,snoozed_until.lte.${today}`)
      .order("created_at", { ascending: true })
      .limit(200);

    const conversations: DigestConversation[] = [];
    const { data: mailRows } = await supabase
      .from("project_communications")
      .select("request_id, contact_name, contact_email, communication_date")
      .eq("direction", "inbound")
      .in("communication_type", ["email", "email_in", "email_out"])
      .is("answered_at", null)
      .is("archived_at", null)
      .lt("communication_date", openCutoff)
      .order("communication_date", { ascending: true })
      .limit(100);
    const seenMail = new Set<string>();
    for (const m of (mailRows ?? []) as Row[]) {
      if (m.request_id && !reqById.has(String(m.request_id))) continue;
      const key = String(m.request_id ?? m.contact_email ?? "");
      if (seenMail.has(key)) continue;
      seenMail.add(key);
      conversations.push({
        from: String(m.contact_name || m.contact_email || "onbekend"),
        channel: "e-mail",
        since: String(m.communication_date),
        related_request_id: (m.request_id as string | null) ?? null,
        project_label: label(m.request_id),
      });
    }
    const { data: chatRows } = await supabase
      .from("chat_messages")
      .select("conversation_id, sender_name, created_at, chat_conversations!inner(request_id, status, archived_at, visitor_name)")
      .neq("sender_type", "admin")
      .is("read_at", null)
      .lt("created_at", openCutoff)
      .is("chat_conversations.archived_at", null)
      .neq("chat_conversations.status", "closed")
      .order("created_at", { ascending: true })
      .limit(100);
    const seenChat = new Set<string>();
    for (const c of (chatRows ?? []) as Row[]) {
      const conv = (c.chat_conversations ?? {}) as Row;
      if (conv.request_id && !reqById.has(String(conv.request_id))) continue;
      const key = String(c.conversation_id);
      if (seenChat.has(key)) continue;
      seenChat.add(key);
      conversations.push({
        from: String(c.sender_name || conv.visitor_name || "bezoeker"),
        channel: "chat",
        since: String(c.created_at),
        related_request_id: (conv.request_id as string | null) ?? null,
        project_label: label(conv.request_id),
      });
    }

    // 4. Gisteren verstuurd en mislukt.
    const { count: sentYesterday } = await supabase
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", y.start)
      .lt("created_at", y.end);
    const { data: failedRows } = await supabase
      .from("email_log")
      .select("email_type, recipient_email, status")
      .gte("created_at", y.start)
      .lt("created_at", y.end)
      .in("status", FAILED_STATUSES)
      .limit(100);

    const input: DigestInput = {
      today,
      yesterday,
      inboundYesterday: ((inboundRows ?? []) as Row[]).filter(keep).map(toTodo),
      dueToday: ((dueRows ?? []) as Row[]).filter(keep).map(toTodo),
      expiringToday,
      openLongerThan: ((openRows ?? []) as Row[]).filter(keep).map(toTodo),
      conversationsLongerThan: conversations,
      failedYesterday: ((failedRows ?? []) as Row[]).map((f) => ({
        email_type: String(f.email_type ?? ""),
        recipient_email: String(f.recipient_email ?? ""),
        status: String(f.status ?? ""),
      })),
      sentYesterday: sentYesterday ?? 0,
    };

    const baseUrl = getPortalBaseUrl(origin);
    const digest = buildDailyDigest(input, baseUrl);
    const address = await resolveBureauAddress(supabase);
    const recipient = getRecipientEmail(address, origin);
    const subject = `${getSubjectPrefix(origin)}${digest.subject}`;
    const html = await wrapEmailHtml(digest.html, supabase);

    const sent = await sendMailjet({
      source: "send-bureau-daily-digest",
      checkSuppression: false,
      messages: [{
        From: { Email: GENERAL_CONTACT_EMAIL, Name: "Bureau Vlieland" },
        To: [{ Email: recipient, Name: "Bureau Vlieland" }],
        Subject: subject,
        HTMLPart: html,
      }],
    });

    await logEmail({
      email_type: EMAIL_TYPE,
      subject,
      recipient_email: recipient,
      recipient_name: "Bureau Vlieland",
      status: sent.ok ? "sent" : "failed",
      error_message: sent.ok ? undefined : sent.error,
      mailjet_message_id: sent.ok ? (sent.messageId ?? undefined) : undefined,
      sent_by: "system:cron",
      html_body: html,
      from_email: GENERAL_CONTACT_EMAIL,
      idempotency_key: idempotencyKey,
      metadata: {
        template_name: EMAIL_TYPE,
        actor: "system → bureau (dagoverzicht)",
        idempotency_key: idempotencyKey,
        summary: digest.summaryLine,
        empty: digest.isEmpty,
        ...(sent.ok ? {} : { failure: true }),
      },
    });

    return json({ ok: sent.ok, today, summary: digest.summaryLine, empty: digest.isEmpty, error: sent.ok ? undefined : sent.error });
  } catch (error) {
    console.error("send-bureau-daily-digest mislukt:", error);
    return json({ ok: false, error: String(error) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
