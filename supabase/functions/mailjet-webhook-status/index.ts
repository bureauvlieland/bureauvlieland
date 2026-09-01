/**
 * Admin-only diagnose van de Mailjet-webhook.
 *
 * Geeft de volledige, kant-en-klare webhook-URL inclusief token (het token
 * staat als secret op de server en mag nooit in de client-bundle staan), de
 * laatst ontvangen events, de laatste geweigerde pogingen, en kan met
 * `action: "selftest"` een synthetisch event door de échte keten sturen.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    missingMessageIdByType: Object.entries(missingByType)
      .map(([email_type, v]) => ({ email_type, ...v }))
      .sort((a, b) => b.count - a.count),
  });
});
