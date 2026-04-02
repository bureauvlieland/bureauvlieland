import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getRenderedTemplate,
  SENDER_EMAIL,
  SENDER_NAME,
  getPortalBaseUrl,
  getSubjectPrefix,
  getRecipientEmail,
  formatCurrencyNL,
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "erwin@bureauvlieland.nl";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId } = await req.json();

    if (!quoteId) {
      return new Response(
        JSON.stringify({ error: "quoteId is verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the quote with request and partner data
    const { data: quote, error: quoteError } = await supabase
      .from("accommodation_quotes")
      .select(`
        id,
        accommodation_name,
        price_total,
        partner_id,
        request_id,
        partner:partners(id, name, email),
        request:accommodation_requests(
          id,
          customer_name,
          customer_company,
          reference_number,
          linked_program_id
        )
      `)
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      console.error("Quote error:", quoteError);
      return new Response(
        JSON.stringify({ error: "Offerte niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const partner = quote.partner as { id: string; name: string; email: string } | null;
    const request = quote.request as { 
      id: string; 
      customer_name: string; 
      customer_company: string | null;
      reference_number: string | null;
      linked_program_id: string | null;
    } | null;

    if (!partner || !request) {
      return new Response(
        JSON.stringify({ error: "Partner of aanvraag niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerDisplay = request.customer_company || request.customer_name;
    const refPrefix = request.reference_number ? ` (${request.reference_number})` : "";

    // Check if auto-todo already exists
    const { data: existingTodo } = await supabase
      .from("admin_todos")
      .select("id")
      .eq("auto_type", "quote_review")
      .eq("auto_entity_id", quoteId)
      .neq("status", "done")
      .maybeSingle();

    if (existingTodo) {
      console.log(`Auto todo already exists for quote ${quoteId}`);
      return new Response(
        JSON.stringify({ success: true, todo_id: existingTodo.id, existing: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the auto-todo
    const { data: todo, error: todoError } = await supabase
      .from("admin_todos")
      .insert({
        title: `Nieuwe logiesofferte: ${partner.name} voor ${customerDisplay}${refPrefix}`,
        description: `Partner ${partner.name} heeft een offerte ingediend voor "${quote.accommodation_name}" (€${quote.price_total.toLocaleString()}). Beoordeel de offerte en stuur deze door naar de klant.`,
        priority: "normal",
        status: "todo",
        related_request_id: request.linked_program_id || null,
        related_partner_id: partner.id,
        auto_type: "quote_review",
        auto_entity_id: quoteId,
      })
      .select("id")
      .single();

    if (todoError) {
      console.error("Error creating todo:", todoError);
      return new Response(
        JSON.stringify({ error: "Kon todo niet aanmaken" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Created quote_review todo for quote ${quoteId}: ${todo.id}`);

    // Send email notification to admin
    try {
      const origin = req.headers.get("origin") || "";
      const baseUrl = getPortalBaseUrl(origin);
      const adminUrl = `${baseUrl}/admin/accommodation/${request.id}`;
      const priceFormatted = formatCurrencyNL(quote.price_total);

      const templateVars = {
        partner_name: partner.name,
        accommodation_name: quote.accommodation_name,
        customer_name: customerDisplay,
        reference_number: request.reference_number || "",
        price_total: priceFormatted,
        admin_url: adminUrl,
      };

      // Try database template first, fallback to inline HTML
      const rendered = await getRenderedTemplate("accommodation_quote_notification_admin", templateVars);

      const subjectPrefix = getSubjectPrefix(origin);
      const subject = rendered
        ? `${subjectPrefix}${rendered.subject}`
        : `${subjectPrefix}Nieuwe logiesofferte van ${partner.name} voor ${customerDisplay}`;

      const body = rendered
        ? rendered.body
        : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">Nieuwe logiesofferte ontvangen</h2>
            <p>Partner <strong>${partner.name}</strong> heeft een offerte ingediend:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px 0; color: #666;">Accommodatie</td><td style="padding: 8px 0;"><strong>${quote.accommodation_name}</strong></td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Klant</td><td style="padding: 8px 0;"><strong>${customerDisplay}</strong></td></tr>
              ${request.reference_number ? `<tr><td style="padding: 8px 0; color: #666;">Referentie</td><td style="padding: 8px 0;">${request.reference_number}</td></tr>` : ""}
              <tr><td style="padding: 8px 0; color: #666;">Totaalprijs</td><td style="padding: 8px 0;"><strong>${priceFormatted}</strong></td></tr>
            </table>
            <a href="${adminUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 8px;">Bekijk offerte in admin</a>
          </div>
        `;

      // Send via Mailjet
      const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
      const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

      if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
        const recipientEmail = getRecipientEmail(ADMIN_EMAIL, origin);

        const mailjetResponse = await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
          },
          body: JSON.stringify({
            Messages: [
              {
                From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
                To: [{ Email: recipientEmail, Name: "Bureau Vlieland" }],
                Subject: subject,
                HTMLPart: body,
              },
            ],
          }),
        });

        const mailjetResult = await mailjetResponse.json();
        const messageId = mailjetResult?.Messages?.[0]?.To?.[0]?.MessageID?.toString() || null;

        await logEmail({
          email_type: "accommodation_quote_notification_admin",
          subject,
          recipient_email: recipientEmail,
          recipient_name: "Bureau Vlieland",
          related_accommodation_id: request.id,
          related_partner_id: partner.id,
          status: mailjetResponse.ok ? "sent" : "failed",
          error_message: mailjetResponse.ok ? undefined : JSON.stringify(mailjetResult),
          mailjet_message_id: messageId || undefined,
          sent_by: "system",
        });

        console.log(`Admin notification email ${mailjetResponse.ok ? "sent" : "failed"} for quote ${quoteId}`);
      } else {
        console.warn("Mailjet keys not configured, skipping admin notification email");
      }
    } catch (emailError) {
      // Don't fail the whole request if email fails
      console.error("Error sending admin notification email:", emailError);
    }

    return new Response(
      JSON.stringify({ success: true, todo_id: todo.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-quote-review-todo:", error);
    return new Response(
      JSON.stringify({ error: "Interne fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
