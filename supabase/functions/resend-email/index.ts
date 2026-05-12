// Using Deno.serve() instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";
import { getSubjectPrefix, getRecipientEmail } from "../_shared/email-templates.ts";


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

    // Partner invitation emails contain one-time set-password links and cannot be replayed.
    // Direct admins to the dedicated 'Stuur set-password link' action which generates a fresh link.
    if (emailLog.email_type === EmailTypes.PARTNER_INVITATION) {
      return new Response(
        JSON.stringify({
          error: "Partneruitnodigingen kunnen niet worden hergestuurd vanuit het log. Gebruik 'Stuur set-password link' op de partnerpagina — dat genereert een nieuwe persoonlijke link.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
                Email: getRecipientEmail(finalRecipient, req.headers.get("origin") || undefined),
                Name: emailLog.recipient_name || finalRecipient,
              },
            ],
            Subject: `${getSubjectPrefix(req.headers.get("origin") || undefined)}${subject}`,
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
        metadata: {
          template_name: emailLog.email_type,
          actor: "admin → resend",
          original_email_id: email_log_id,
          ...metadata,
        },
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
      metadata: {
        template_name: emailLog.email_type,
        actor: "admin → resend",
        original_email_id: email_log_id,
        ...metadata,
      },
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
