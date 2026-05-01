import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";
import { SENDER_EMAIL, SENDER_NAME, getRenderedTemplate, TemplateIds, getSubjectPrefix, getRecipientEmail } from "../_shared/email-templates.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if this email belongs to an active partner
    const { data: partner } = await supabase
      .from("partners")
      .select("id, name, auth_user_id")
      .eq("email", trimmedEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (!partner || !partner.auth_user_id) {
      console.log("No active partner found for email:", trimmedEmail);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: check if a reset email was sent in the last 60 seconds
    const { data: recentEmail } = await supabase
      .from("email_log")
      .select("id")
      .eq("recipient_email", trimmedEmail)
      .eq("email_type", "partner_password_reset")
      .eq("status", "sent")
      .gte("sent_at", new Date(Date.now() - 60_000).toISOString())
      .maybeSingle();

    if (recentEmail) {
      console.log("Rate limited password reset for:", trimmedEmail);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate recovery link using admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: trimmedEmail,
      options: {
        redirectTo: "https://bureauvlieland.nl/partner/reset-password",
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Failed to generate recovery link:", linkError);
      throw new Error("LINK_GENERATION_FAILED");
    }

    const actionLink = linkData.properties.action_link;

    // Try DB template
    const template = await getRenderedTemplate(TemplateIds.PARTNER_PASSWORD_RESET, {
      partner_name: partner.name,
      reset_link: actionLink,
    });

    const origin = req.headers.get("origin") || undefined;
    const subjectPrefix = getSubjectPrefix(origin);
    const emailSubject = `${subjectPrefix}${template?.subject || "Wachtwoord resetten — Bureau Vlieland Partner Portal"}`;
    const htmlBody = template?.body || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Bureau Vlieland</h1>
        </div>
        <div style="padding: 24px; line-height: 1.6; color: #333;">
          <p>Hallo ${partner.name},</p>
          <p>We hebben een verzoek ontvangen om je wachtwoord te resetten voor de Partner Portal.</p>
          <p>Klik op de onderstaande knop om een nieuw wachtwoord in te stellen:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${actionLink}" style="background-color: #1e3a5f; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Wachtwoord resetten</a>
          </div>
          <p style="font-size: 14px; color: #666;">Deze link is 1 uur geldig.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <div style="padding: 0 24px 24px; color: #666; font-size: 14px;">
          <p>Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
        </div>
      </div>
    `;

    // Send via Mailjet
    const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
            To: [{ Email: trimmedEmail, Name: partner.name }],
            Subject: emailSubject,
            HTMLPart: htmlBody,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mailjet error:", errorText);
      throw new Error("EMAIL_SERVICE_ERROR");
    }

    // Log the email
    await logEmail({
      email_type: "partner_password_reset",
      subject: emailSubject,
      recipient_email: trimmedEmail,
      recipient_name: partner.name,
      related_partner_id: partner.id,
      status: "sent",
      sent_by: "system:password_reset",
    });

    console.log("Password reset email sent to:", trimmedEmail);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-partner-reset-email:", error);
    return new Response(
      JSON.stringify({ error: "Er kon geen reset email worden verstuurd. Probeer het later opnieuw." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
