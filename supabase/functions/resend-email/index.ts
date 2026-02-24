// Using Deno.serve() instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";
import { getRenderedTemplate, sanitizeHtml, TemplateIds } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY")!;
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY")!;

interface ResendRequest {
  email_log_id: string;
  recipient_email?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email_log_id, recipient_email } = (await req.json()) as ResendRequest;

    // Fetch original email log
    const { data: emailLog, error: fetchError } = await supabase
      .from("email_log")
      .select("*")
      .eq("id", email_log_id)
      .single();

    if (fetchError || !emailLog) {
      throw new Error("Email log niet gevonden");
    }

    // Special-case: partner invitation resends must generate a new temp password.
    // The generic resend-email flow relies on email_log.metadata for variable substitution,
    // but partner invitations deliberately don't store credentials in metadata.
    if (emailLog.email_type === EmailTypes.PARTNER_INVITATION) {
      if (!emailLog.related_partner_id) {
        throw new Error("Deze email heeft geen gekoppelde partner");
      }

      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select("*")
        .eq("id", emailLog.related_partner_id)
        .maybeSingle();

      if (partnerError || !partner) {
        throw new Error("Partner niet gevonden");
      }

      if (!partner.auth_user_id) {
        throw new Error("Partner heeft nog geen account. Gebruik 'Partner uitnodigen'.");
      }

      if (partner.password_set_at) {
        throw new Error("Partner heeft al geactiveerd. Gebruik 'Wachtwoord vergeten'.");
      }

      // Sync auth email with partner.email (prevents reset links/credentials going to an old auth email)
      const { data: authUser } = await supabase.auth.admin.getUserById(partner.auth_user_id);
      if (authUser?.user?.email !== partner.email) {
        const { error: emailUpdateError } = await supabase.auth.admin.updateUserById(partner.auth_user_id, {
          email: partner.email,
          email_confirm: true,
        });
        if (emailUpdateError) {
          throw new Error("Kon partner e-mailadres niet synchroniseren");
        }
      }

      const tempPassword = "Vlieland-" + Math.floor(1000 + Math.random() * 9000);

      const { error: updatePasswordError } = await supabase.auth.admin.updateUserById(partner.auth_user_id, {
        password: tempPassword,
      });
      if (updatePasswordError) {
        throw new Error("Kon tijdelijk wachtwoord niet instellen");
      }

      const origin = req.headers.get("origin") || "https://bureauvlieland.lovable.app";
      const loginLink = `${origin}/partner/login`;
      const portalLink = `${origin}/partner`;

      await supabase
        .from("partners")
        .update({ invited_at: new Date().toISOString() })
        .eq("id", partner.id);

      const templateVariables = {
        partner_name: sanitizeHtml(partner.name),
        partner_email: partner.email,
        partner_password: tempPassword,
        login_link: loginLink,
        partner_portal_link: portalLink,
        commission_activity: String(partner.commission_percentage || 15),
        commission_accommodation: String(partner.accommodation_commission_percentage || 10),
      };

      const template = await getRenderedTemplate(TemplateIds.PARTNER_INVITATION, templateVariables);
      const subject = template?.subject || "Herinnering: Uw Bureau Vlieland Partner Portaal inloggegevens";
      const bodyHtml =
        template?.body ||
        `<p>Beste ${sanitizeHtml(partner.name)},</p>
         <p>Hierbij uw (nieuwe) inloggegevens voor het Bureau Vlieland Partner Portaal:</p>
         <p><strong>Emailadres:</strong> ${sanitizeHtml(partner.email)}<br/>
         <strong>Wachtwoord:</strong> ${sanitizeHtml(tempPassword)}</p>
         <p><a href="${loginLink}">Inloggen op het Portaal</a></p>`;

      const finalRecipient = recipient_email || partner.email;

      const mailjetResponse = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
        },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
              To: [{ Email: finalRecipient, Name: partner.name || finalRecipient }],
              Subject: subject,
              HTMLPart: bodyHtml,
              TextPart: `Beste ${partner.name},\n\nUw (nieuwe) inloggegevens:\n- Emailadres: ${partner.email}\n- Wachtwoord: ${tempPassword}\n- Inloggen: ${loginLink}\n\nWijzig uw wachtwoord na eerste login via Instellingen.`,
            },
          ],
        }),
      });

      const mailjetResult = await mailjetResponse.json();
      const mailjetStatus = mailjetResult.Messages?.[0]?.Status;

      if (mailjetStatus !== "success") {
        const errorMessage = mailjetResult.Messages?.[0]?.Errors?.[0]?.ErrorMessage || "Mailjet error";

        await logEmail({
          email_type: EmailTypes.PARTNER_INVITATION,
          subject,
          recipient_email: finalRecipient,
          recipient_name: partner.name || null,
          related_partner_id: partner.id,
          status: "failed",
          error_message: errorMessage,
          sent_by: "resend-email",
          metadata: { original_email_id: email_log_id, resend: true },
        });

        throw new Error(errorMessage);
      }

      const messageId = mailjetResult.Messages?.[0]?.To?.[0]?.MessageID;

      await logEmail({
        email_type: EmailTypes.PARTNER_INVITATION,
        subject,
        recipient_email: finalRecipient,
        recipient_name: partner.name || null,
        related_partner_id: partner.id,
        status: "sent",
        mailjet_message_id: messageId?.toString(),
        sent_by: "resend-email",
        metadata: { original_email_id: email_log_id, resend: true },
      });

      return new Response(JSON.stringify({ success: true, message_id: messageId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch template for this email type
    const { data: template } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", emailLog.email_type)
      .single();

    if (!template || !template.is_active) {
      throw new Error("Email template niet gevonden of inactief");
    }

    // Use custom recipient or original
    const finalRecipient = recipient_email || emailLog.recipient_email;

    // Get metadata for variable substitution
    const metadata = emailLog.metadata || {};

    // Substitute variables in subject and body
    let subject = template.subject;
    let bodyHtml = template.body_html;

    const variables = metadata as Record<string, string>;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      subject = subject.replace(regex, value?.toString() || "");
      bodyHtml = bodyHtml.replace(regex, value?.toString() || "");
    });

    // Handle conditionals {{#if variable}}...{{/if}}
    bodyHtml = bodyHtml.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_match: string, variable: string, content: string) => {
        return variables[variable] ? content : "";
      }
    );

    // Send via Mailjet
    const mailjetResponse = await fetch("https://api.mailjet.com/v3.1/send", {
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
                Email: finalRecipient,
                Name: emailLog.recipient_name || finalRecipient,
              },
            ],
            Subject: subject,
            HTMLPart: bodyHtml,
          },
        ],
      }),
    });

    const mailjetResult = await mailjetResponse.json();
    const mailjetStatus = mailjetResult.Messages?.[0]?.Status;

    if (mailjetStatus !== "success") {
      const errorMessage = mailjetResult.Messages?.[0]?.Errors?.[0]?.ErrorMessage || "Mailjet error";
      
      // Log failed attempt
      await logEmail({
        email_type: emailLog.email_type,
        subject: subject,
        recipient_email: finalRecipient,
        recipient_name: emailLog.recipient_name || null,
        related_request_id: emailLog.related_request_id || undefined,
        related_accommodation_id: emailLog.related_accommodation_id || undefined,
        related_partner_id: emailLog.related_partner_id || undefined,
        status: "failed",
        error_message: errorMessage,
        sent_by: "resend-email",
        metadata: { original_email_id: email_log_id, ...metadata },
      });

      throw new Error(errorMessage);
    }

    const messageId = mailjetResult.Messages?.[0]?.To?.[0]?.MessageID;

    // Log successful resend
    await logEmail({
      email_type: emailLog.email_type,
      subject: subject,
      recipient_email: finalRecipient,
      recipient_name: emailLog.recipient_name || null,
      related_request_id: emailLog.related_request_id || undefined,
      related_accommodation_id: emailLog.related_accommodation_id || undefined,
      related_partner_id: emailLog.related_partner_id || undefined,
      status: "sent",
      mailjet_message_id: messageId?.toString(),
      sent_by: "resend-email",
      metadata: { original_email_id: email_log_id, ...metadata },
    });

    return new Response(
      JSON.stringify({ success: true, message_id: messageId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Resend email error:", error);
    const errorMessage = error instanceof Error ? error.message : "Er ging iets mis";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
