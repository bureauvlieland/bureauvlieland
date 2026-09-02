/**
 * Admin-only diagnose van de Mailjet-webhook.
 *
 * Geeft de volledige, kant-en-klare webhook-URL inclusief token (het token
 * staat als secret op de server en mag nooit in de client-bundle staan), de
 * laatst ontvangen events, de laatste geweigerde pogingen, de matchratio van
 * binnengekomen events, en kan met `action: "selftest"` een synthetisch event
 * door de échte keten sturen of met `action: "probe"` een échte proefmail
 * versturen om de volledige keten (verzenden → afgeleverd → geopend) aantoonbaar
 * te volgen.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // ── admin-check ───────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Niet geautoriseerd" }, 401);

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Niet geautoriseerd" }, 401);

  const { data: roleData } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleData) return json({ error: "Geen admin rechten" }, 403);

  const body = req.method === "POST"
    ? ((await req.json().catch(() => ({}))) as Record<string, unknown>)
    : {};
  const action = typeof body.action === "string" ? body.action : "status";

  const token = Deno.env.get("MAILJET_WEBHOOK_TOKEN") ?? null;
  const webhookUrl = token
    ? `${supabaseUrl}/functions/v1/mailjet-event-webhook?token=${encodeURIComponent(token)}`
    : null;

  if (action === "selftest") {
    if (!webhookUrl) {
      return json({ ok: false, error: "MAILJET_WEBHOOK_TOKEN ontbreekt op de server." });
    }
    // Synthetisch event met een MessageID die zeker niet bestaat: de webhook
    // moet 200 teruggeven met unmatched=1. Zo testen we de hele keten
    // (bereikbaarheid + token) zonder een echte logregel te muteren.
    const probeId = `selftest-${Date.now()}`;
    const started = Date.now();
    let status = 0;
    let responseBody = "";
    try {
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ event: "open", MessageID: probeId, email: "selftest@bureauvlieland.nl" }]),
      });
      status = resp.status;
      responseBody = (await resp.text()).slice(0, 500);
    } catch (err) {
      return json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
      });
    }

    return json({
      ok: status === 200,
      status,
      response: responseBody,
      durationMs: Date.now() - started,
      hint: status === 401
        ? "Token wordt geweigerd — controleer MAILJET_WEBHOOK_TOKEN."
        : status === 200
        ? "Webhook is bereikbaar en accepteert het token. Zet deze URL in Mailjet."
        : "Onverwachte status; bekijk de functielogs.",
    });
  }

  // ── probe: échte proefmail door de hele keten ─────────────────────────────
  // Verstuurt een echte mail naar het bureau-adres, logt die zoals elke andere
  // verzending, en geeft de exacte MessageID terug. Daarmee is verifieerbaar of
  // Mailjet voor ÓNZE verzendingen events terugstuurt (afgeleverd/geopend) —
  // los van de vraag of er ander verkeer op het account binnenkomt.
  if (action === "probe") {
    const recipient =
      typeof body.recipient === "string" && body.recipient.includes("@")
        ? body.recipient
        : GENERAL_CONTACT_EMAIL;
    const stamp = new Date().toISOString();
    const subject = `Proefverzending e-mailketen — ${stamp}`;
    const html = `<p>Dit is een proefverzending om de terugkoppeling van de mailprovider te controleren.</p>
      <p>Open deze mail; daarna hoort in <strong>Admin → E-mail gezondheid</strong> binnen enkele minuten
      "afgeleverd" en "geopend" te verschijnen bij deze verzending (${stamp}).</p>`;

    const result = await sendMailjet({
      source: "mailjet-webhook-status:probe",
      messages: [
        {
          From: { Email: GENERAL_CONTACT_EMAIL, Name: "Bureau Vlieland" },
          To: [{ Email: recipient }],
          Subject: subject,
          HTMLPart: html,
          TextPart: "Proefverzending e-mailketen.",
          TrackOpens: "enabled",
        },
      ],
    });

    await logEmail({
      email_type: "email_chain_probe",
      subject,
      recipient_email: recipient,
      status: result.ok && !result.skipped ? "sent" : result.ok ? "sent" : "failed",
      error_message: result.error,
      mailjet_message_id: result.messageId ?? undefined,
      sent_by: user.email ?? "admin",
      html_body: html,
      metadata: {
        template_name: "email_chain_probe",
        actor: "admin → bureau",
        probe: true,
        skipped: result.skipped ?? null,
      },
    });

    return json({
      ok: result.ok,
      messageId: result.messageId,
      recipient,
      skipped: result.skipped ?? null,
      error: result.error ?? null,
      hint: result.ok
        ? "Proefmail verstuurd. Open hem en verwacht binnen enkele minuten 'afgeleverd' en 'geopend'."
        : "Verzenden mislukte — zie foutmelding.",
    });
  }



  // ── status ────────────────────────────────────────────────────────────────
  const pick = async (column: string) => {
    const { data } = await admin
      .from("email_log")
      .select(`${column}`)
      .not(column, "is", null)
      .order(column, { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as Record<string, string> | null)?.[column] ?? null;
  };

  const [lastDelivered, lastOpened, lastClicked, lastBounced] = await Promise.all([
    pick("delivered_at"),
    pick("opened_at"),
    pick("clicked_at"),
    pick("bounced_at"),
  ]);

  const { data: lastSentRow } = await admin
    .from("email_log")
    .select("sent_at")
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: attempts } = await admin
    .from("email_webhook_attempts")
    .select("received_at, authorized, reason, event_count, source_ip")
    .order("received_at", { ascending: false })
    .limit(20);

  const { count: suppressionCount } = await admin
    .from("email_suppressions")
    .select("id", { count: "exact", head: true });

  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const { data: missingRows } = await admin
    .from("email_log")
    .select("email_type, created_at")
    .is("mailjet_message_id", null)
    .eq("status", "sent")
    .gte("created_at", since)
    .limit(1000);

  const missingByType: Record<string, { count: number; last: string }> = {};
  for (const row of missingRows ?? []) {
    const key = (row as { email_type: string }).email_type;
    const created = (row as { created_at: string }).created_at;
    const cur = missingByType[key];
    if (!cur) missingByType[key] = { count: 1, last: created };
    else {
      cur.count += 1;
      if (created > cur.last) cur.last = created;
    }
  }

  // ── matchratio: komen events binnen én landen ze op onze verzendingen? ────
  // Dit is de stille faalmodus die we niet meer accepteren: 100% van de events
  // binnen, 0% gekoppeld — dan is de rapportage per definitie leeg.
  const eventsSince = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data: recentEvents } = await admin
    .from("email_webhook_events")
    .select("event_type, matched, match_reason, recipient_email, received_at")
    .gte("received_at", eventsSince)
    .order("received_at", { ascending: false })
    .limit(2000);

  const evRows = (recentEvents ?? []) as Array<{
    event_type: string;
    matched: boolean;
    match_reason: string;
    recipient_email: string | null;
    received_at: string;
  }>;
  const eventsTotal24h = evRows.length;
  const eventsMatched24h = evRows.filter((r) => r.matched).length;
  const unmatchedRecipients: Record<string, number> = {};
  for (const r of evRows) {
    if (r.matched) continue;
    const key = r.recipient_email ?? "(onbekend)";
    unmatchedRecipients[key] = (unmatchedRecipients[key] ?? 0) + 1;
  }

  return json({

    ok: true,
    tokenConfigured: !!token,
    webhookUrl,
    lastSentAt: (lastSentRow as { sent_at: string } | null)?.sent_at ?? null,
    lastDelivered,
    lastOpened,
    lastClicked,
    lastBounced,
    suppressionCount: suppressionCount ?? 0,
    attempts: attempts ?? [],
    eventsTotal24h,
    eventsMatched24h,
    unmatchedTopRecipients: Object.entries(unmatchedRecipients)
      .map(([recipient_email, count]) => ({ recipient_email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    recentEvents: evRows.slice(0, 20),

    missingMessageIdByType: Object.entries(missingByType)
      .map(([email_type, v]) => ({ email_type, ...v }))
      .sort((a, b) => b.count - a.count),
  });
});
