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

// Same fallback template as invite-partner (without "24 uur geldig" text)
function getFallbackInvitationHtml(partnerName: string, resetLink: string, portalLink: string): string {
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
      U ontvangt deze email omdat u nog geen wachtwoord heeft ingesteld voor het <strong>Bureau Vlieland Partner Portaal</strong>.
      Via onderstaande link kunt u alsnog uw account activeren.
    </p>
    
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
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" 
         style="background: #1e3a5f; color: #ffffff; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
        Account Activeren
      </a>
    </div>
    
    <p style="color: #374151; font-size: 13px; text-align: center; margin: 0 0 25px 0;">
      Na activatie vindt u het portaal op:<br>
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub;

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

    // Generate new password reset link
    const origin = req.headers.get("origin") || "https://bureauvlieland.lovable.app";
    const { data: resetData, error: resetError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: partner.email,
      options: {
        redirectTo: `${origin}/partner/reset-password`,
      },
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      return new Response(
        JSON.stringify({ error: "Failed to generate activation link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resetLink = resetData?.properties?.action_link || `${origin}/partner/login`;
    const portalLink = `${origin}/partner`;

    // Update invited_at timestamp
    await adminClient
      .from("partners")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", partnerId);

    // Send invitation email via Mailjet
    let emailSent = false;
    let emailError: string | null = null;
    let mailjetMessageId: string | null = null;

    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      // Prepare template variables
      const templateVariables = {
        partner_name: sanitizeHtml(partner.name),
        reset_link: resetLink,
        partner_portal_link: portalLink,
      };

      // Try to get template from database
      const template = await getRenderedTemplate(TemplateIds.PARTNER_INVITATION, templateVariables);

      const emailHtml = template?.body || getFallbackInvitationHtml(partner.name, resetLink, portalLink);
      const emailSubject = template?.subject || "Herinnering: Activeer uw Bureau Vlieland Partner Portaal account";

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
                Email: "noreply@bureauvlieland.nl",
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

U ontvangt deze email omdat u nog geen wachtwoord heeft ingesteld voor het Bureau Vlieland Partner Portaal.

Klik op de volgende link om uw account te activeren:
${resetLink}

Na activatie vindt u het portaal op: ${portalLink}

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
      subject: "Herinnering: Activeer uw Bureau Vlieland Partner Portaal account",
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
