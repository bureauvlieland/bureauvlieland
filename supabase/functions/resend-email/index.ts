import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");
const DEFAULT_SENDER_EMAIL = Deno.env.get("MAILJET_SENDER_EMAIL") || "info@bureauvlieland.nl";
const DEFAULT_SENDER_NAME = Deno.env.get("MAILJET_SENDER_NAME") || "Bureau Vlieland";

interface Body {
  email_log_id?: string;
  override_recipient_email?: string;
  override_recipient_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Niet geauthenticeerd" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user + admin
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Niet geauthenticeerd" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdminRow } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdminRow) {
      return json({ error: "Alleen admins mogen berichten opnieuw versturen" }, 403);
    }

    const body: Body = await req.json().catch(() => ({}));
    if (!body.email_log_id) {
      return json({ error: "email_log_id is verplicht" }, 400);
    }

    const { data: log, error: logErr } = await admin
      .from("email_log")
      .select("*")
      .eq("id", body.email_log_id)
      .maybeSingle();

    if (logErr || !log) {
      return json({ error: "E-mail niet gevonden" }, 404);
    }

    if (!log.html_body && !log.text_body) {
      return json(
        {
          error:
            "De inhoud van dit bericht is niet bewaard (verstuurd vóór de opslag-update). Gebruik 'Beantwoorden' om een nieuw bericht op te stellen.",
        },
        409,
      );
    }

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      return json({ error: "Mailjet is niet geconfigureerd" }, 500);
    }

    const recipientEmail = (body.override_recipient_email || log.recipient_email || "").trim();
    if (!recipientEmail) {
      return json({ error: "Geen ontvanger" }, 400);
    }
    const recipientName = body.override_recipient_name || log.recipient_name || "";

    const fromEmail = log.from_email || DEFAULT_SENDER_EMAIL;
    const fromName = DEFAULT_SENDER_NAME;

    const mjPayload: Record<string, unknown> = {
      TrackClicks: "disabled",
      TrackOpens: "disabled",
      From: { Email: fromEmail, Name: fromName },
      To: [{ Email: recipientEmail, Name: recipientName }],
      Subject: log.subject,
    };
    if (log.html_body) mjPayload.HTMLPart = log.html_body;
    if (log.text_body) mjPayload.TextPart = log.text_body;
    if (log.reply_to) mjPayload.ReplyTo = { Email: log.reply_to };

    const mjRes = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`),
      },
      body: JSON.stringify({ Messages: [mjPayload] }),
    });

    const mjData = await mjRes.json();
    const messageId = mjData?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null;
    const status: "sent" | "failed" = mjRes.ok ? "sent" : "failed";
    const errorMessage = mjRes.ok ? undefined : JSON.stringify(mjData).slice(0, 1000);

    const originalMeta = (log.metadata as Record<string, unknown>) || {};
    const originalTemplate = typeof originalMeta.template_name === "string" ? originalMeta.template_name : log.email_type;

    // Log new send
    const { data: newLog } = await admin
      .from("email_log")
      .insert({
        email_type: log.email_type,
        subject: log.subject,
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        related_request_id: log.related_request_id,
        related_accommodation_id: log.related_accommodation_id,
        related_partner_id: log.related_partner_id,
        related_item_id: log.related_item_id,
        status,
        error_message: errorMessage || null,
        mailjet_message_id: messageId,
        sent_by: userData.user.email || "admin",
        html_body: log.html_body,
        text_body: log.text_body,
        from_email: fromEmail,
        reply_to: log.reply_to,
        metadata: {
          ...originalMeta,
          template_name: `${originalTemplate}_resend`,
          actor: `admin → resend (${userData.user.email || userData.user.id})`,
          resend_of: log.id,
        },
        sent_at: status === "sent" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (!mjRes.ok) {
      return json({ error: `Verzenden mislukt: ${errorMessage}` }, 502);
    }

    return json({ ok: true, new_email_log_id: newLog?.id });
  } catch (err) {
    console.error("resend-email error:", err);
    return json({ error: (err as Error).message || "Onbekende fout" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
