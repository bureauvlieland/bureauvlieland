import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getRenderedTemplate, 
  sanitizeHtml,
  TemplateIds 
} from "../_shared/email-templates.ts";
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

// Fallback template with direct credentials
function getFallbackInvitationHtml(partnerName: string, partnerEmail: string, partnerPassword: string, loginLink: string, portalLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; padding: 0; background: #f4f7fa;">
  <div style="background: #1e3a5f; padding: 35px 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Bureau Vlieland</h1>
    <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 15px;">Partner Portaal</p>
  </div>
  
  <div style="background: white; padding: 35px 30px;">
    <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 20px;">Beste ${sanitizeHtml(partnerName)},</h2>
    
    <p style="margin: 0 0 18px 0; color: #374151;">
      U ontvangt deze email omdat u nog niet bent ingelogd op het <strong>Bureau Vlieland Partner Portaal</strong>.
      Hieronder vindt u uw (nieuwe) inloggegevens.
    </p>
    
    <div style="background: #fef9e7; border-left: 4px solid #f59e0b; padding: 20px 25px; margin: 0 0 25px 0; border-radius: 0 8px 8px 0;">
      <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px;">💼 Facturatie &amp; Commissie</h3>
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">
        Afhankelijk van het project factureert u uw diensten <strong>rechtstreeks aan de eindklant</strong> of aan <strong>Bureau Vlieland</strong>. Dit wordt per project afgestemd. Bureau Vlieland stuurt u periodiek een commissiefactuur over de gerealiseerde omzet.
      </p>
      <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 13px; font-style: italic;">
        Deze commissie dekt de acquisitie, coördinatie en klantenservice die Bureau Vlieland voor u verzorgt.
      </p>
    </div>
    
    <div style="background: #e8f0f8; border-radius: 8px; padding: 25px; margin: 0 0 25px 0;">
      <h3 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 17px;">📋 Hoe werkt het?</h3>
      
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">
        <strong>1. Klanten stellen hun programma samen</strong><br>
        Via onze online configurator kiezen gasten activiteiten, catering en logies voor hun verblijf op Vlieland.
      </p>
      
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">
        <strong>2. U ontvangt automatisch een aanvraag</strong><br>
        Wanneer een klant uw diensten selecteert, krijgt u direct bericht met alle relevante details: datum, tijd, aantal personen en speciale wensen.
      </p>
      
      <p style="margin: 0; color: #374151; font-size: 14px;">
        <strong>3. U reageert via het portaal</strong><br>
        Met één klik bevestigt u de aanvraag, stelt u een alternatief voor, of geeft u aan dat u niet beschikbaar bent.
      </p>
    </div>
    
    <div style="background: #f0f4ff; border: 2px solid #1e3a5f; border-radius: 8px; padding: 25px; margin: 0 0 25px 0;">
      <h3 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 17px;">🔑 Uw inloggegevens</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Emailadres:</td>
          <td style="padding: 8px 0; color: #1e3a5f; font-weight: 600; font-size: 14px;">${sanitizeHtml(partnerEmail)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Wachtwoord:</td>
          <td style="padding: 8px 0; color: #1e3a5f; font-weight: 600; font-size: 14px; font-family: monospace; letter-spacing: 1px;">${sanitizeHtml(partnerPassword)}</td>
        </tr>
      </table>
      <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px;">
        Wijzig uw wachtwoord na eerste login via Instellingen.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginLink}" 
         style="background: #1e3a5f; color: #ffffff; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
        Inloggen op het Portaal
      </a>
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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { partnerId }: ResendRequest = await req.json();

    if (!partnerId) {
      return new Response(
        JSON.stringify({ error: "Partner ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get partner data
    const { data: partner, error: partnerError } = await adminClient
      .from("partners")
      .select("*")
      .eq("id", partnerId)
      .maybeSingle();

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: "Partner not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Must have an auth_user_id to resend
    if (!partner.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "Partner has no account yet. Use invite-partner instead." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Should not have password_set_at (already activated)
    if (partner.password_set_at) {
      return new Response(
        JSON.stringify({ error: "Partner has already activated their account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Synchroniseer auth user email als deze afwijkt van partner email
    const { data: authUser } = await adminClient.auth.admin.getUserById(partner.auth_user_id);
    if (authUser?.user?.email !== partner.email) {
      console.log(`Syncing auth email from ${authUser?.user?.email} to ${partner.email}`);
      const { error: emailUpdateError } = await adminClient.auth.admin.updateUserById(partner.auth_user_id, {
        email: partner.email,
        email_confirm: true,
      });
      if (emailUpdateError) {
        console.error("Error syncing auth email:", emailUpdateError);
        return new Response(
          JSON.stringify({ error: "Failed to sync auth email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate a new readable temporary password and reset it
    const tempPassword = "Vlieland-" + Math.floor(1000 + Math.random() * 9000);

    const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(
      partner.auth_user_id,
      { password: tempPassword }
    );

    if (updatePasswordError) {
      console.error("Error resetting password:", updatePasswordError);
      return new Response(
        JSON.stringify({ error: "Failed to reset password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "https://bureauvlieland.nl";
    const loginLink = `${origin}/partner/login`;
    const portalLink = `${origin}/partner`;

    // Update invited_at timestamp and store new initial password
    await adminClient
      .from("partners")
      .update({ invited_at: new Date().toISOString(), initial_password: tempPassword })
      .eq("id", partnerId);

    // Send invitation email via Mailjet
    let emailSent = false;
    let emailError: string | null = null;
    let mailjetMessageId: string | null = null;

    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      // Prepare template variables
      const templateVariables = {
        partner_name: sanitizeHtml(partner.name),
        partner_email: partner.email,
        partner_password: tempPassword,
        login_link: loginLink,
        partner_portal_link: portalLink,
        commission_activity: String(partner.commission_percentage || 15),
        commission_accommodation: String(partner.accommodation_commission_percentage || 10),
      };

      // Try to get template from database
      const template = await getRenderedTemplate(TemplateIds.PARTNER_INVITATION, templateVariables);

      const emailHtml = template?.body || getFallbackInvitationHtml(partner.name, partner.email, tempPassword, loginLink, portalLink);
      const emailSubject = template?.subject || "Herinnering: Uw Bureau Vlieland Partner Portaal inloggegevens";

      const emailResponse = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
        },
        body: JSON.stringify({
          Messages: [
            {
              From: {
                Email: "hallo@bureauvlieland.nl",
                Name: "Bureau Vlieland",
              },
              To: [
                {
                  Email: partner.email,
                  Name: partner.name,
                },
              ],
              Subject: emailSubject,
              HTMLPart: emailHtml,
              TextPart: `
Beste ${partner.name},

U ontvangt deze email omdat u nog niet bent ingelogd op het Bureau Vlieland Partner Portaal.

Uw inloggegevens:
- Emailadres: ${partner.email}
- Wachtwoord: ${tempPassword}
- Inloggen: ${loginLink}

Wijzig uw wachtwoord na eerste login via Instellingen.

Vragen? Neem contact op via erwin@bureauvlieland.nl

Met vriendelijke groet,
Erwin Soolsma
Bureau Vlieland
              `,
            },
          ],
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error("Mailjet error:", errorText);
        emailError = errorText;
      } else {
        emailSent = true;
        const responseData = await emailResponse.json();
        mailjetMessageId = responseData?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null;
        console.log("Re-invitation email sent successfully to:", partner.email);
      }
    } else {
      emailError = "Mailjet credentials not configured";
      console.warn("Mailjet credentials not configured, skipping email");
    }

    // Log email
    await logEmail({
      email_type: EmailTypes.PARTNER_INVITATION,
      subject: "Herinnering: Uw Bureau Vlieland Partner Portaal inloggegevens",
      recipient_email: partner.email,
      recipient_name: partner.name,
      related_partner_id: partnerId,
      status: emailSent ? "sent" : "failed",
      error_message: emailError || undefined,
      mailjet_message_id: mailjetMessageId || undefined,
      sent_by: "resend-partner-invitation",
      metadata: { resend: true },
    });

    // Log the activity
    await adminClient.from("admin_activity_log").insert({
      user_id: userId,
      action: "partner_invitation_resent",
      entity_type: "partner",
      entity_id: partnerId,
      details: {
        partner_name: partner.name,
        partner_email: partner.email,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation resent successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in resend-partner-invitation:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
