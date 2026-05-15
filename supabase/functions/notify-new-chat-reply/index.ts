import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail } from "../_shared/email-logger.ts";
import { getRenderedTemplate, TemplateIds, getSubjectPrefix, getRecipientEmail } from "../_shared/email-templates.ts";

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

    // Determine recipient: for accommodation chats the visitor is a partner
    const isAccommodationChat = !!conv.accommodation_id;
    let recipientEmail = conv.visitor_email;
    let recipientName = conv.visitor_name || "Bezoeker";

    // For accommodation chats, use partner's contact_email if available
    if (isAccommodationChat && conv.source_partner_id) {
      const { data: partner } = await supabase
        .from("partners")
        .select("contact_email, email, name")
        .eq("id", conv.source_partner_id)
        .single();
      if (partner) {
        recipientEmail = partner.contact_email || partner.email;
        recipientName = partner.name;
      }
    }

    // No email if no recipient
    if (!recipientEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_recipient_email" }), {
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

    // Build portal link and subject
    const baseUrl = "https://bureauvlieland.nl";
    let portalLink = baseUrl;
    let emailSubject = "Nieuw bericht van Bureau Vlieland";

    if (isAccommodationChat) {
      // Get accommodation reference number
      let refNumber = "";
      if (conv.accommodation_id) {
        const { data: accReq } = await supabase
          .from("accommodation_requests")
          .select("reference_number")
          .eq("id", conv.accommodation_id)
          .single();
        refNumber = accReq?.reference_number || "";
      }
      portalLink = `${baseUrl}/partner/logies`;
      emailSubject = refNumber
        ? `Nieuw bericht inzake logiesaanvraag ${refNumber}`
        : "Nieuw bericht over een logiesaanvraag";
    } else if (conv.source === "customer_portal" && conv.source_token) {
      portalLink = `${baseUrl}/mijn-programma/${conv.source_token}?chat=open`;
    } else if (conv.source === "partner_portal") {
      portalLink = `${baseUrl}/partner/dashboard`;
    } else if (conv.request_id) {
      // Admin-initiated chat from a project — resolve customer_token and link to klant portal
      const { data: pr } = await supabase
        .from("program_requests")
        .select("customer_token, reference_number")
        .eq("id", conv.request_id)
        .maybeSingle();
      if (pr?.customer_token) {
        portalLink = `${baseUrl}/mijn-programma/${pr.customer_token}?chat=open`;
      }
      if (pr?.reference_number) {
        emailSubject = `Nieuw bericht over uw aanvraag ${pr.reference_number}`;
      }
    } else if (conv.accommodation_id) {
      const { data: ar } = await supabase
        .from("accommodation_requests")
        .select("customer_token, reference_number")
        .eq("id", conv.accommodation_id)
        .maybeSingle();
      if (ar?.customer_token) {
        portalLink = `${baseUrl}/logies/${ar.customer_token}?chat=open`;
      }
      if (ar?.reference_number) {
        emailSubject = `Nieuw bericht over uw logiesaanvraag ${ar.reference_number}`;
      }
    }

    // Try DB template
    const template = await getRenderedTemplate(TemplateIds.CHAT_REPLY_VISITOR, {
      visitor_name: recipientName,
      portal_link: portalLink,
    });

    const finalSubject = template?.subject || emailSubject;
    const htmlBody = template?.body || `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
          <tr><td align="center" style="padding:40px 20px;">
            <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;">
              <tr><td style="font-size:16px;line-height:24px;color:#333333;">
                <p style="margin:0 0 16px 0;">Hallo ${recipientName},</p>
                <p style="margin:0 0 16px 0;">Je hebt een nieuw bericht ontvangen van Bureau Vlieland.</p>
                <p style="margin:0 0 24px 0;">Klik op de knop hieronder om het bericht te bekijken en te reageren.</p>
              </td></tr>
              <tr><td style="padding-bottom:32px;">
                <a href="${portalLink}" style="display:inline-block;background-color:#1a5276;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:6px;">Bekijk bericht →</a>
              </td></tr>
              <tr><td style="font-size:13px;color:#999999;border-top:1px solid #eeeeee;padding-top:16px;">
                <p style="margin:0;">Dit is een automatisch bericht van Bureau Vlieland.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

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
            To: [{ Email: getRecipientEmail(recipientEmail, req.headers.get("origin") || undefined), Name: recipientName }],
            Subject: `${getSubjectPrefix(req.headers.get("origin") || undefined)}${finalSubject}`,
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
      subject: finalSubject,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      related_request_id: conv.request_id || undefined,
      related_accommodation_id: conv.accommodation_id || undefined,
      status: emailStatus,
      mailjet_message_id: mailjetMessageId || undefined,
      sent_by: "system",
      metadata: {
        template_name: "chat_reply_notification",
        actor: "system → ontvanger (chat reply)",
        conversation_id,
      },
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
