// Resend partner invitation: regenerate a one-time set-password link, no plaintext password is created or stored.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeHtml } from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

interface ResendRequest {
  partnerId: string;
}

function getInvitationHtml(partnerName: string, partnerEmail: string, setPasswordLink: string, portalLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; padding: 0; background: #f4f7fa;">
  <div style="background: #1e3a5f; padding: 35px 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Bureau Vlieland</h1>
    <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 15px;">Partner Portaal</p>
  </div>
  <div style="background: white; padding: 35px 30px;">
    <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 20px;">Beste ${sanitizeHtml(partnerName)},</h2>
    <p style="margin: 0 0 18px 0; color: #374151;">
      U heeft uw account voor het <strong>Bureau Vlieland Partner Portaal</strong> nog niet geactiveerd.
      Hieronder ontvangt u een nieuwe persoonlijke link om eenmalig uw wachtwoord in te stellen.
    </p>
    <div style="background: #f0f4ff; border: 2px solid #1e3a5f; border-radius: 8px; padding: 25px; margin: 0 0 25px 0;">
      <h3 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 17px;">🔑 Account activeren</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Emailadres:</td>
          <td style="padding: 8px 0; color: #1e3a5f; font-weight: 600; font-size: 14px;">${sanitizeHtml(partnerEmail)}</td>
        </tr>
      </table>
      <div style="text-align: center; margin: 20px 0 5px 0;">
        <a href="${setPasswordLink}"
           style="background: #1e3a5f; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
          Wachtwoord instellen &amp; inloggen
        </a>
      </div>
      <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
        Werkt de knop niet? Kopieer deze link in uw browser:<br>
        <span style="word-break: break-all; color: #1e3a5f;">${setPasswordLink}</span>
      </p>
    </div>
    <p style="color: #374151; font-size: 13px; text-align: center; margin: 0 0 25px 0;">
      U vindt het portaal op:<br>
      <a href="${portalLink}" style="color: #1e3a5f;">${portalLink}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
    <p style="margin: 0 0 5px 0; color: #374151;">Met vriendelijke groet,</p>
    <p style="margin: 0; color: #1e3a5f; font-weight: 600;">Erwin Soolsma</p>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">Bureau Vlieland</p>
  </div>
  <div style="background: #e8f0f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="color: #374151; font-size: 13px; margin: 0;">
      Vragen? Neem contact op via <a href="mailto:erwin@bureauvlieland.nl" style="color: #1e3a5f;">erwin@bureauvlieland.nl</a> of bel 0562-452090
    </p>
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
    const userId = user.id;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { partnerId }: ResendRequest = await req.json();
    if (!partnerId) {
      return new Response(JSON.stringify({ error: "Partner ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: partner, error: partnerError } = await adminClient.from("partners").select("*").eq("id", partnerId).maybeSingle();
    if (partnerError || !partner) {
      return new Response(JSON.stringify({ error: "Partner not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!partner.auth_user_id) {
      return new Response(JSON.stringify({ error: "Partner has no account yet. Use invite-partner instead." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (partner.password_set_at) {
      return new Response(JSON.stringify({ error: "Partner has already activated their account. Use 'Wachtwoord vergeten' instead." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Sync auth email if drifted
    const { data: authUser } = await adminClient.auth.admin.getUserById(partner.auth_user_id);
    if (authUser?.user?.email !== partner.email) {
      const { error: emailUpdateError } = await adminClient.auth.admin.updateUserById(partner.auth_user_id, {
        email: partner.email,
        email_confirm: true,
      });
      if (emailUpdateError) {
        console.error("Error syncing auth email:", emailUpdateError);
        return new Response(JSON.stringify({ error: "Failed to sync auth email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const origin = req.headers.get("origin") || "https://bureauvlieland.nl";
    const portalLink = `${origin}/partner`;
    const redirectTo = "https://bureauvlieland.nl/partner/reset-password";

    // Generate a fresh one-time set-password link.
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

    await adminClient.from("partners").update({ invited_at: new Date().toISOString() }).eq("id", partnerId);

    let emailSent = false;
    let emailError: string | null = null;
    let mailjetMessageId: string | null = null;
    const subject = "Herinnering: Activeer uw Bureau Vlieland Partner Portaal account";

    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      const emailHtml = getInvitationHtml(partner.name, partner.email, setPasswordLink, portalLink);
      const emailResponse = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}` },
        body: JSON.stringify({
          Messages: [{
            From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
            To: [{ Email: partner.email, Name: partner.name }],
            Subject: subject,
            HTMLPart: emailHtml,
            TextPart:
`Beste ${partner.name},

U heeft uw account voor het Bureau Vlieland Partner Portaal nog niet geactiveerd.

Stel hier eenmalig uw wachtwoord in:
${setPasswordLink}

Inloggen kan daarna op: ${portalLink}/login

Vragen? Neem contact op via erwin@bureauvlieland.nl

Met vriendelijke groet,
Erwin Soolsma
Bureau Vlieland`,
          }],
        }),
      });

      if (!emailResponse.ok) {
        emailError = await emailResponse.text();
        console.error("Mailjet error:", emailError);
      } else {
        emailSent = true;
        const responseData = await emailResponse.json();
        mailjetMessageId = responseData?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null;
      }
    } else {
      emailError = "Mailjet credentials not configured";
    }

    await logEmail({
      email_type: EmailTypes.PARTNER_INVITATION,
      subject,
      recipient_email: partner.email,
      recipient_name: partner.name,
      related_partner_id: partnerId,
      status: emailSent ? "sent" : "failed",
      error_message: emailError || undefined,
      mailjet_message_id: mailjetMessageId || undefined,
      sent_by: "resend-partner-invitation",
      metadata: { resend: true, method: "set_password_link" },
    });

    await adminClient.from("admin_activity_log").insert({
      user_id: userId,
      action: "partner_invitation_resent",
      entity_type: "partner",
      entity_id: partnerId,
      details: { partner_name: partner.name, partner_email: partner.email, method: "set_password_link" },
    });

    return new Response(JSON.stringify({ success: true, message: "Invitation resent successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in resend-partner-invitation:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
