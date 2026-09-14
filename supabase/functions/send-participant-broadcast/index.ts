// Stuur een WhatsApp-update naar alle deelnemers van een programma die zich
// via de gedeelde deelnemerspagina hebben aangemeld (program_participants).
// Admin-only. Verzendt via dezelfde Twilio-koppeling als whatsapp-send, maar
// dan voor meerdere ontvangers tegelijk — met per-ontvanger foutafhandeling
// (met name: het 24-uurs-venster van WhatsApp kan per deelnemer verlopen
// zijn, dat mag de rest van de verzending niet blokkeren).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizePhone(raw: string): string {
  const stripped = raw.replace(/^whatsapp:/i, "").trim();
  if (stripped.startsWith("+")) return stripped;
  const digits = stripped.replace(/\D/g, "");
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+31${digits.slice(1)}`;
  if (digits.startsWith("31")) return `+${digits}`;
  return `+${digits}`;
}

interface SendResult {
  phone_number: string;
  name: string | null;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const payload = await req.json().catch(() => ({}));
    const requestId = payload?.request_id ? String(payload.request_id) : null;
    const content = String(payload?.content ?? "").trim();
    if (!requestId) return json({ error: "request_id required" }, 400);
    if (!content || content.length > 4000) return json({ error: "Invalid content" }, 400);

    const { data: participants, error: pErr } = await admin
      .from("program_participants")
      .select("id, name, phone_number")
      .eq("request_id", requestId)
      .eq("whatsapp_opt_in", true);
    if (pErr) return json({ error: "Failed to load participants" }, 500);
    if (!participants || participants.length === 0) {
      return json({ error: "no_participants", details: "Nog geen deelnemers aangemeld voor WhatsApp-updates." }, 400);
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const apiKeySid = Deno.env.get("TWILIO_API_KEY_SID");
    const apiKeySecret = Deno.env.get("TWILIO_API_KEY_SECRET");
    const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    if (!accountSid || !apiKeySid || !apiKeySecret || !twilioFrom) {
      return json({ error: "Twilio not configured" }, 500);
    }
    const fromHeader = twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const results: SendResult[] = [];

    for (const participant of participants) {
      const phoneNumber = normalizePhone(participant.phone_number);
      const toHeader = `whatsapp:${phoneNumber}`;
      const params = new URLSearchParams();
      params.set("From", fromHeader);
      params.set("To", toHeader);
      params.set("Body", content);

      const twResp = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${apiKeySid}:${apiKeySecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const twData = await twResp.json().catch(() => ({}));

      if (!twResp.ok) {
        const outsideWindow = String(twData?.code ?? "") === "63016";
        results.push({
          phone_number: phoneNumber,
          name: participant.name,
          success: false,
          error: outsideWindow
            ? "Het 24-uursvenster van WhatsApp is verlopen voor deze deelnemer — die moet eerst opnieuw \"Open WhatsApp\" gebruiken op de deelnemerspagina."
            : twData?.message || twData?.code || String(twResp.status),
        });
        continue;
      }

      results.push({ phone_number: phoneNumber, name: participant.name, success: true });
    }

    const sentCount = results.filter((r) => r.success).length;
    return json({ success: true, sent: sentCount, total: results.length, results });
  } catch (err) {
    console.error("send-participant-broadcast error", err);
    return json({ error: "Internal error" }, 500);
  }
});
