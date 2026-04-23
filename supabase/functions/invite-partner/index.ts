// Invite a partner: create auth user without password and send a one-time set-password link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeHtml } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

interface InviteRequest {
  partnerId: string;
}

function getInvitationHtml(partnerName: string, partnerEmail: string, setPasswordLink: string, portalLink: string): string {
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
      Om uw account te activeren, stelt u eenmalig zelf een wachtwoord in via onderstaande knop. De link is persoonlijk en beperkt geldig.
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

    <div style="background: #e8f0f8; border-radius: 8px; padding: 25px; margin: 0 0 25px 0;">
      <h3 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 17px;">📋 Hoe werkt het?</h3>
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">
        <strong>1. Klanten stellen hun programma samen</strong><br>
        Via onze online configurator kiezen gasten activiteiten, catering en logies voor hun verblijf op Vlieland.
      </p>
      <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">
        <strong>2. U ontvangt automatisch een aanvraag</strong><br>
        Wanneer een klant uw diensten selecteert, krijgt u direct bericht met alle relevante details.
      </p>
      <p style="margin: 0; color: #374151; font-size: 14px;">
        <strong>3. U reageert via het portaal</strong><br>
        Met één klik bevestigt u de aanvraag, stelt u een alternatief voor, of geeft u aan dat u niet beschikbaar bent.
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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const { partnerId }: InviteRequest = await req.json();
    if (!partnerId) {
      return new Response(
        JSON.stringify({ error: "Partner ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Create auth user WITHOUT password — partner sets it via the recovery link.
    let authUser;
    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email: partner.email,
      email_confirm: true, // skip extra confirmation; recovery link is the activation
      user_metadata: {
        partner_id: partnerId,
        partner_name: partner.name,
      },
    });

    if (createError) {
      if (createError.code === "email_exists") {
        console.log("Existing auth user found for email, cleaning up orphaned account...");
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        const existingUser = users?.find((u) => u.email === partner.email);
        if (existingUser) {
          await adminClient.from("user_roles").delete().eq("user_id", existingUser.id);
          await adminClient.auth.admin.deleteUser(existingUser.id);
        }
        const { data: retryUser, error: retryError } = await adminClient.auth.admin.createUser({
          email: partner.email,
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

    // Link auth user and record invitation timestamp (no plaintext password is ever stored).
    const { error: updateError } = await adminClient
      .from("partners")
      .update({ auth_user_id: authUser.user.id, invited_at: new Date().toISOString() })
      .eq("id", partnerId);
    if (updateError) console.error("Error linking partner:", updateError);

    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: authUser.user.id, role: "partner" });
    if (roleError) console.error("Error adding partner role:", roleError);

    const origin = req.headers.get("origin") || "https://bureauvlieland.nl";
    const portalLink = `${origin}/partner`;
    const redirectTo = "https://bureauvlieland.nl/partner/reset-password";

    // Generate a one-time recovery link the partner uses to set their first password.
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: partner.email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Failed to generate set-password link:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to generate set-password link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const setPasswordLink = linkData.properties.action_link;

    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      const emailHtml = getInvitationHtml(partner.name, partner.email, setPasswordLink, portalLink);
      const emailSubject = "Welkom bij het Bureau Vlieland Partner Portaal — Stel uw wachtwoord in";

      const emailResponse = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
        },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
              To: [{ Email: partner.email, Name: partner.name }],
              Subject: emailSubject,
              HTMLPart: emailHtml,
              TextPart:
`Welkom ${partner.name}!

U bent uitgenodigd voor het Bureau Vlieland Partner Portaal.

Activeer uw account en stel uw wachtwoord in via deze persoonlijke link:
${setPasswordLink}

Inloggen kan daarna op: ${portalLink}/login

Vragen? Neem contact op via erwin@bureauvlieland.nl

Met vriendelijke groet,
Erwin Soolsma
Bureau Vlieland`,
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

    await adminClient.from("admin_activity_log").insert({
      user_id: userId,
      action: "partner_invited",
      entity_type: "partner",
      entity_id: partnerId,
      details: {
        partner_name: partner.name,
        partner_email: partner.email,
        auth_user_id: authUser.user.id,
        method: "set_password_link",
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
