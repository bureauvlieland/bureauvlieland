// Invite a partner: create auth user without password and send a one-time set-password link.
// Uses the DB-managed `partner_invitation` template (single source of truth).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRenderedTemplate,
  getSubjectPrefix,
  getRecipientEmail,
  SENDER_EMAIL,
  SENDER_NAME,
  TemplateIds,
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

interface InviteRequest {
  partnerId: string;
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

    const { partnerId }: InviteRequest = await req.json();
    if (!partnerId) {
      return new Response(JSON.stringify({ error: "Partner ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: partner, error: partnerError } = await adminClient.from("partners").select("*").eq("id", partnerId).maybeSingle();
    if (partnerError || !partner) {
      return new Response(JSON.stringify({ error: "Partner not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (partner.auth_user_id) {
      return new Response(JSON.stringify({ error: "Partner already has an account" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create auth user WITHOUT password — partner sets it via the recovery link.
    let authUser;
    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email: partner.email,
      email_confirm: true,
      user_metadata: { partner_id: partnerId, partner_name: partner.name },
    });

    if (createError) {
      if (createError.code === "email_exists") {
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
          return new Response(JSON.stringify({ error: `Failed to create account: ${retryError.message}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        authUser = retryUser;
      } else {
        return new Response(JSON.stringify({ error: `Failed to create account: ${createError.message}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      authUser = createdUser;
    }

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

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: partner.email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      return new Response(JSON.stringify({ error: "Failed to generate set-password link" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const setPasswordLink = linkData.properties.action_link;

    const rendered = await getRenderedTemplate(TemplateIds.PARTNER_INVITATION, {
      partner_name: partner.name,
      partner_email: partner.email,
      set_password_link: setPasswordLink,
      partner_portal_link: portalLink,
      commission_activity: partner.commission_percentage ?? 10,
      commission_accommodation: partner.accommodation_commission_percentage ?? 10,
    });

    if (!rendered) {
      return new Response(JSON.stringify({ error: "Failed to render invitation template" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let emailSent = false;
    let emailError: string | null = null;
    let mailjetMessageId: string | null = null;
    const subjectPrefix = getSubjectPrefix(origin);
    const emailSubject = `${subjectPrefix}${rendered.subject}`;

    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      const recipient = getRecipientEmail(partner.email, origin);
      const emailResponse = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}` },
        body: JSON.stringify({
          Messages: [{
            From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
            To: [{ Email: recipient, Name: partner.name }],
            Subject: emailSubject,
            HTMLPart: rendered.body,
            TextPart:
`Welkom ${partner.name}!

Je bent uitgenodigd voor het Bureau Vlieland Partner Portaal.

Activeer je account en stel je wachtwoord in via deze persoonlijke link:
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
      subject: emailSubject,
      recipient_email: partner.email,
      recipient_name: partner.name,
      related_partner_id: partnerId,
      status: emailSent ? "sent" : "failed",
      error_message: emailError || undefined,
      mailjet_message_id: mailjetMessageId || undefined,
      sent_by: "invite-partner",
      metadata: {
        template_name: TemplateIds.PARTNER_INVITATION,
        actor: "admin → partner (invitation)",
        method: "set_password_link",
      },
    });

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
      JSON.stringify({ success: true, message: "Partner invited successfully", authUserId: authUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in invite-partner:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
