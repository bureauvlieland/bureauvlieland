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
      const reason =
        verdict === "misconfigured"
          ? `Mailjet stuurde ${rejectedAttempts} keer een melding die geweigerd werd (verkeerd of ontbrekend token in de webhook-URL).`
          : `Er zijn ${sentCount} mails verstuurd in de laatste ${WINDOW_HOURS} uur, maar geen enkele terugkoppeling van Mailjet ontvangen (de webhook-URL staat vermoedelijk niet ingesteld).`;

      const autoEntityId = `email-webhook-${new Date().toISOString().slice(0, 10)}`;
      const { data: existingTodo } = await admin
        .from("admin_todos")
        .select("id")
        .eq("auto_type", "email_webhook_silent")
        .eq("auto_entity_id", autoEntityId)
        .neq("status", "done")
        .maybeSingle();

      if (!existingTodo) {
        await admin.from("admin_todos").insert({
          title: "E-mail: geen terugkoppeling van Mailjet",
          description:
            `${reason}\n\nGevolg: geen aflever-, bounce-, spam- of afmeldinformatie en de suppressielijst wordt niet bijgewerkt.\n` +
            "Fix: kopieer de webhook-URL uit /admin/email-health en zet die in Mailjet bij alle event-types.",
          priority: "high",
          status: "todo",
          auto_type: "email_webhook_silent",
          auto_entity_id: autoEntityId,
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
        "hallo@bureauvlieland.nl";

      const html = `<p><strong>De e-mail-feedback van Mailjet ligt stil.</strong></p>
        <p>${reason}</p>
        <p>Zonder deze events weten we niet of mail wordt afgeleverd en worden onbereikbare adressen niet geblokkeerd.</p>
        <p>Herstellen: open <a href="https://bureauvlieland.nl/admin/email-health">Email health</a>, kopieer de webhook-URL en zet die in Mailjet bij alle event-types (sent, open, click, bounce, blocked, spam, unsub).</p>`;

      const send = await sendMailjet({
        source: "email-webhook-heartbeat",
        checkSuppression: false,
        messages: [{
          From: {
            Email: Deno.env.get("MAILJET_FROM_EMAIL") ?? "noreply@bureauvlieland.nl",
            Name: "Bureau Vlieland Monitor",
          },
          To: [{ Email: to }],
          Subject: "[ALERT] Geen e-mail-terugkoppeling van Mailjet",
          HTMLPart: html,
          TextPart: html.replace(/<[^>]+>/g, " "),
        }],
      });
      alerted = send.ok;
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
