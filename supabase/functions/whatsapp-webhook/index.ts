// Public Twilio webhook for incoming WhatsApp messages.
// Validates X-Twilio-Signature, finds or creates the whatsapp_contact,
// auto-links to partner / open program_request by phone number,
// reuses or opens a chat_conversations row (source='whatsapp'),
// and stores the message as chat_messages (sender_type='customer').
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-twilio-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const twiml = (body = "") =>
  new Response(`<Response>${body}</Response>`, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });

// Twilio signs the *exact* full URL (incl. query) + sorted form params.
function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const sorted = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join("");
  const data = url + sorted;
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  return expected === signature;
}

function normalizePhone(raw: string): string {
  // Strip whatsapp: prefix and non-digit chars except leading +
  const stripped = raw.replace(/^whatsapp:/i, "").trim();
  return stripped.startsWith("+") ? stripped : `+${stripped.replace(/\D/g, "")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return twiml();

  try {
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const signature = req.headers.get("x-twilio-signature") || "";

    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    // Signature validation (skip if no token configured — keeps preview usable)
    if (authToken) {
      // Reconstruct the URL Twilio used. Respect proxy forwarding.
      const proto = req.headers.get("x-forwarded-proto") || "https";
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
      const url = `${proto}://${host}${new URL(req.url).pathname}`;
      const ok = verifyTwilioSignature(authToken, url, params, signature);
      if (!ok) {
        console.warn("whatsapp-webhook: invalid Twilio signature", { url });
        return new Response("Invalid signature", { status: 403, headers: corsHeaders });
      }
    } else {
      console.warn("whatsapp-webhook: TWILIO_AUTH_TOKEN not set — skipping signature check");
    }

    const from = params.From || "";
    const body = (params.Body || "").trim();
    const profileName = params.ProfileName || "";
    const numMedia = parseInt(params.NumMedia || "0", 10);
    const messageSid = params.MessageSid || params.SmsMessageSid || null;

    if (!from) return twiml();

    const phoneNumber = normalizePhone(from);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Idempotency: skip if we already stored this message sid
    if (messageSid) {
      const { data: dup } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("twilio_message_sid", messageSid)
        .maybeSingle();
      if (dup) return twiml();
    }

    // 1. find or create whatsapp_contact
    let { data: contact } = await supabase
      .from("whatsapp_contacts")
      .select("*")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    // Auto-match partner by phone
    const { data: partnerMatch } = await supabase
      .from("partners")
      .select("id")
      .eq("phone", phoneNumber)
      .maybeSingle();

    // Auto-match most recent non-final program_request by customer_phone
    const { data: requestMatch } = await supabase
      .from("program_requests")
      .select("id")
      .eq("customer_phone", phoneNumber)
      .not("status", "in", '("cancelled","completed")')
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!contact) {
      const { data: newContact, error: insErr } = await supabase
        .from("whatsapp_contacts")
        .insert({
          phone_number: phoneNumber,
          whatsapp_name: profileName || null,
          partner_id: partnerMatch?.id ?? null,
          request_id: requestMatch?.id ?? null,
        })
        .select()
        .single();
      if (insErr) {
        console.error("whatsapp-webhook: insert contact failed", insErr);
        return twiml();
      }
      contact = newContact;
    } else {
      const patch: Record<string, unknown> = {};
      if (profileName && contact.whatsapp_name !== profileName) patch.whatsapp_name = profileName;
      if (!contact.partner_id && partnerMatch?.id) patch.partner_id = partnerMatch.id;
      if (!contact.request_id && requestMatch?.id) patch.request_id = requestMatch.id;
      if (Object.keys(patch).length) {
        await supabase.from("whatsapp_contacts").update(patch).eq("id", contact.id);
        Object.assign(contact, patch);
      }
    }

    // 2. find existing open WhatsApp conversation for this contact
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("source", "whatsapp")
      .eq("whatsapp_contact_id", contact.id)
      .neq("status", "closed")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId: string;
    if (existing) {
      conversationId = existing.id;
      await supabase
        .from("chat_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          status: "active",
          // backfill links if newly known
          source_partner_id: existing.source_partner_id ?? contact.partner_id ?? null,
          request_id: existing.request_id ?? contact.request_id ?? null,
        })
        .eq("id", conversationId);
    } else {
      const { data: created, error: convErr } = await supabase
        .from("chat_conversations")
        .insert({
          source: "whatsapp",
          whatsapp_contact_id: contact.id,
          phone_number: phoneNumber,
          source_partner_id: contact.partner_id ?? null,
          request_id: contact.request_id ?? null,
          visitor_name: (profileName || phoneNumber).slice(0, 200),
          visitor_email: "",
          status: "active",
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (convErr || !created) {
        console.error("whatsapp-webhook: insert conversation failed", convErr);
        return twiml();
      }
      conversationId = created.id;
    }

    // 3. store the message
    let content = body || "";
    if (numMedia > 0) {
      content += (content ? "\n\n" : "") + `[${numMedia} media-bijlage(n) — niet opgeslagen]`;
    }

    const { error: msgErr } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "customer",
      sender_name: (profileName || phoneNumber).slice(0, 200),
      content: content || "(leeg bericht)",
      twilio_message_sid: messageSid,
    });
    if (msgErr) console.error("whatsapp-webhook: insert message failed", msgErr);

    return twiml();
  } catch (err) {
    console.error("whatsapp-webhook: unexpected error", err);
    return twiml();
  }
});
