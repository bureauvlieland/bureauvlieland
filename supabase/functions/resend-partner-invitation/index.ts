// Resend partner invitation: regenerate a one-time set-password link.
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

interface ResendRequest {
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
        return new Response(JSON.stringify({ error: "Failed to sync auth email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

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

    await adminClient.from("partners").update({ invited_at: new Date().toISOString() }).eq("id", partnerId);

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
    // Use a "herinnering" subject for resends — overrides the DB template's first-invite subject.
    const subject = `${subjectPrefix}Herinnering: activeer je Bureau Vlieland Partner Portaal account`;

    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      const emailResponse = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}` },
        body: JSON.stringify({
          Messages: [{
            From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
            To: [{ Email: getRecipientEmail(partner.email, origin), Name: partner.name }],
            Subject: subject,
            HTMLPart: rendered.body,
            TextPart:
`Beste ${partner.name},

Je hebt je account voor het Bureau Vlieland Partner Portaal nog niet geactiveerd.

Stel hier eenmalig je wachtwoord in:
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
      metadata: {
        template_name: TemplateIds.PARTNER_INVITATION,
        actor: "admin → partner (resend invitation)",
        resend: true,
        method: "set_password_link",
      },
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
