// Send an outbound WhatsApp message via Twilio.
// Admin-only. Two modes:
//   1) { conversation_id, content }  -> reply on existing WhatsApp conversation
//   2) { phone_number, content, partner_id?, request_id? }
//      -> start a new conversation (creates whatsapp_contact + chat_conversations row)
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
  return `+${stripped.replace(/\D/g, "")}`;
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

    // verify admin role
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const payload = await req.json().catch(() => ({}));
    const content = String(payload?.content ?? "").trim();
    const conversationIdIn = payload?.conversation_id ? String(payload.conversation_id) : null;
    const phoneIn = payload?.phone_number ? String(payload.phone_number) : null;
    const partnerIdIn = payload?.partner_id ? String(payload.partner_id) : null;
    const requestIdIn = payload?.request_id ? String(payload.request_id) : null;

    if (!content || content.length > 4000) return json({ error: "Invalid content" }, 400);
    if (!conversationIdIn && !phoneIn) {
      return json({ error: "conversation_id or phone_number required" }, 400);
    }

    // Resolve conversation + phone
    let conversationId = conversationIdIn;
    let phoneNumber: string | null = null;
    let contactId: string | null = null;

    if (conversationId) {
      const { data: conv } = await admin
        .from("chat_conversations")
        .select("id, source, phone_number, whatsapp_contact_id, status")
        .eq("id", conversationId)
        .maybeSingle();
      if (!conv || conv.source !== "whatsapp") return json({ error: "Not a WhatsApp conversation" }, 400);
      phoneNumber = conv.phone_number;
      contactId = conv.whatsapp_contact_id;
      if (!phoneNumber && contactId) {
        const { data: c } = await admin
          .from("whatsapp_contacts")
          .select("phone_number")
          .eq("id", contactId)
          .maybeSingle();
        phoneNumber = c?.phone_number ?? null;
      }
    } else if (phoneIn) {
      phoneNumber = normalizePhone(phoneIn);

      // upsert contact
      const { data: existingContact } = await admin
        .from("whatsapp_contacts")
        .select("*")
        .eq("phone_number", phoneNumber)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        const patch: Record<string, unknown> = {};
        if (partnerIdIn && !existingContact.partner_id) patch.partner_id = partnerIdIn;
        if (requestIdIn && !existingContact.request_id) patch.request_id = requestIdIn;
        if (Object.keys(patch).length) {
          await admin.from("whatsapp_contacts").update(patch).eq("id", contactId);
        }
      } else {
        const { data: newContact, error: cErr } = await admin
          .from("whatsapp_contacts")
          .insert({
            phone_number: phoneNumber,
            partner_id: partnerIdIn,
            request_id: requestIdIn,
          })
          .select()
          .single();
        if (cErr || !newContact) return json({ error: "Failed to create contact" }, 500);
        contactId = newContact.id;
      }

      // reuse open conversation or create new
      const { data: openConv } = await admin
        .from("chat_conversations")
        .select("id")
        .eq("source", "whatsapp")
        .eq("whatsapp_contact_id", contactId)
        .neq("status", "closed")
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openConv) {
        conversationId = openConv.id;
        await admin
          .from("chat_conversations")
          .update({
            status: "active",
            source_partner_id: partnerIdIn ?? undefined,
            request_id: requestIdIn ?? undefined,
          })
          .eq("id", conversationId);
      } else {
        const { data: newConv, error: nErr } = await admin
          .from("chat_conversations")
          .insert({
            source: "whatsapp",
            whatsapp_contact_id: contactId,
            phone_number: phoneNumber,
            source_partner_id: partnerIdIn,
            request_id: requestIdIn,
            visitor_name: phoneNumber,
            visitor_email: "",
            status: "active",
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (nErr || !newConv) return json({ error: "Failed to create conversation" }, 500);
        conversationId = newConv.id;
      }
    }

    if (!phoneNumber || !conversationId) return json({ error: "Missing phone or conversation" }, 400);

    // Twilio send via API Key auth (SK..:secret)
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const apiKeySid = Deno.env.get("TWILIO_API_KEY_SID");
    const apiKeySecret = Deno.env.get("TWILIO_API_KEY_SECRET");
    const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    if (!accountSid || !apiKeySid || !apiKeySecret || !twilioFrom) {
      return json({ error: "Twilio not configured" }, 500);
    }

    const fromHeader = twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`;
    const toHeader = phoneNumber.startsWith("whatsapp:") ? phoneNumber : `whatsapp:${phoneNumber}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
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
      console.error("twilio error", twData);
      return json(
        { error: "Twilio send failed", details: twData?.message || twData?.code || twResp.status },
        502,
      );
    }

    // Save admin message
    const senderName = userData.user.email?.split("@")[0] || "Admin";
    await admin.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "admin",
      sender_name: senderName,
      content,
      twilio_message_sid: twData?.sid ?? null,
    });
    await admin
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString(), status: "active" })
      .eq("id", conversationId);

    return json({ success: true, conversation_id: conversationId, sid: twData?.sid ?? null });
  } catch (err) {
    console.error("whatsapp-send error", err);
    return json({ error: "Internal error" }, 500);
  }
});
