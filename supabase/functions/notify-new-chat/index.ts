import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRenderedTemplate, TemplateIds } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id } = await req.json();
    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "Missing conversation_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get conversation details
    const { data: conv } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();

    if (!conv) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if we already sent a notification for this conversation recently
    const { data: recentLog } = await supabase
      .from("email_log")
      .select("id")
      .eq("email_type", "chat_notification")
      .eq("metadata->>conversation_id", conversation_id)
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(1);

    if (recentLog && recentLog.length > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "recent_notification_exists" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the latest message
    const { data: latestMsg } = await supabase
      .from("chat_messages")
      .select("content, sender_name")
      .eq("conversation_id", conversation_id)
      .eq("sender_type", "visitor")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const sourceLabel = conv.source === "partner_portal" ? "Partnerportaal" : "Klantportaal";
    const visitorName = conv.visitor_name || "Bezoeker";
    const visitorEmail = conv.visitor_email || "onbekend";
    const messagePreview = latestMsg?.content?.substring(0, 200) || "";

    // Try DB template
    const template = await getRenderedTemplate(TemplateIds.CHAT_NOTIFICATION_BUREAU, {
      visitor_name: visitorName,
      visitor_email: visitorEmail,
      source_label: sourceLabel,
      message_preview: messagePreview,
      chat_url: "https://bureauvlieland.nl/admin/chat",
    });

    const emailSubject = template?.subject || `💬 Nieuw chatbericht van ${visitorName} (${sourceLabel})`;
    const emailBody = template?.body || `
      <h3>Nieuw chatbericht</h3>
      <p><strong>Van:</strong> ${visitorName} (${visitorEmail})</p>
      <p><strong>Bron:</strong> ${sourceLabel}</p>
      <p><strong>Bericht:</strong></p>
      <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;">${messagePreview}</blockquote>
      <p><a href="https://bureauvlieland.nl/admin/chat">Ga naar chat →</a></p>
    `;

    // Send via Mailjet
    const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
    const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      const mailjetResponse = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
        },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
              To: [{ Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" }],
              Subject: emailSubject,
              HTMLPart: emailBody,
            },
          ],
        }),
      });

      const mailjetResult = await mailjetResponse.text();
      console.log("Mailjet result:", mailjetResult);
    }

    // Log the notification
    await supabase.from("email_log").insert({
      email_type: "chat_notification",
      subject: emailSubject,
      recipient_email: "hallo@bureauvlieland.nl",
      recipient_name: "Bureau Vlieland",
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: { conversation_id, source: conv.source },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
