// Using Deno.serve() instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";
import { 
  getRenderedTemplate, 
  sanitizeHtml, 
  formatDateNL, 
  formatCurrencyNL,
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

// Fallback template if database template not found
function getFallbackEmailHtml(
  request: any, 
  quote: any, 
  partner: any, 
  portalUrl: string, 
  nights: number
): string {
  const safeName = sanitizeHtml(request.customer_name);
  const safeAccommodationName = sanitizeHtml(quote.accommodation_name);
  const safePartnerName = sanitizeHtml(partner.name);
  const includes = Array.isArray(quote.includes) ? quote.includes : [];

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0f766e;">Goed nieuws, ${safeName}!</h2>
      
      <p>Er is een nieuwe offerte beschikbaar voor je logies aanvraag op Vlieland.</p>
      
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #86efac;">
        <h3 style="margin-top: 0; color: #166534; font-size: 20px;">${safeAccommodationName}</h3>
        <p style="color: #166534; margin-bottom: 16px;">Offerte van ${safePartnerName}</p>
        
        <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Aankomst:</td>
              <td style="padding: 8px 0; text-align: right;"><strong>${formatDateNL(request.arrival_date)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Vertrek:</td>
              <td style="padding: 8px 0; text-align: right;"><strong>${formatDateNL(request.departure_date)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Aantal nachten:</td>
              <td style="padding: 8px 0; text-align: right;"><strong>${nights}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Gasten:</td>
              <td style="padding: 8px 0; text-align: right;"><strong>${request.number_of_guests}</strong></td>
            </tr>
          </table>
        </div>
        
        ${includes.length > 0 ? `
        <div style="margin-bottom: 16px;">
          <p style="color: #166534; margin-bottom: 8px; font-weight: 600;">✓ Inclusief:</p>
          <ul style="margin: 0; padding-left: 20px; color: #166534;">
            ${includes.map((item: string) => `<li>${sanitizeHtml(item)}</li>`).join("")}
          </ul>
        </div>
        ` : ""}
        
        <div style="background: #166534; color: white; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; font-size: 14px;">Totaalprijs</p>
          <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold;">${formatCurrencyNL(quote.price_total)}</p>
          ${quote.price_per_person_per_night ? `
          <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">
            (${formatCurrencyNL(quote.price_per_person_per_night)} p.p.p.n.)
          </p>
          ` : ""}
        </div>
        
        <p style="color: #166534; font-size: 12px; margin-top: 12px; margin-bottom: 0;">
          Geldig tot: ${formatDateNL(quote.valid_until)}
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${portalUrl}" 
           style="display: inline-block; background-color: #0f766e; color: white; 
                  padding: 16px 32px; border-radius: 8px; text-decoration: none; 
                  font-weight: bold; font-size: 16px;">
          Bekijk offerte en kies →
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        In je persoonlijke omgeving kun je alle ontvangen offertes vergelijken en je keuze maken.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      
      <p>Vragen over deze offerte? Neem contact op via:</p>
      <ul style="list-style: none; padding: 0;">
        <li>📧 <a href="mailto:hallo@bureauvlieland.nl" style="color: #0066cc;">hallo@bureauvlieland.nl</a></li>
        <li>📞 +31 (0)562 45 27 00</li>
      </ul>
      
      <p style="margin-top: 30px;">Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
    </div>
  `;
}

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

    // Fetch the quote with request, partner, and linked program data
    const { data: quote, error: quoteError } = await supabase
      .from("accommodation_quotes")
      .select(`
        *,
        partner:partners(*),
        request:accommodation_requests(
          *,
          linked_program:program_requests!accommodation_requests_linked_program_id_fkey(customer_token)
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

    const request = quote.request;
    const partner = quote.partner;

    if (!request || !partner) {
      return new Response(
        JSON.stringify({ error: "Gekoppelde data niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Always use the program token for the portal URL (unified customer experience)
    const programToken = request.linked_program?.customer_token;
    const portalUrl = programToken 
      ? `https://bureauvlieland.nl/mijn-programma/${programToken}`
      : `https://bureauvlieland.nl/mijn-logies/${request.customer_token}`;

    // Calculate nights
    const arrivalDate = new Date(request.arrival_date);
    const departureDate = new Date(request.departure_date);
    const nights = Math.ceil((departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));

    // Build includes list
    const includes = Array.isArray(quote.includes) ? quote.includes : [];

    // Prepare template variables
    const templateVariables = {
      customer_name: sanitizeHtml(request.customer_name),
      accommodation_name: sanitizeHtml(quote.accommodation_name),
      partner_name: sanitizeHtml(partner.name),
      arrival_date: formatDateNL(request.arrival_date),
      departure_date: formatDateNL(request.departure_date),
      number_of_nights: String(nights),
      number_of_guests: String(request.number_of_guests),
      price_total: formatCurrencyNL(quote.price_total),
      price_per_person_per_night: quote.price_per_person_per_night ? formatCurrencyNL(quote.price_per_person_per_night) : "",
      includes_list: includes.map((item: string) => `<li>${sanitizeHtml(item)}</li>`).join(""),
      valid_until: formatDateNL(quote.valid_until),
      portal_link: portalUrl,
    };

    // Try to get template from database
    const template = await getRenderedTemplate(TemplateIds.ACCOMMODATION_QUOTE_NOTIFICATION, templateVariables);

    // Use database template or fallback
    const emailHtml = template?.body || getFallbackEmailHtml(request, quote, partner, portalUrl, nights);
    const emailSubject = template?.subject || `Nieuwe offerte ontvangen: ${quote.accommodation_name}`;

    await sendEmailViaMailjet([
      {
        From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" },
        To: [{ Email: request.customer_email, Name: request.customer_name }],
        Subject: emailSubject,
        HTMLPart: emailHtml,
      },
    ]);

    // Log email
    await logEmail({
      email_type: EmailTypes.ACCOMMODATION_QUOTE_NOTIFICATION,
      subject: emailSubject,
      recipient_email: request.customer_email,
      recipient_name: request.customer_name,
      related_accommodation_id: request.id,
      related_partner_id: partner.id,
      status: "sent",
      sent_by: "notify-accommodation-quote",
      metadata: { 
        quote_id: quoteId,
        accommodation_name: quote.accommodation_name,
        price_total: quote.price_total,
      },
    });

    console.log("Accommodation quote notification sent to", request.customer_email);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-accommodation-quote:", error);
    return new Response(
      JSON.stringify({ error: "Er kon geen email worden verstuurd" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
