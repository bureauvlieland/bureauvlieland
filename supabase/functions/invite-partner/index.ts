// Deprecated: import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
      We zijn verheugd u te verwelkomen bij het nieuwe <strong>Bureau Vlieland Partner Portaal</strong>. 
      Dit digitale platform is ontwikkeld om onze jarenlange samenwerking nog efficiënter en transparanter te maken.
    </p>
    
    <p style="margin: 0 0 25px 0; color: #374151;">
      Het portaal is een evolutie van hoe we samenwerken — geen vervanging van de persoonlijke relatie die we waarderen, 
      maar een aanvulling die het administratieve werk verlicht en de communicatie verbetert.
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
    
    <div style="background: #e8f0f8; border-radius: 8px; padding: 20px 25px; margin: 0 0 25px 0;">
      <p style="margin: 0; color: #374151; font-size: 14px;">
        <strong>💡 Goed om te weten:</strong> Naast programma's die klanten zelf samenstellen, gebruiken wij het portaal 
        ook voor maatwerk programma's die we op verzoek van de klant uitwerken. De werkwijze voor aanvragen en facturatie blijft hetzelfde.
      </p>
    </div>
    
    <div style="background: #fef9e7; border-left: 4px solid #f59e0b; padding: 20px 25px; margin: 0 0 25px 0; border-radius: 0 8px 8px 0;">
      <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px;">💼 Facturatie &amp; Commissie</h3>
      
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">
        Afhankelijk van het project factureert u uw diensten <strong>rechtstreeks aan de eindklant</strong> of aan <strong>Bureau Vlieland</strong>. Dit wordt per project afgestemd. Bureau Vlieland stuurt u periodiek een commissiefactuur over de gerealiseerde omzet.
      </p>
      
      <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 13px; font-style: italic;">
        Deze commissie dekt de acquisitie, coördinatie en klantenservice die Bureau Vlieland voor u verzorgt.
      </p>
    </div>
    
    <div style="background: #d1fae5; border-radius: 8px; padding: 25px; margin: 0 0 25px 0;">
      <h3 style="color: #064e3b; margin: 0 0 15px 0; font-size: 17px;">✅ Wat kunt u nu doen?</h3>
      
      <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
        <li style="margin-bottom: 10px;">
          <strong>Log in</strong> met onderstaande inloggegevens
        </li>
        <li style="margin-bottom: 10px;">
          <strong>Controleer uw aanbod</strong> — bekijk of uw activiteiten en diensten correct zijn weergegeven
        </li>
        <li>
          <strong>Werk uw beschikbaarheid bij</strong> — geef eventuele periodes aan waarop u niet beschikbaar bent
        </li>
      </ol>
      
      <p style="margin: 15px 0 0 0; color: #374151; font-size: 13px;">
        We stellen het op prijs als u binnen <strong>14 dagen</strong> inlogt, zodat u geen aanvragen mist.
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
    
    <p style="margin: 0 0 15px 0; color: #374151;">
      Dit is het eerste jaar dat we met dit nieuwe systeem werken. Uw feedback is daarom bijzonder waardevol. 
      Heeft u vragen, opmerkingen of suggesties? Laat het ons weten — we ontwikkelen dit platform samen.
    </p>
    
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

    // Generate a readable temporary password
    const tempPassword = "Vlieland-" + Math.floor(1000 + Math.random() * 9000);

    // Create auth user
    let authUser;
    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email: partner.email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        partner_id: partnerId,
        partner_name: partner.name,
      },
    });

    if (createError) {
      // If email already exists (orphaned account from previous invite), delete and retry
      if (createError.code === "email_exists") {
        console.log("Existing auth user found for email, cleaning up orphaned account...");
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        const existingUser = users?.find((u) => u.email === partner.email);
        if (existingUser) {
          // Remove old role entries
          await adminClient.from("user_roles").delete().eq("user_id", existingUser.id);
          // Delete the orphaned auth user
          await adminClient.auth.admin.deleteUser(existingUser.id);
        }
        // Retry creation
        const { data: retryUser, error: retryError } = await adminClient.auth.admin.createUser({
          email: partner.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { partner_id: partnerId, partner_name: partner.name },
        });
        if (retryError) {
          console.error("Error creating auth user on retry:", retryError);
          return new Response(
            JSON.stringify({ error: `Failed to create account: ${retryError.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        authUser = retryUser;
      } else {
        console.error("Error creating auth user:", createError);
        return new Response(
          JSON.stringify({ error: `Failed to create account: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      authUser = createdUser;
    }

    // Link auth user to partner and store initial password
    const { error: updateError } = await adminClient
      .from("partners")
      .update({ auth_user_id: authUser.user.id, initial_password: tempPassword })
      .eq("id", partnerId);

    if (updateError) {
      console.error("Error linking partner:", updateError);
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

    const origin = req.headers.get("origin") || "https://bureauvlieland.lovable.app";
    const loginLink = `${origin}/partner/login`;
    const portalLink = `${origin}/partner`;

    // Send invitation email via Mailjet
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
      const emailSubject = template?.subject || "Welkom bij het Bureau Vlieland Partner Portaal - Uw digitale werkplek";

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
Welkom ${partner.name}!

U bent uitgenodigd om deel te nemen aan het Bureau Vlieland Partner Portaal.

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
