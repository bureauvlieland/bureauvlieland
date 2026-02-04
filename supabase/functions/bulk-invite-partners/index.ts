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

// Rate limiting: max 5 emails per second for Mailjet
const DELAY_BETWEEN_EMAILS_MS = 200;

interface BulkInviteRequest {
  partnerIds: string[];
}

interface InviteResult {
  partnerId: string;
  partnerName: string;
  success: boolean;
  error?: string;
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

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invitePartner(
  adminClient: any,
  partner: { id: string; name: string; email: string; auth_user_id: string | null },
  origin: string
): Promise<InviteResult> {
  try {
    // Skip if already has an account
    if (partner.auth_user_id) {
      return {
        partnerId: partner.id,
        partnerName: partner.name,
        success: false,
        error: "Partner already has an account",
      };
    }

    // Generate a secure temporary password
    const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";

    // Create auth user
    const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
      email: partner.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        partner_id: partner.id,
        partner_name: partner.name,
      },
    });

    if (createError) {
      console.error(`Error creating auth user for ${partner.name}:`, createError);
      return {
        partnerId: partner.id,
        partnerName: partner.name,
        success: false,
        error: createError.message,
      };
    }

    // Link auth user to partner and set invited_at
    const { error: updateError } = await adminClient
      .from("partners")
      .update({ 
        auth_user_id: authUser.user.id,
        invited_at: new Date().toISOString(),
      })
      .eq("id", partner.id);

    if (updateError) {
      console.error(`Error linking partner ${partner.name}:`, updateError);
    }

    // Add partner role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: authUser.user.id,
        role: "partner",
      });

    if (roleError) {
      console.error(`Error adding partner role for ${partner.name}:`, roleError);
    }

    // Generate password reset link
    const { data: resetData, error: resetError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: partner.email,
      options: {
        redirectTo: `${origin}/partner/reset-password`,
      },
    });

    if (resetError) {
      console.error(`Error generating reset link for ${partner.name}:`, resetError);
    }

    const resetLink = resetData?.properties?.action_link || `${origin}/partner/login`;

    // Send invitation email via Mailjet
    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      // Check if we're in a preview environment
      const isPreview = origin.includes("lovable.app") || origin.includes("localhost");
      const recipientEmail = isPreview ? "erwin@bureauvlieland.nl" : partner.email;
      const subjectPrefix = isPreview ? "[TEST] " : "";

      // Prepare template variables
      const templateVariables = {
        partner_name: sanitizeHtml(partner.name),
        reset_link: resetLink,
        partner_portal_link: `${origin}/partner`,
      };

      // Try to get template from database
      const template = await getRenderedTemplate(TemplateIds.PARTNER_INVITATION, templateVariables);

      const emailHtml = template?.body || getFallbackInvitationHtml(partner.name, resetLink);
      const emailSubject = `${subjectPrefix}${template?.subject || "Welkom bij het Bureau Vlieland Partner Portaal"}`;

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
                  Email: recipientEmail,
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
        console.error(`Mailjet error for ${partner.name}:`, errorText);
        return {
          partnerId: partner.id,
          partnerName: partner.name,
          success: false,
          error: "Failed to send invitation email",
        };
      } else {
        console.log(`Invitation email sent to ${recipientEmail} for partner ${partner.name}`);
      }
    } else {
      console.warn("Mailjet credentials not configured, skipping email");
    }

    return {
      partnerId: partner.id,
      partnerName: partner.name,
      success: true,
    };
  } catch (err) {
    console.error(`Error inviting partner ${partner.name}:`, err);
    return {
      partnerId: partner.id,
      partnerName: partner.name,
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
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
    const { partnerIds }: BulkInviteRequest = await req.json();

    if (!partnerIds || !Array.isArray(partnerIds) || partnerIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Partner IDs required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get partners data
    const { data: partners, error: partnersError } = await adminClient
      .from("partners")
      .select("id, name, email, auth_user_id")
      .in("id", partnerIds);

    if (partnersError) {
      console.error("Error fetching partners:", partnersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch partners" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!partners || partners.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid partners found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "https://bureauvlieland.lovable.app";
    const results: InviteResult[] = [];

    // Process each partner with rate limiting
    for (let i = 0; i < partners.length; i++) {
      const partner = partners[i];
      const result = await invitePartner(adminClient, partner, origin);
      results.push(result);

      // Add delay between emails (except for the last one)
      if (i < partners.length - 1) {
        await delay(DELAY_BETWEEN_EMAILS_MS);
      }
    }

    // Log the activity
    await adminClient.from("admin_activity_log").insert({
      user_id: userId,
      action: "bulk_invite_partners",
      entity_type: "partner",
      details: {
        total_partners: partners.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        partner_names: results.filter(r => r.success).map(r => r.partnerName),
      },
    });

    // Log email entries for successful invites
    for (const result of results.filter(r => r.success)) {
      const partner = partners.find(p => p.id === result.partnerId);
      if (partner) {
        await adminClient.from("email_log").insert({
          email_type: "partner_invitation",
          subject: "Welkom bij het Bureau Vlieland Partner Portaal",
          recipient_email: partner.email,
          recipient_name: partner.name,
          related_partner_id: partner.id,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invited ${results.filter(r => r.success).length} of ${partners.length} partners`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in bulk-invite-partners:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
