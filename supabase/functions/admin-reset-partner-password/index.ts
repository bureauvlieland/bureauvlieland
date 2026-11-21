// Admin "reset password": send the partner a fresh one-time set-password link.
// No plaintext password is generated or stored anywhere.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sanitizeHtml,
  getSubjectPrefix,
  getRecipientEmail,
  getRenderedTemplate,
  wrapEmailHtml,
  TemplateIds,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

import { extractMessageIds } from "../_shared/mailjet-send.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

// Noodrem als de DB-template partner_password_reset niet laadt: dezelfde
// tekst als de admin-variant van die template (migratie 20261121160000).
function getResetFallbackHtml(partnerName: string, setPasswordLink: string): string {
  return `
<h2 style="color:#0F4C5C;margin:0 0 16px;">Nieuwe link voor je wachtwoord</h2>
<p>Hoi ${sanitizeHtml(partnerName)},</p>
<p>Bureau Vlieland heeft een nieuwe link voor je aangemaakt om je wachtwoord voor het partnerportaal in te stellen. Klik op de knop om een nieuw wachtwoord in te stellen:</p>
<div style="text-align:center;margin:32px 0;">
  <a href="${setPasswordLink}" style="display:inline-block;background-color:#0F4C5C;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;">Wachtwoord instellen</a>
</div>
<p style="font-size:14px;color:#666;">Deze link is persoonlijk en 1 uur geldig.</p>
<p style="font-size:12px;color:#999;word-break:break-all;">Werkt de knop niet? Kopieer dan deze link:<br><a href="${setPasswordLink}" style="color:#0F4C5C;">${setPasswordLink}</a></p>
<p style="margin:24px 0 0;">Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
  `;
}

Deno.serve(async (req) => {
  let mailjetMessageId: string | null = null;
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { partnerId } = await req.json();
    if (!partnerId) {
      return new Response(JSON.stringify({ error: "partnerId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: partner, error: partnerError } = await adminClient
      .from("partners")
      .select("id, name, email, contact_email, auth_user_id")
      .eq("id", partnerId)
      .maybeSingle();

    if (partnerError || !partner) {
      return new Response(JSON.stringify({ error: "Partner not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!partner.auth_user_id) {
      return new Response(JSON.stringify({ error: "Partner has no login account yet. Invite them first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate a fresh one-time set-password link.
    const redirectTo = "https://bureauvlieland.nl/partner/reset-password";
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

    // Reset password_set_at so the partner shows as "pending activation" again.
    await adminClient
      .from("partners")
      .update({ password_set_at: null, invited_at: new Date().toISOString() })
      .eq("id", partnerId);

    const origin = req.headers.get("origin") || undefined;
    const subjectPrefix = getSubjectPrefix(origin);
    const originalRecipient = partner.contact_email || partner.email;
    const recipientEmail = getRecipientEmail(originalRecipient, origin);
    // Dezelfde DB-template als send-partner-reset-email, met de admin-variant
    // ({{#if admin_initiated}}): één tekst voor één sleutel.
    const rendered = await getRenderedTemplate(TemplateIds.PARTNER_PASSWORD_RESET, {
      partner_name: sanitizeHtml(partner.name),
      reset_link: setPasswordLink,
      admin_initiated: "1",
    }, {
      partner_name: partner.name,
      reset_link: setPasswordLink,
      admin_initiated: "1",
    });
    const subject = `${subjectPrefix}${rendered?.subject ?? "Nieuwe link om je wachtwoord in te stellen — partnerportaal Bureau Vlieland"}`;
    const htmlPart = rendered?.body ?? await wrapEmailHtml(getResetFallbackHtml(partner.name, setPasswordLink), adminClient);

    let emailSent = false;
    let emailError: string | null = null;

    if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
      const emailResponse = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}` },
        body: JSON.stringify({
          Messages: [{ TrackClicks: "disabled", TrackOpens: "enabled",
            From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
            To: [{ Email: recipientEmail, Name: partner.name }],
            Subject: subject,
            HTMLPart: htmlPart,
            TextPart:
`Hoi ${partner.name},

Bureau Vlieland heeft een nieuwe link voor je aangemaakt om je wachtwoord voor het partnerportaal in te stellen:

${setPasswordLink}

Deze link is persoonlijk en 1 uur geldig.

Met vriendelijke groet,
Bureau Vlieland`,
          }],
        }),
      });
      try { mailjetMessageId = extractMessageIds(await emailResponse.clone().text())[0] ?? null; } catch { /* body already consumed or non-JSON */ }

      if (!emailResponse.ok) {
        emailError = await emailResponse.text();
        console.error("Mailjet error:", emailError);
      } else {
        emailSent = true;
      }
    } else {
      emailError = "Mailjet credentials not configured";
    }

    await logEmail({
      mailjet_message_id: mailjetMessageId ?? undefined,
      email_type: "partner_password_reset",
      subject,
      recipient_email: recipientEmail,
      recipient_name: partner.name,
      related_partner_id: partnerId,
      status: emailSent ? "sent" : "failed",
      error_message: emailError || undefined,
      sent_by: "admin-reset-partner-password",
      metadata: {
        template_name: "partner_password_reset",
        actor: "admin → partner",
        initiated_by_admin: true,
        method: "set_password_link",
      },
    });

    await adminClient.from("admin_activity_log").insert({
      user_id: user.id,
      action: "partner_password_reset",
      entity_type: "partner",
      entity_id: partnerId,
      details: { partner_name: partner.name, method: "set_password_link" },
    });

    console.log(`Admin ${user.id} sent set-password link to partner ${partner.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Set-password link sent to ${recipientEmail}`,
        emailSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-reset-partner-password:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
