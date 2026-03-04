import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail } from "../_shared/email-logger.ts";
import {
  SENDER_EMAIL,
  SENDER_NAME,
  sanitizeHtml,
  formatDateNL,
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { customerToken, quoteId, subject, message } = await req.json();
    const origin = req.headers.get("origin") || undefined;

    // Validate input
    if (!customerToken || !quoteId || !subject?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "customerToken, quoteId, subject en message zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (subject.length > 200) {
      return new Response(
        JSON.stringify({ error: "Onderwerp mag maximaal 200 tekens zijn" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Bericht mag maximaal 5000 tekens zijn" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate customer token
    const { data: programRequest, error: prError } = await supabase
      .from("program_requests")
      .select("id, customer_name, customer_email, customer_phone, customer_company, linked_accommodation_id, expires_at")
      .eq("customer_token", customerToken)
      .maybeSingle();

    if (prError || !programRequest) {
      return new Response(
        JSON.stringify({ error: "Ongeldig token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(programRequest.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Dit programma is verlopen" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the quote with partner info
    const { data: quote, error: qError } = await supabase
      .from("accommodation_quotes")
      .select("id, accommodation_name, status, request_id, partner_id")
      .eq("id", quoteId)
      .eq("status", "selected")
      .maybeSingle();

    if (qError || !quote) {
      return new Response(
        JSON.stringify({ error: "Offerte niet gevonden of niet geselecteerd" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify quote belongs to accommodation linked to this program
    const { data: accRequest } = await supabase
      .from("accommodation_requests")
      .select("id, arrival_date, departure_date, linked_program_id")
      .eq("id", quote.request_id)
      .maybeSingle();

    if (!accRequest || accRequest.linked_program_id !== programRequest.id) {
      return new Response(
        JSON.stringify({ error: "Offerte hoort niet bij dit programma" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get partner email
    const { data: partner } = await supabase
      .from("partners")
      .select("email, contact_email, name, booking_contact_name")
      .eq("id", quote.partner_id)
      .maybeSingle();

    if (!partner?.email) {
      return new Response(
        JSON.stringify({ error: "Contactgegevens accommodatie niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email HTML
    const sanitizedMessage = sanitizeHtml(message).replace(/\n/g, "<br>");
    const arrivalFormatted = formatDateNL(accRequest.arrival_date);
    const departureFormatted = formatDateNL(accRequest.departure_date);

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Bureau Vlieland</h1>
        </div>
        <div style="padding: 24px; line-height: 1.6; color: #333;">
          <p>Beste ${sanitizeHtml(partner.booking_contact_name || partner.name)},</p>
          <p><strong>${sanitizeHtml(programRequest.customer_name)}</strong> heeft een bericht over de reservering bij <strong>${sanitizeHtml(quote.accommodation_name)}</strong> voor ${arrivalFormatted} t/m ${departureFormatted}.</p>
          <div style="background: #f8fafc; border-left: 4px solid #1e3a5f; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #1e3a5f;">${sanitizeHtml(subject)}</p>
            <p style="margin: 0;">${sanitizedMessage}</p>
          </div>
          <p style="font-size: 14px; color: #666;">U kunt direct antwoorden op deze e-mail — uw reactie gaat naar de klant.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;">
        <div style="padding: 16px 24px; color: #666; font-size: 13px; background: #f8fafc;">
          <p style="margin: 0 0 4px;"><strong>Contactgegevens klant:</strong></p>
          <p style="margin: 0;">
            ${sanitizeHtml(programRequest.customer_name)}${programRequest.customer_company ? ` — ${sanitizeHtml(programRequest.customer_company)}` : ""}<br>
            📧 <a href="mailto:${sanitizeHtml(programRequest.customer_email)}" style="color: #0066cc;">${sanitizeHtml(programRequest.customer_email)}</a><br>
            📞 ${sanitizeHtml(programRequest.customer_phone)}
          </p>
        </div>
        <div style="padding: 16px 24px; color: #999; font-size: 12px;">
          <p style="margin: 0;">Verstuurd via Bureau Vlieland &nbsp;|&nbsp; <a href="mailto:hallo@bureauvlieland.nl" style="color: #0066cc;">hallo@bureauvlieland.nl</a></p>
        </div>
      </div>
    `;

    const recipientEmail = getRecipientEmail(partner.contact_email || partner.email, origin);
    const subjectPrefix = getSubjectPrefix(origin);

    // Send via Mailjet
    const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
            To: [{ Email: recipientEmail, Name: partner.name }],
            Bcc: [{ Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" }],
            ReplyTo: { Email: programRequest.customer_email, Name: programRequest.customer_name },
            Subject: `${subjectPrefix}${subject}`,
            HTMLPart: htmlBody,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mailjet error:", errorText);

      await logEmail({
        email_type: "customer_accommodation_message",
        subject,
        recipient_email: recipientEmail,
        recipient_name: partner.name,
        related_request_id: programRequest.id,
        related_accommodation_id: accRequest.id,
        related_partner_id: quote.partner_id,
        status: "failed",
        error_message: errorText.substring(0, 500),
        sent_by: `customer:${programRequest.customer_email}`,
      });

      throw new Error("EMAIL_SERVICE_ERROR");
    }

    // Log email
    await logEmail({
      email_type: "customer_accommodation_message",
      subject,
      recipient_email: recipientEmail,
      recipient_name: partner.name,
      related_request_id: programRequest.id,
      related_accommodation_id: accRequest.id,
      related_partner_id: quote.partner_id,
      status: "sent",
      sent_by: `customer:${programRequest.customer_email}`,
      metadata: { message_preview: message.substring(0, 200) },
    });

    // Log as project communication
    await supabase.from("project_communications").insert({
      request_id: programRequest.id,
      accommodation_id: accRequest.id,
      communication_type: "email_out",
      direction: "outbound",
      subject,
      content: message,
      contact_name: partner.name,
      contact_email: recipientEmail,
      communication_date: new Date().toISOString(),
    });

    console.log("Customer accommodation message sent to", recipientEmail);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-customer-accommodation-message:", error);
    return new Response(
      JSON.stringify({ error: "Er kon geen bericht worden verstuurd. Probeer het later opnieuw." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
