// Admin "reset password": send the partner a fresh one-time set-password link.
// No plaintext password is generated or stored anywhere.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeHtml, getSubjectPrefix, getRecipientEmail } from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

function getResetHtml(partnerName: string, setPasswordLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="background: #1e3a5f; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Bureau Vlieland</h1>
  </div>
  <div style="padding: 24px;">
    <p>Beste ${sanitizeHtml(partnerName)},</p>
    <p>De beheerder heeft een nieuwe link voor u aangemaakt om uw wachtwoord in te stellen voor het Partner Portaal.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${setPasswordLink}" style="background: #1e3a5f; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Nieuw wachtwoord instellen
      </a>
    </div>
    <p style="font-size: 13px; color: #666;">Werkt de knop niet? Kopieer deze link:<br>
      <span style="word-break: break-all;">${setPasswordLink}</span>
    </p>
    <p style="font-size: 13px; color: #666;">Deze link is persoonlijk en beperkt geldig.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #666; font-size: 14px;">Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { partnerId } = await req.json();
    if (!partnerId) {
      return new Response(JSON.stringify({ error: "partnerId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: partner, error: partnerError } = await adminClient
      .from("partners")
      .select("id, name, email, contact_email, auth_user_id")
      .eq("id", partnerId)
      .maybeSingle();

    if (partnerError || !partner) {
      return new Response(JSON.stringify({ error: "Partner not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!partner.auth_user_id) {
      return new Response(JSON.stringify({ error: "Partner has no login account yet. Invite them first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate a fresh one-time set-password link.
    const redirectTo = "https://bureauvlieland.nl/partner/reset-password";
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: partner.email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Failed to generate set-password link:", linkError);
      return new Response(JSON.stringify({ error: "Failed to generate set-password link" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const setPasswordLink = linkData.properties.action_link;

    // Reset password_set_at so the partner shows as "pending activation" again.
    await adminClient
      .from("partners")
      .update({ password_set_at: null, invited_at: new Date().toISOString() })
      .eq("id", partnerId);

    const origin = req.headers.get("origin") || undefined;
    const subjectPrefix = getSubjectPrefix(origin);
    const originalRecipient = partner.contact_email || partner.email;
    const recipientEmail = getRecipientEmail(originalRecipient, origin);
    const subject = `${subjectPrefix}Nieuwe link om uw wachtwoord in te stellen — Bureau Vlieland Partner Portaal`;

    let emailSent = false;
    let emailError: string | null = null;

    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      const emailResponse = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}` },
        body: JSON.stringify({
          Messages: [{
            From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
            To: [{ Email: recipientEmail, Name: partner.name }],
            Subject: subject,
            HTMLPart: getResetHtml(partner.name, setPasswordLink),
            TextPart:
`Beste ${partner.name},

De beheerder heeft een nieuwe link voor u aangemaakt om uw wachtwoord in te stellen voor het Partner Portaal:

${setPasswordLink}

Met vriendelijke groet,
Bureau Vlieland`,
          }],
        }),
      });

      if (!emailResponse.ok) {
        emailError = await emailResponse.text();
        console.error("Mailjet error:", emailError);
      } else {
        emailSent = true;
      }
    } else {
      emailError = "Mailjet credentials not configured";
    }

    await logEmail({
      email_type: "partner_password_reset",
      subject,
      recipient_email: recipientEmail,
      recipient_name: partner.name,
      related_partner_id: partnerId,
      status: emailSent ? "sent" : "failed",
      error_message: emailError || undefined,
      sent_by: "admin-reset-partner-password",
      metadata: {
        template_name: "partner_password_reset",
        actor: "admin → partner",
        initiated_by_admin: true,
        method: "set_password_link",
      },
    });

    await adminClient.from("admin_activity_log").insert({
      user_id: user.id,
      action: "partner_password_reset",
      entity_type: "partner",
      entity_id: partnerId,
      details: { partner_name: partner.name, method: "set_password_link" },
    });

    console.log(`Admin ${user.id} sent set-password link to partner ${partner.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Set-password link sent to ${recipientEmail}`,
        emailSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-reset-partner-password:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
