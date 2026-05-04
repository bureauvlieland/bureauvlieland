import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail } from "../_shared/email-logger.ts";
import {
  SENDER_EMAIL,
  SENDER_NAME,
  sanitizeHtml,
  getRecipientEmail,
  getSubjectPrefix,
} from "../_shared/email-templates.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify partner JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { quoteId, subject, message } = await req.json();
    if (!quoteId || !subject?.trim() || !message?.trim()) {
      return new Response(JSON.stringify({ error: "quoteId, subject en message verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (subject.length > 200 || message.length > 5000) {
      return new Response(JSON.stringify({ error: "Onderwerp/bericht te lang" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get partner id for this user
    const { data: partner } = await admin
      .from("partners")
      .select("id, name, email, contact_email")
      .eq("auth_user_id", userData.user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!partner) {
      return new Response(JSON.stringify({ error: "Partner niet gevonden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify quote belongs to this partner
    const { data: quote } = await admin
      .from("accommodation_quotes")
      .select("id, request_id, accommodation_name, partner_id")
      .eq("id", quoteId)
      .maybeSingle();
    if (!quote || quote.partner_id !== partner.id) {
      return new Response(JSON.stringify({ error: "Offerte niet gevonden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lookup program + customer for reply addressing
    const { data: accReq } = await admin
      .from("accommodation_requests")
      .select("id, linked_program_id")
      .eq("id", quote.request_id)
      .maybeSingle();
    if (!accReq?.linked_program_id) {
      return new Response(JSON.stringify({ error: "Geen klantkoppeling gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: program } = await admin
      .from("program_requests")
      .select("id, customer_email, customer_name, customer_company, customer_token, reference_number, invoicing_mode")
      .eq("id", accReq.linked_program_id)
      .maybeSingle();
    if (!program?.customer_email) {
      return new Response(JSON.stringify({ error: "Klant-e-mail niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || undefined;
    const recipient = getRecipientEmail(program.customer_email, origin);
    const subjectPrefix = getSubjectPrefix(origin);
    const customerDisplayName = program.customer_company || program.customer_name;
    const sanitizedMessage = sanitizeHtml(message).replace(/\n/g, "<br>");

    const replyToEmail = program.reference_number
      ? `reply+${program.reference_number}@reply.bureauvlieland.nl`
      : "hallo@bureauvlieland.nl";

    const portalUrl = `https://bureauvlieland.nl/klant/${program.customer_token}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${sanitizeHtml(quote.accommodation_name)}</h1>
        </div>
        <div style="padding: 24px; line-height: 1.6; color: #333;">
          <p>Beste ${sanitizeHtml(customerDisplayName)},</p>
          <p><strong>${sanitizeHtml(quote.accommodation_name)}</strong> heeft een bericht voor u over uw verblijf:</p>
          <div style="background: #f8fafc; border-left: 4px solid #1e3a5f; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px; font-weight: 600;">${sanitizeHtml(subject)}</p>
            <p style="margin: 0;">${sanitizedMessage}</p>
          </div>
          <p style="font-size: 14px; color: #666; padding: 12px; background: #fef9e7; border-left: 3px solid #f59e0b; border-radius: 4px;">
            <strong>U kunt direct antwoorden op deze e-mail.</strong> Uw reactie komt automatisch terecht bij ${sanitizeHtml(quote.accommodation_name)} en wordt gelogd in uw <a href="${portalUrl}" style="color:#0066cc;">programma-overzicht</a>.
          </p>
        </div>
      </div>
    `;

    const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: SENDER_EMAIL, Name: `${quote.accommodation_name} via Bureau Vlieland` },
            To: [{ Email: recipient, Name: customerDisplayName }],
            Bcc: [{ Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" }],
            ReplyTo: { Email: replyToEmail, Name: quote.accommodation_name },
            Subject: `${subjectPrefix}${subject}`,
            HTMLPart: htmlBody,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mailjet error:", errorText);
      throw new Error("EMAIL_SERVICE_ERROR");
    }

    await admin.from("project_communications").insert({
      request_id: program.id,
      accommodation_id: accReq.id,
      communication_type: "email_out",
      direction: "outbound",
      audience: "customer_partner",
      subject,
      content: message,
      contact_name: customerDisplayName,
      contact_email: recipient,
      communication_date: new Date().toISOString(),
      metadata: { sender: "partner", partner_id: partner.id },
    });

    await logEmail({
      email_type: "partner_customer_message",
      subject,
      recipient_email: recipient,
      recipient_name: customerDisplayName,
      related_request_id: program.id,
      related_accommodation_id: accReq.id,
      related_partner_id: partner.id,
      status: "sent",
      sent_by: `partner:${partner.id}`,
      metadata: { message_preview: message.substring(0, 200) },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-partner-customer-message error:", err);
    return new Response(JSON.stringify({ error: "Kon bericht niet versturen" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
