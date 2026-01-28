import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getRenderedTemplate, 
  sanitizeHtml,
  TemplateIds 
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

interface InviteRequest {
  partnerId: string;
}

// Fallback email template if database template not found
function getFallbackInvitationHtml(partnerName: string, resetLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Bureau Vlieland</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Partner Portaal</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1e3a5f; margin-top: 0;">Welkom ${sanitizeHtml(partnerName)}!</h2>
    
    <p>Je bent uitgenodigd om deel te nemen aan het Bureau Vlieland Partner Portaal. Via dit portaal kun je:</p>
    
    <ul style="color: #475569;">
      <li>Activiteitsaanvragen bekijken en bevestigen</li>
      <li>Prijzen doorgeven aan klanten</li>
      <li>Facturen registreren</li>
      <li>Je bedrijfsgegevens beheren</li>
    </ul>
    
    <p>Klik op de onderstaande knop om je wachtwoord in te stellen en in te loggen:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" 
         style="background: #1e3a5f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Stel je wachtwoord in
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      Deze link is 24 uur geldig. Als de link verlopen is, kun je op de loginpagina een nieuwe wachtwoord-reset aanvragen.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
      Vragen? Neem contact op via <a href="mailto:erwin@bureauvlieland.nl" style="color: #1e3a5f;">erwin@bureauvlieland.nl</a>
    </p>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
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
    const { partnerId }: InviteRequest = await req.json();

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

    if (partner.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "Partner already has an account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a secure temporary password
    const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";

    // Create auth user
    const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
      email: partner.email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        partner_id: partnerId,
        partner_name: partner.name,
      },
    });

    if (createError) {
      console.error("Error creating auth user:", createError);
      return new Response(
        JSON.stringify({ error: `Failed to create account: ${createError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link auth user to partner
    const { error: updateError } = await adminClient
      .from("partners")
      .update({ auth_user_id: authUser.user.id })
      .eq("id", partnerId);

    if (updateError) {
      console.error("Error linking partner:", updateError);
      // Don't fail - user was created
    }

    // Add partner role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: authUser.user.id,
        role: "partner",
      });

    if (roleError) {
      console.error("Error adding partner role:", roleError);
    }

    // Generate password reset link
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
    }

    // Get the action link (password reset URL)
    const resetLink = resetData?.properties?.action_link || `${origin}/partner/login`;

    // Send invitation email via Mailjet
    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      // Prepare template variables
      const templateVariables = {
        partner_name: sanitizeHtml(partner.name),
        reset_link: resetLink,
        partner_portal_link: `${origin}/partner`,
      };

      // Try to get template from database
      const template = await getRenderedTemplate(TemplateIds.PARTNER_INVITATION, templateVariables);

      const emailHtml = template?.body || getFallbackInvitationHtml(partner.name, resetLink);
      const emailSubject = template?.subject || "Welkom bij het Bureau Vlieland Partner Portaal";

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
Welkom ${partner.name}!

Je bent uitgenodigd om deel te nemen aan het Bureau Vlieland Partner Portaal.

Via dit portaal kun je:
- Activiteitsaanvragen bekijken en bevestigen
- Prijzen doorgeven aan klanten
- Facturen registreren
- Je bedrijfsgegevens beheren

Klik op de volgende link om je wachtwoord in te stellen:
${resetLink}

Deze link is 24 uur geldig.

Vragen? Neem contact op via erwin@bureauvlieland.nl

Met vriendelijke groet,
Bureau Vlieland
              `,
            },
          ],
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error("Mailjet error:", errorText);
      } else {
        console.log("Invitation email sent successfully to:", partner.email);
      }
    } else {
      console.warn("Mailjet credentials not configured, skipping email");
    }

    // Log the invitation
    await adminClient.from("admin_activity_log").insert({
      user_id: userId,
      action: "partner_invited",
      entity_type: "partner",
      entity_id: partnerId,
      details: {
        partner_name: partner.name,
        partner_email: partner.email,
        auth_user_id: authUser.user.id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Partner invited successfully",
        authUserId: authUser.user.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in invite-partner:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
