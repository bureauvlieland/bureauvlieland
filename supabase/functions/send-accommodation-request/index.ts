// Using Deno.serve() instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";
import { 
  getRenderedTemplate, 
  sanitizeHtml, 
  formatDateNL, 
  isTestMode, 
  getSubjectPrefix,
  TemplateIds 
} from "../_shared/email-templates.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sendEmailViaMailjet = async (messages: any[]) => {
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);
  
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Messages: messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Mailjet API error:", errorText);
    throw new Error("EMAIL_SERVICE_ERROR");
  }

  return await response.json();
};

// Fallback templates if database templates not found
function getFallbackBureauHtml(request: any, typeLabels: Record<string, string>, budgetLabels: Record<string, string>): string {
  const safeName = sanitizeHtml(request.customer_name);
  const safeCompany = sanitizeHtml(request.customer_company);
  const safePhone = sanitizeHtml(request.customer_phone);
  const safeSpecialRequests = sanitizeHtml(request.special_requests);
  const budgetDisplay = request.budget_range ? (budgetLabels[request.budget_range] || request.budget_range) : "";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
        Nieuwe Logies Aanvraag
      </h2>
      
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2d3748;">📋 Klantgegevens</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 5px 0; color: #666;">Naam:</td><td><strong>${safeName}</strong></td></tr>
          ${safeCompany ? `<tr><td style="padding: 5px 0; color: #666;">Bedrijf:</td><td><strong>${safeCompany}</strong></td></tr>` : ''}
          <tr><td style="padding: 5px 0; color: #666;">Email:</td><td><a href="mailto:${request.customer_email}">${request.customer_email}</a></td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Telefoon:</td><td>${safePhone}</td></tr>
        </table>
      </div>
      
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2d3748;">📅 Verblijf Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 5px 0; color: #666;">Aankomst:</td><td><strong>${formatDateNL(request.arrival_date)}</strong></td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Vertrek:</td><td><strong>${formatDateNL(request.departure_date)}</strong></td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Aantal gasten:</td><td><strong>${request.number_of_guests}</strong></td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Type:</td><td>${typeLabels[request.accommodation_type] || request.accommodation_type}</td></tr>
          ${request.room_count ? `<tr><td style="padding: 5px 0; color: #666;">Kamers:</td><td>${request.room_count}</td></tr>` : ''}
          ${budgetDisplay ? `<tr><td style="padding: 5px 0; color: #666;">Budget:</td><td>${budgetDisplay}</td></tr>` : ''}
        </table>
      </div>
      
      ${safeSpecialRequests ? `
      <div style="background: #fff8e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f6ad55;">
        <h3 style="margin-top: 0; color: #c05621;">💬 Bijzondere wensen</h3>
        <p style="margin-bottom: 0; white-space: pre-line;">${safeSpecialRequests}</p>
      </div>
      ` : ''}
      
      <p style="margin-top: 30px;">
        <a href="https://bureauvlieland.nl/admin/logies/${request.id}" 
           style="display: inline-block; background-color: #1a365d; color: white; 
                  padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Bekijk in admin →
        </a>
      </p>
    </div>
  `;
}

function getFallbackCustomerHtml(request: any, typeLabels: Record<string, string>, portalUrl: string): string {
  const safeName = sanitizeHtml(request.customer_name);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f766e;">Beste ${safeName},</h2>
      
      <p>Bedankt voor uw logies aanvraag bij Bureau Vlieland!</p>
      
      <p>Wij hebben uw aanvraag goed ontvangen en gaan op zoek naar de beste accommodatie voor uw groep. 
         <strong>Binnen enkele werkdagen</strong> ontvangt u één of meerdere offertes van geschikte accommodaties.</p>
      
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
        <h3 style="margin-top: 0; color: #166534;">📋 Uw aanvraag</h3>
        <ul style="padding-left: 20px; margin-bottom: 0;">
          <li><strong>Aankomst:</strong> ${formatDateNL(request.arrival_date)}</li>
          <li><strong>Vertrek:</strong> ${formatDateNL(request.departure_date)}</li>
          <li><strong>Aantal gasten:</strong> ${request.number_of_guests}</li>
          <li><strong>Type accommodatie:</strong> ${typeLabels[request.accommodation_type] || request.accommodation_type}</li>
        </ul>
      </div>
      
      <div style="background-color: #edf2f7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h3 style="margin-top: 0; color: #2d3748;">📊 Volg uw aanvraag</h3>
        <p style="color: #4a5568;">
          Bekijk de status van uw aanvraag en vergelijk offertes in uw persoonlijke omgeving:
        </p>
        <a href="${portalUrl}" 
           style="display: inline-block; background-color: #0f766e; color: white; 
                  padding: 12px 24px; border-radius: 6px; text-decoration: none; 
                  font-weight: bold; margin-top: 10px;">
          Bekijk uw aanvraag →
        </a>
        <p style="color: #718096; font-size: 12px; margin-top: 15px;">
          Deze link is persoonlijk en 90 dagen geldig.
        </p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      
      <p>Heeft u nog vragen? Neem gerust contact met ons op:</p>
      <ul style="list-style: none; padding: 0;">
        <li>📧 Email: <a href="mailto:hallo@bureauvlieland.nl" style="color: #0066cc;">hallo@bureauvlieland.nl</a></li>
        <li>📞 Telefoon: +31 (0)562 45 27 00</li>
      </ul>
      
      <p style="margin-top: 30px;">Met vriendelijke groet,<br><strong>Erwin & Team Bureau Vlieland</strong></p>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accommodationRequestId } = await req.json();

    if (!accommodationRequestId) {
      return new Response(
        JSON.stringify({ error: "accommodationRequestId is verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the accommodation request with linked program
    const { data: request, error: requestError } = await supabase
      .from("accommodation_requests")
      .select(`
        *,
        linked_program:program_requests!accommodation_requests_linked_program_id_fkey(customer_token)
      `)
      .eq("id", accommodationRequestId)
      .single();

    if (requestError || !request) {
      console.error("Request error:", requestError);
      return new Response(
        JSON.stringify({ error: "Aanvraag niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get origin for test mode
    const origin = req.headers.get("origin") || "";
    const subjectPrefix = getSubjectPrefix(origin);

    // Always use the program token for the portal URL (unified customer experience)
    const programToken = request.linked_program?.customer_token;
    const portalUrl = programToken 
      ? `https://bureauvlieland.nl/mijn-programma/${programToken}`
      : `https://bureauvlieland.nl/mijn-logies/${request.customer_token}`;

    // Format accommodation type
    const typeLabels: Record<string, string> = {
      hotel: "Hotel",
      vacation_home: "Vakantiewoning",
      vakantiehuis: "Vakantiehuis",
      groepsaccommodatie: "Groepsaccommodatie",
      group_accommodation: "Groepsaccommodatie",
      camping: "Camping",
      no_preference: "Geen voorkeur",
    };

    // Format budget labels
    const budgetLabels: Record<string, string> = {
      "50-75": "€50 - €75 p.p.p.n.",
      "75-100": "€75 - €100 p.p.p.n.",
      "100-150": "€100 - €150 p.p.p.n.",
      "150+": "€150+ p.p.p.n.",
      "no_max": "Geen maximum",
    };

    // Prepare template variables
    const templateVariables = {
      customer_name: sanitizeHtml(request.customer_name),
      company_name: sanitizeHtml(request.customer_company) || "",
      customer_email: request.customer_email,
      customer_phone: sanitizeHtml(request.customer_phone),
      arrival_date: formatDateNL(request.arrival_date),
      departure_date: formatDateNL(request.departure_date),
      number_of_guests: String(request.number_of_guests),
      accommodation_type: typeLabels[request.accommodation_type] || request.accommodation_type,
      room_count: request.room_count ? String(request.room_count) : "",
      budget_range: request.budget_range ? (budgetLabels[request.budget_range] || request.budget_range) : "",
      special_requests: sanitizeHtml(request.special_requests) || "",
      portal_link: portalUrl,
      admin_link: `https://bureauvlieland.nl/admin/logies/${request.id}`,
    };

    // Try to get templates from database
    const [bureauTemplate, customerTemplate] = await Promise.all([
      getRenderedTemplate(TemplateIds.ACCOMMODATION_REQUEST_BUREAU, templateVariables),
      getRenderedTemplate(TemplateIds.ACCOMMODATION_REQUEST_CUSTOMER, templateVariables),
    ]);

    // Use database templates or fallback
    const bureauEmailHtml = bureauTemplate?.body || getFallbackBureauHtml(request, typeLabels, budgetLabels);
    const bureauSubject = bureauTemplate?.subject || `${subjectPrefix}Nieuwe logies aanvraag - ${request.number_of_guests} gasten`;

    const customerEmailHtml = customerTemplate?.body || getFallbackCustomerHtml(request, typeLabels, portalUrl);
    const customerSubject = customerTemplate?.subject || `${subjectPrefix}Bevestiging logies aanvraag - Bureau Vlieland`;

    // Send emails
    await sendEmailViaMailjet([
      {
        From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland Website" },
        To: [{ Email: "erwin@bureauvlieland.nl", Name: "Erwin van der Most" }],
        Subject: bureauSubject,
        HTMLPart: bureauEmailHtml,
      },
      {
        From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" },
        To: [{ Email: request.customer_email, Name: request.customer_name }],
        Subject: customerSubject,
        HTMLPart: customerEmailHtml,
      },
    ]);

    // Log emails
    await Promise.all([
      logEmail({
        email_type: EmailTypes.ACCOMMODATION_REQUEST_BUREAU,
        subject: bureauSubject,
        recipient_email: "erwin@bureauvlieland.nl",
        recipient_name: "Erwin van der Most",
        related_accommodation_id: request.id,
        status: "sent",
        sent_by: "send-accommodation-request",
        metadata: { number_of_guests: request.number_of_guests },
      }),
      logEmail({
        email_type: EmailTypes.ACCOMMODATION_REQUEST_CUSTOMER,
        subject: customerSubject,
        recipient_email: request.customer_email,
        recipient_name: request.customer_name,
        related_accommodation_id: request.id,
        status: "sent",
        sent_by: "send-accommodation-request",
      }),
    ]);

    console.log("Accommodation request emails sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-accommodation-request:", error);
    return new Response(
      JSON.stringify({ error: "Er kon geen email worden verstuurd" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
