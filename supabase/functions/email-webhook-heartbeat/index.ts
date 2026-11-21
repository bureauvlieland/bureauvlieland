/**
 * Heartbeat op de Mailjet-feedbackketen.
 *
 * Waarom: van 8 juli t/m 1 september 2026 kwam er geen enkel Mailjet-event
 * meer binnen (de webhook-URL in Mailjet miste het verplichte token). Twee
 * maanden lang was dus onbekend of mail werd afgeleverd, en de suppressielijst
 * bleef leeg. Deze functie draait dagelijks: als er in de laatste 24 uur wel
 * mails zijn verstuurd maar geen enkele event is ontvangen, gaat er een mail
 * naar het bureau en komt er een Werkbank-taak.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendMailjet } from "../_shared/mailjet-send.ts";
import { logEmail } from "../_shared/email-logger.ts";
import { GENERAL_CONTACT_EMAIL } from "../_shared/bureau-contact.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export interface HeartbeatInput {
  /** Aantal verstuurde mails in het venster. */
  sentCount: number;
  /** Aantal ontvangen Mailjet-events in het venster. */
  eventCount: number;
  /** Aantal geweigerde (401) webhook-pogingen in het venster. */
  rejectedAttempts: number;
}

export type HeartbeatVerdict = "ok" | "silent" | "misconfigured" | "idle";

/**
 * Beslisregel, los getest.
 * - `idle`: geen mail verstuurd → niets te zeggen over de webhook.
 * - `misconfigured`: Mailjet klopt aan, maar wordt geweigerd (token fout).
 * - `silent`: mail verstuurd, geen events, ook geen kloppen → URL niet ingesteld.
 * - `ok`: events ontvangen.
 */
export function evaluateHeartbeat(input: HeartbeatInput): HeartbeatVerdict {
  if (input.eventCount > 0) return "ok";
  if (input.rejectedAttempts > 0) return "misconfigured";
  if (input.sentCount === 0) return "idle";
  return "silent";
}

const WINDOW_HOURS = 24;
/** Minimum aantal verstuurde mails voordat stilte verdacht is. */
export const MIN_SENT_FOR_ALERT = 3;

/** Eén vaste sleutel: zolang het probleem duurt blijft het één taak (geen stapel per dag). */
export const HEARTBEAT_TODO_ENTITY = "email-webhook";

export interface HeartbeatAlertText {
  /** Technische reden (één zin). */
  reason: string;
  /** Wat het bureau merkt. */
  meaning: string;
  /** Wat te doen, in gewone taal. */
  action: string;
  subject: string;
  todoTitle: string;
  todoDescription: string;
  html: string;
}

/** Teksten van alarmmail en Werkbank-taak, los getest. */
export function buildHeartbeatAlert(input: {
  verdict: HeartbeatVerdict;
  sentCount: number;
  rejectedAttempts: number;
  windowHours?: number;
}): HeartbeatAlertText {
  const window = input.windowHours ?? WINDOW_HOURS;
  const reason = input.verdict === "misconfigured"
    ? `Mailjet stuurde ${input.rejectedAttempts} keer een melding die geweigerd werd (verkeerd of ontbrekend token in de webhook-URL).`
    : `Er zijn ${input.sentCount} mails verstuurd in de laatste ${window} uur, maar geen enkele terugkoppeling van Mailjet ontvangen (de webhook-URL staat vermoedelijk niet ingesteld).`;
  const meaning =
    "Wij zien niet meer of mail wordt afgeleverd, geopend of terugkomt; onbereikbare adressen worden niet geblokkeerd en het Berichtencentrum toont geen afleverstatus.";
  const action =
    "Open Email health, kopieer de webhook-URL en zet die in Mailjet bij alle event-types (sent, open, click, bounce, blocked, spam, unsub). Lukt dat niet, geef het door aan de ontwikkelaar.";
  const html = `<p><strong>Wat betekent dit:</strong> ${meaning}</p>
        <p><strong>Wat te doen:</strong> ${action}</p>
        <p><a href="https://bureauvlieland.nl/admin/email-health">Open Email health</a></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
        <p style="color:#666;font-size:13px;"><strong>Technische details</strong><br>${reason}</p>`;
  return {
    reason,
    meaning,
    action,
    subject: "[ALERT] Geen e-mail-terugkoppeling van Mailjet",
    todoTitle: "E-mail: geen terugkoppeling van Mailjet",
    todoDescription: `Wat betekent dit: ${meaning}\nWat te doen: ${action}\nTechnisch: ${reason}`,
    html,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - WINDOW_HOURS * 3_600_000).toISOString();

  try {
    const { count: sentCount } = await admin
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .in("status", ["sent", "delivered", "opened", "clicked"]);

    const { count: deliveredEvents } = await admin
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .not("delivered_at", "is", null);

    const { count: engagementEvents } = await admin
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .or("opened_at.not.is.null,clicked_at.not.is.null,bounced_at.not.is.null");

    const { count: rejectedAttempts } = await admin
      .from("email_webhook_attempts")
      .select("id", { count: "exact", head: true })
      .gte("received_at", since)
      .eq("authorized", false);

    const { count: acceptedAttempts } = await admin
      .from("email_webhook_attempts")
      .select("id", { count: "exact", head: true })
      .gte("received_at", since)
      .eq("authorized", true);

    const eventCount =
      (deliveredEvents ?? 0) + (engagementEvents ?? 0) + (acceptedAttempts ?? 0);

    const verdict = evaluateHeartbeat({
      sentCount: sentCount ?? 0,
      eventCount,
      rejectedAttempts: rejectedAttempts ?? 0,
    });

    const shouldAlert =
      (verdict === "silent" && (sentCount ?? 0) >= MIN_SENT_FOR_ALERT) ||
      verdict === "misconfigured";

    let alerted = false;

    if (shouldAlert) {
      const text = buildHeartbeatAlert({
        verdict,
        sentCount: sentCount ?? 0,
        rejectedAttempts: rejectedAttempts ?? 0,
      });

      const { data: existingTodo } = await admin
        .from("admin_todos")
        .select("id")
        .eq("auto_type", "email_webhook_silent")
        .eq("auto_entity_id", HEARTBEAT_TODO_ENTITY)
        .neq("status", "done")
        .maybeSingle();

      if (!existingTodo) {
        await admin.from("admin_todos").insert({
          title: text.todoTitle,
          description: text.todoDescription,
          priority: "high",
          status: "todo",
          auto_type: "email_webhook_silent",
          auto_entity_id: HEARTBEAT_TODO_ENTITY,
        });
      }

      const { data: setting } = await admin
        .from("app_settings")
        .select("value")
        .eq("id", "bureau_admin_email")
        .maybeSingle();
      const rawTo = setting?.value;
      const to =
        (typeof rawTo === "string" ? rawTo : rawTo ? String(rawTo) : "") ||
        Deno.env.get("ADMIN_ALERT_EMAIL") ||
        GENERAL_CONTACT_EMAIL;

      const html = text.html;
      const subject = text.subject;
      const send = await sendMailjet({
        source: "email-webhook-heartbeat",
        checkSuppression: false,
        messages: [{
          From: {
            Email: Deno.env.get("MAILJET_FROM_EMAIL") ?? "noreply@bureauvlieland.nl",
            Name: "Bureau Vlieland Monitor",
          },
          To: [{ Email: to }],
          Subject: subject,
          HTMLPart: html,
          TextPart: html.replace(/<[^>]+>/g, " "),
        }],
      });
      alerted = send.ok;

      // Alarmmail in email_log, zodat het Berichtencentrum hem ook ziet.
      await logEmail({
        email_type: "email_webhook_heartbeat_alert",
        subject,
        recipient_email: to,
        status: send.ok ? "sent" : "failed",
        error_message: send.ok ? undefined : send.error,
        mailjet_message_id: send.ok ? send.messageId ?? undefined : undefined,
        sent_by: "email-webhook-heartbeat",
        html_body: html,
        metadata: {
          template_name: "email_webhook_heartbeat_alert",
          actor: "system → bureau (webhook-heartbeat)",
          verdict,
          sent_count: sentCount ?? 0,
          rejected_attempts: rejectedAttempts ?? 0,
        },
      });
    }

    return json({
      ok: true,
      verdict,
      windowHours: WINDOW_HOURS,
      sentCount: sentCount ?? 0,
      eventCount,
      rejectedAttempts: rejectedAttempts ?? 0,
      alerted,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-webhook-heartbeat] failed:", msg);
    return json({ ok: false, error: msg }, 500);
  }
});
