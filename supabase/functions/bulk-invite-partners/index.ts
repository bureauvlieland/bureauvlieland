import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeHtml } from "../_shared/email-templates.ts";

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

// Branded invitation email built around a one-time set-password link.
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
      We zijn verheugd u te verwelkomen bij het nieuwe <strong>Bureau Vlieland Partner Portaal</strong>.
    </p>
    <p style="margin: 0 0 25px 0; color: #374151;">
      Activeer uw account door eenmalig een eigen wachtwoord in te stellen via onderstaande knop.
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
        <a href="${setPasswordLink}" style="background: #1e3a5f; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
          Wachtwoord instellen &amp; inloggen
        </a>
      </div>
      <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
        Werkt de knop niet? Kopieer deze link:<br>
        <span style="word-break: break-all; color: #1e3a5f;">${setPasswordLink}</span>
      </p>
    </div>
    <p style="color: #374151; font-size: 13px; text-align: center; margin: 0 0 25px 0;">
      U vindt het portaal op: <a href="${portalLink}" style="color: #1e3a5f;">${portalLink}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
    <p style="margin: 0 0 5px 0; color: #374151;">Met vriendelijke groet,</p>
    <p style="margin: 0; color: #1e3a5f; font-weight: 600;">Erwin Soolsma</p>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">Bureau Vlieland</p>
  </div>
  <div style="background: #e8f0f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="color: #374151; font-size: 13px; margin: 0;">
      Vragen? <a href="mailto:erwin@bureauvlieland.nl" style="color: #1e3a5f;">erwin@bureauvlieland.nl</a> of 0562-452090
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
  partner: { id: string; name: string; email: string; auth_user_id: string | null; commission_percentage?: number; accommodation_commission_percentage?: number },
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

    // Generate a readable temporary password
    const tempPassword = "Vlieland-" + Math.floor(1000 + Math.random() * 9000);

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

    // Link auth user to partner, set invited_at and store initial password
    const { error: updateError } = await adminClient
      .from("partners")
      .update({ 
        auth_user_id: authUser.user.id,
        invited_at: new Date().toISOString(),
        initial_password: tempPassword,
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

    const loginLink = `${origin}/partner/login`;
    const portalLink = `${origin}/partner`;

    // Send invitation email via Mailjet
    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      // Check if we're in a preview environment
      const isPreview = origin.includes("lovable.app") || origin.includes("localhost");
      const recipientEmail = isPreview ? "erwin@bureauvlieland.nl" : partner.email;
      const subjectPrefix = isPreview ? "[TEST] " : "";

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
      const emailSubject = `${subjectPrefix}${template?.subject || "Welkom bij het Bureau Vlieland Partner Portaal - Uw digitale werkplek"}`;

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
                  Email: recipientEmail,
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
      .select("id, name, email, auth_user_id, commission_percentage, accommodation_commission_percentage")
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

    const origin = req.headers.get("origin") || "https://bureauvlieland.nl";
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
          subject: "Welkom bij het Bureau Vlieland Partner Portaal - Uw digitale werkplek",
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
