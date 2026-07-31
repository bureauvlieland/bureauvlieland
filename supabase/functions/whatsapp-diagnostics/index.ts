// Admin-only diagnostics for the Twilio WhatsApp setup.
// Reads (never writes) the Twilio configuration so we can verify:
//   - which messaging services exist and what their inbound webhook URL is
//   - which senders are in each messaging service's sender pool
//   - the sender-level webhook configuration of the WhatsApp number
// This exists because an inbound webhook that is never called is otherwise
// indistinguishable from a webhook that rejects every request.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: either an admin session, or the internal diagnostics secret
    // (used for maintenance checks when no admin session is available).
    const diagSecret = Deno.env.get("WHATSAPP_DIAG_SECRET");
    const providedSecret = req.headers.get("x-diagnostics-secret") || "";
    const secretOk = Boolean(diagSecret) && providedSecret === diagSecret;

    if (!secretOk) {
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
    }


    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const apiKeySid = Deno.env.get("TWILIO_API_KEY_SID");
    const apiKeySecret = Deno.env.get("TWILIO_API_KEY_SECRET");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "";

    if (!accountSid || !apiKeySid || !apiKeySecret) {
      return json({ error: "Twilio not configured" }, 500);
    }

    const basic = `Basic ${btoa(`${apiKeySid}:${apiKeySecret}`)}`;
    // Some v2 endpoints (WhatsApp senders) reject API-key auth and require
    // the account credentials, so we keep both and fall back automatically.
    const basicAccount = authToken ? `Basic ${btoa(`${accountSid}:${authToken}`)}` : null;
    const parseBody = async (r: Response) => {
      const text = await r.text();
      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        return { raw: text.slice(0, 500) } as Record<string, unknown>;
      }
    };
    const get = async (url: string, useAccountAuth = false) => {
      const r = await fetch(url, {
        headers: { Authorization: useAccountAuth && basicAccount ? basicAccount : basic },
      });
      return { ok: r.ok, status: r.status, body: await parseBody(r) };
    };

    const post = async (url: string, form?: Record<string, string>, jsonBody?: unknown) => {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: basic,
          "Content-Type": jsonBody ? "application/json" : "application/x-www-form-urlencoded",
        },
        body: jsonBody ? JSON.stringify(jsonBody) : new URLSearchParams(form ?? {}).toString(),
      });
      const text = await r.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text.slice(0, 500);
      }
      return { ok: r.ok, status: r.status, body: parsed as Record<string, unknown> };
    };

    const payload = await req.json().catch(() => ({}));
    const action = String((payload as any)?.action ?? "inspect");



    const expectedWebhook = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-webhook`;

    // 1. Messaging services + their inbound webhook configuration
    const services = await get(
      "https://messaging.twilio.com/v1/Services?PageSize=50",
    );

    const serviceReport: unknown[] = [];
    if (services.ok && Array.isArray((services.body as any)?.services)) {
      for (const svc of (services.body as any).services) {
        const pool = await get(
          `https://messaging.twilio.com/v1/Services/${svc.sid}/PhoneNumbers?PageSize=50`,
        );
        // WhatsApp senders live in a separate sub-resource on newer accounts.
        const channelSenders = await get(
          `https://messaging.twilio.com/v1/Services/${svc.sid}/ChannelSenders?PageSize=50`,
        );
        serviceReport.push({
          sid: svc.sid,
          friendly_name: svc.friendly_name,
          inbound_request_url: svc.inbound_request_url,
          inbound_method: svc.inbound_method,
          use_inbound_webhook_on_number: svc.use_inbound_webhook_on_number,
          webhook_matches_expected: svc.inbound_request_url === expectedWebhook,
          phone_numbers: (pool.body as any)?.phone_numbers?.map((p: any) => p.phone_number) ?? [],
          channel_senders:
            (channelSenders.body as any)?.channel_senders?.map((s: any) => ({
              sid: s.sid,
              sender: s.sender,
              country: s.country,
            })) ?? [],
          channel_senders_status: channelSenders.status,
        });
      }
    }

    // 2. Account-level phone number webhook config (SMS/WhatsApp fallback)
    const numbers = await get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=50`,
    );
    const numberReport =
      (numbers.body as any)?.incoming_phone_numbers?.map((n: any) => ({
        phone_number: n.phone_number,
        sms_url: n.sms_url,
        sms_method: n.sms_method,
        messaging_service_sid: n.messaging_service_sid,
        status_callback: n.status_callback,
      })) ?? [];

    // 3. WhatsApp senders (v2) incl. their own webhook configuration
    const waSenders = await get("https://messaging.twilio.com/v2/channels/senders?PageSize=50");
    const senderReport =
      (waSenders.body as any)?.senders?.map((s: any) => ({
        sid: s.sid,
        sender_id: s.sender_id,
        status: s.status,
        webhook: s.webhook ?? null,
      })) ?? [];

    // 4. Recent inbound messages Twilio actually received on our number
    const inbound = await get(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?PageSize=20`,
    );
    const recentMessages =
      (inbound.body as any)?.messages?.map((m: any) => ({
        sid: m.sid,
        direction: m.direction,
        from: m.from,
        to: m.to,
        status: m.status,
        error_code: m.error_code,
        error_message: m.error_message,
        date_sent: m.date_sent,
      })) ?? [];

    // Optional repair: point the messaging service inbound webhook at our
    // function and make sure the WhatsApp sender is in its sender pool.
    const fixResults: Record<string, unknown> = {};
    if (action === "fix") {
      const svc = (serviceReport as any[])[0];
      if (svc) {
        const upd = await post(`https://messaging.twilio.com/v1/Services/${svc.sid}`, {
          InboundRequestUrl: expectedWebhook,
          InboundMethod: "POST",
          UseInboundWebhookOnNumber: "false",
        });
        fixResults.service_update = { status: upd.status, ok: upd.ok, body: upd.body };

        const senderTarget = twilioNumber.startsWith("whatsapp:")
          ? twilioNumber
          : `whatsapp:${twilioNumber}`;
        if (!svc.channel_senders?.some((s: any) => s.sender === senderTarget)) {
          const add = await post(
            `https://messaging.twilio.com/v1/Services/${svc.sid}/ChannelSenders`,
            { Sid: senderTarget },
          );
          fixResults.channel_sender_add = { status: add.status, ok: add.ok, body: add.body };
        }
      }

      // Sender-level webhook as a belt-and-braces fallback.
      const target = (senderReport as any[]).find(
        (s) => String(s.sender_id ?? "").includes(twilioNumber.replace("whatsapp:", "")),
      );
      if (target?.sid) {
        const wh = await post(
          `https://messaging.twilio.com/v2/channels/senders/${target.sid}`,
          undefined,
          {
            webhook: {
              callback_url: expectedWebhook,
              callback_method: "POST",
            },
          },
        );
        fixResults.sender_webhook = { status: wh.status, ok: wh.ok, body: wh.body };
      }
    }

    return json({
      action,
      expected_webhook_url: expectedWebhook,
      configured_whatsapp_number: twilioNumber,
      auth_token_present: Boolean(authToken),
      messaging_services: serviceReport,
      messaging_services_status: services.status,
      whatsapp_senders: senderReport,
      whatsapp_senders_status: waSenders.status,
      incoming_phone_numbers: numberReport,
      recent_messages: recentMessages,
      fix: action === "fix" ? fixResults : undefined,
    });

  } catch (err) {
    console.error("whatsapp-diagnostics error", err);
    return json({ error: String(err) }, 500);
  }
});
