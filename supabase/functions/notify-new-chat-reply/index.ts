import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail } from "../_shared/email-logger.ts";

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

    // No email if visitor has no email
    if (!conv.visitor_email) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_visitor_email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Throttle: max 1 email per conversation per 10 minutes
    if (conv.last_email_notified_at) {
      const lastNotified = new Date(conv.last_email_notified_at).getTime();
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      if (lastNotified > tenMinutesAgo) {
        return new Response(JSON.stringify({ skipped: true, reason: "throttled" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build portal link
    const baseUrl = "https://bureauvlieland.lovable.app";
    let portalLink = baseUrl;

    if (conv.source === "customer_portal" && conv.source_token) {
      portalLink = `${baseUrl}/programma/${conv.source_token}?chat=open`;
    } else if (conv.source === "partner_portal") {
      portalLink = `${baseUrl}/partner/dashboard`;
    }

    const visitorName = conv.visitor_name || "Bezoeker";

    // Send via Mailjet
    const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
    const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      console.error("Mailjet credentials missing");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
          <tr>
            <td align="center" style="padding:40px 20px;">
              <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;">
                <tr>
                  <td style="padding-bottom:24px;">
                    <img src="https://bureauvlieland.lovable.app/og-image.png" alt="Bureau Vlieland" width="180" style="display:block;" />
                  </td>
                </tr>
                <tr>
                  <td style="font-size:16px;line-height:24px;color:#333333;">
                    <p style="margin:0 0 16px 0;">Hallo ${visitorName},</p>
                    <p style="margin:0 0 16px 0;">Je hebt een nieuw bericht ontvangen in je persoonlijke portaal van Bureau Vlieland.</p>
                    <p style="margin:0 0 24px 0;">Klik op de knop hieronder om het bericht te bekijken en te reageren.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:32px;">
                    <a href="${portalLink}" style="display:inline-block;background-color:#1a5276;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:6px;">Bekijk bericht →</a>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#999999;border-top:1px solid #eeeeee;padding-top:16px;">
                    <p style="margin:0;">Dit is een automatisch bericht van Bureau Vlieland. Je ontvangt deze e-mail omdat je een gesprek hebt gestart via het portaal.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

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
            To: [{ Email: conv.visitor_email, Name: visitorName }],
            Subject: "Nieuw bericht van Bureau Vlieland",
            HTMLPart: htmlBody,
          },
        ],
      }),
    });

    const mailjetResult = await mailjetResponse.json();
    const mailjetMessageId = mailjetResult?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null;
    const emailStatus = mailjetResponse.ok ? "sent" : "failed";

    // Update throttle timestamp
    await supabase
      .from("chat_conversations")
      .update({ last_email_notified_at: new Date().toISOString() })
      .eq("id", conversation_id);

    // Log email
    await logEmail({
      email_type: "chat_reply_notification",
      subject: "Nieuw bericht van Bureau Vlieland",
      recipient_email: conv.visitor_email,
      recipient_name: visitorName,
      related_request_id: conv.request_id || undefined,
      status: emailStatus,
      mailjet_message_id: mailjetMessageId || undefined,
      sent_by: "system",
      metadata: { conversation_id },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify-new-chat-reply:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
