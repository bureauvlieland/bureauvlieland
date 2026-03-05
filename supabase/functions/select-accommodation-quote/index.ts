// Using Deno.serve() instead of deprecated import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getRenderedTemplate, 
  sanitizeHtml, 
  formatDateNL, 
  formatCurrencyNL,
  isTestMode,
  getSubjectPrefix,
  getRecipientEmail,
  getPortalBaseUrl,
  buildReplyTo,
  TemplateIds 
} from "../_shared/email-templates.ts";
import { logEmail, EmailTypes } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SelectQuoteRequest {
  token: string;
  quoteId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, quoteId }: SelectQuoteRequest = await req.json();

    // Validate input
    if (!token || !quoteId) {
      return new Response(
        JSON.stringify({ error: "Token en quoteId zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the accommodation request by token
    const { data: request, error: requestError } = await supabase
      .from("accommodation_requests")
      .select("*")
      .eq("customer_token", token)
      .maybeSingle();

    if (requestError || !request) {
      console.error("Request error:", requestError);
      return new Response(
        JSON.stringify({ error: "Aanvraag niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if request is still valid
    if (new Date(request.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Deze aanvraag is verlopen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already accepted
    if (request.status === "accepted") {
      return new Response(
        JSON.stringify({ error: "Er is al een offerte gekozen voor deze aanvraag" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the quote
    const { data: quote, error: quoteError } = await supabase
      .from("accommodation_quotes")
      .select("*, partner:partners(*)")
      .eq("id", quoteId)
      .eq("request_id", request.id)
      .maybeSingle();

    if (quoteError || !quote) {
      console.error("Quote error:", quoteError);
      return new Response(
        JSON.stringify({ error: "Offerte niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if quote is expired
    if (new Date(quote.valid_until) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Deze offerte is verlopen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get partner commission percentage
    const { data: partner } = await supabase
      .from("partners")
      .select("accommodation_commission_percentage")
      .eq("id", quote.partner_id)
      .maybeSingle();

    // Calculate commission (default 10% for accommodation)
    const commissionPercentage = partner?.accommodation_commission_percentage || 10;
    const commissionAmount = (quote.price_total * commissionPercentage) / 100;

    // Update the selected quote with commission data
    const { error: updateQuoteError } = await supabase
      .from("accommodation_quotes")
      .update({
        status: "selected",
        selected_at: new Date().toISOString(),
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        commission_status: "pending", // Waiting for invoice registration
      })
      .eq("id", quoteId);

    if (updateQuoteError) {
      console.error("Update quote error:", updateQuoteError);
      throw new Error("Fout bij bijwerken offerte");
    }

    console.log(`Commission calculated for quote ${quoteId}: ${commissionPercentage}% = €${commissionAmount.toFixed(2)}`);

    // Reject other quotes for this request
    const { error: rejectError } = await supabase
      .from("accommodation_quotes")
      .update({ status: "rejected" })
      .eq("request_id", request.id)
      .neq("id", quoteId)
      .in("status", ["pending", "submitted"]);

    if (rejectError) {
      console.error("Reject quotes error:", rejectError);
      // Non-fatal, continue
    }

    // Fetch rejected quotes with partner info to notify them
    const { data: rejectedQuotes } = await supabase
      .from("accommodation_quotes")
      .select("id, accommodation_name, partner:partners(id, name, email, contact_email)")
      .eq("request_id", request.id)
      .eq("status", "rejected")
      .neq("id", quoteId);

    // Update request status to accepted
    const { error: updateRequestError } = await supabase
      .from("accommodation_requests")
      .update({ status: "accepted" })
      .eq("id", request.id);

    if (updateRequestError) {
      console.error("Update request error:", updateRequestError);
      throw new Error("Fout bij bijwerken aanvraag");
    }

    // Send email notifications
    const mailjetApiKey = Deno.env.get("MAILJET_API_KEY");
    const mailjetSecretKey = Deno.env.get("MAILJET_SECRET_KEY");

    if (mailjetApiKey && mailjetSecretKey) {
      const auth = btoa(`${mailjetApiKey}:${mailjetSecretKey}`);
      const origin = req.headers.get("origin") || "https://bureauvlieland.nl";
      const testMode = isTestMode(origin);
      const subjectPrefix = getSubjectPrefix(origin);

      const baseUrl = getPortalBaseUrl(origin);
      const portalUrl = `${baseUrl}/mijn-logies/${token}`;

      // Prepare template variables for partner email
      const partnerTemplateVariables = {
        partner_name: sanitizeHtml(quote.partner?.name),
        customer_name: sanitizeHtml(request.customer_name),
        company_name: sanitizeHtml(request.customer_company) || "",
        customer_email: request.customer_email,
        customer_phone: sanitizeHtml(request.customer_phone),
        accommodation_name: sanitizeHtml(quote.accommodation_name),
        arrival_date: formatDateNL(request.arrival_date),
        departure_date: formatDateNL(request.departure_date),
        number_of_guests: String(request.number_of_guests),
        price_total: formatCurrencyNL(quote.price_total),
      };

      // Prepare template variables for customer email
      const customerTemplateVariables = {
        customer_name: sanitizeHtml(request.customer_name),
        accommodation_name: sanitizeHtml(quote.accommodation_name),
        arrival_date: formatDateNL(request.arrival_date),
        departure_date: formatDateNL(request.departure_date),
        number_of_guests: String(request.number_of_guests),
        price_total: formatCurrencyNL(quote.price_total),
        portal_link: portalUrl,
      };

      // Try to get templates from database
      const [partnerTemplate, customerTemplate] = await Promise.all([
        getRenderedTemplate(TemplateIds.ACCOMMODATION_SELECTED_PARTNER, partnerTemplateVariables),
        getRenderedTemplate(TemplateIds.ACCOMMODATION_SELECTED_CUSTOMER, customerTemplateVariables),
      ]);

      const replyTo = buildReplyTo(request.reference_number);

      // Partner email (prefer contact_email for notifications)
      const partnerEmail = getRecipientEmail(quote.partner?.contact_email || quote.partner?.email || "", origin);
      if (partnerEmail) {
        const partnerHtml = partnerTemplate?.body || `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Goed nieuws!</h1>
            <p>Uw offerte voor <strong>${sanitizeHtml(quote.accommodation_name)}</strong> is geaccepteerd door ${sanitizeHtml(request.customer_name)}.</p>
            
            <h2>Klantgegevens</h2>
            <ul>
              <li><strong>Naam:</strong> ${sanitizeHtml(request.customer_name)}</li>
              <li><strong>Email:</strong> ${request.customer_email}</li>
              <li><strong>Telefoon:</strong> ${sanitizeHtml(request.customer_phone)}</li>
              ${request.customer_company ? `<li><strong>Bedrijf:</strong> ${sanitizeHtml(request.customer_company)}</li>` : ""}
            </ul>
            
            <h2>Reserveringsdetails</h2>
            <ul>
              <li><strong>Aankomst:</strong> ${formatDateNL(request.arrival_date)}</li>
              <li><strong>Vertrek:</strong> ${formatDateNL(request.departure_date)}</li>
              <li><strong>Aantal gasten:</strong> ${request.number_of_guests}</li>
              <li><strong>Totaalprijs:</strong> ${formatCurrencyNL(quote.price_total)}</li>
            </ul>
            
            <p>Neem zo snel mogelijk contact op met de klant om de reservering te bevestigen.</p>
            
            <p style="color: #666; font-size: 12px; margin-top: 40px;">
              Dit bericht is verzonden door Bureau Vlieland.
            </p>
          </div>
        `;

        try {
          await fetch("https://api.mailjet.com/v3.1/send", {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              Messages: [
                {
                  From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
                  To: [{ Email: partnerEmail }],
                  ...(replyTo ? { ReplyTo: replyTo } : {}),
                  Subject: partnerTemplate?.subject || `${subjectPrefix}Uw offerte voor ${request.customer_name} is geaccepteerd`,
                  HTMLPart: partnerHtml,
                },
              ],
            }),
          });
        } catch (e) {
          console.error("Error sending partner email:", e);
        }
      }

      // Customer email
      const customerHtml = customerTemplate?.body || `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0f766e;">Bedankt voor uw keuze!</h1>
          <p>Beste ${sanitizeHtml(request.customer_name)},</p>
          <p>U heeft gekozen voor <strong>${sanitizeHtml(quote.accommodation_name)}</strong> voor uw verblijf op Vlieland.</p>
          
          <h2>Uw reservering</h2>
          <ul>
            <li><strong>Accommodatie:</strong> ${sanitizeHtml(quote.accommodation_name)}</li>
            <li><strong>Aankomst:</strong> ${formatDateNL(request.arrival_date)}</li>
            <li><strong>Vertrek:</strong> ${formatDateNL(request.departure_date)}</li>
            <li><strong>Aantal gasten:</strong> ${request.number_of_guests}</li>
            <li><strong>Totaalprijs:</strong> ${formatCurrencyNL(quote.price_total)}</li>
          </ul>
          
          <p>De accommodatie neemt binnenkort contact met u op om de reservering definitief te maken.</p>
          
          <p>U kunt de status van uw aanvraag altijd bekijken via:<br>
          <a href="${portalUrl}">${portalUrl}</a></p>
          
          <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
        </div>
      `;

      try {
        await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Messages: [
              {
                From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
                To: [{ Email: request.customer_email }],
                Subject: customerTemplate?.subject || "Bevestiging van uw logies keuze",
                HTMLPart: customerHtml,
              },
            ],
          }),
        });
      } catch (e) {
        console.error("Error sending customer email:", e);
      }
      // Notify rejected partners
      if (rejectedQuotes && rejectedQuotes.length > 0) {
        for (const rq of rejectedQuotes) {
          const partner = rq.partner as any;
          if (!partner?.email) continue;

          const rejectedVars = {
            partner_name: sanitizeHtml(partner.name),
            customer_name: sanitizeHtml(request.customer_name),
            accommodation_name: sanitizeHtml(rq.accommodation_name),
            arrival_date: formatDateNL(request.arrival_date),
            departure_date: formatDateNL(request.departure_date),
          };

          const rejectedTemplate = await getRenderedTemplate(
            TemplateIds.ACCOMMODATION_REJECTED_PARTNER,
            rejectedVars
          );

          const rejectedHtml = rejectedTemplate?.body || `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <p>Beste ${sanitizeHtml(partner.name)},</p>
              <p>Wij laten u weten dat de klant <strong>${sanitizeHtml(request.customer_name)}</strong> voor de periode ${formatDateNL(request.arrival_date)} - ${formatDateNL(request.departure_date)} voor een andere accommodatie heeft gekozen.</p>
              <p>Uw offerte voor <strong>${sanitizeHtml(rq.accommodation_name)}</strong> wordt hiermee afgesloten.</p>
              <p>Bedankt voor het uitbrengen van uw offerte. Wij hopen u bij een volgende aanvraag weer te mogen benaderen.</p>
              <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
            </div>
          `;

          const rejectedEmail = getRecipientEmail(partner.contact_email || partner.email, origin);
          try {
            await fetch("https://api.mailjet.com/v3.1/send", {
              method: "POST",
              headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                Messages: [{
                  From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
                  To: [{ Email: rejectedEmail }],
                  Subject: rejectedTemplate?.subject || `${subjectPrefix}Logiesaanvraag ${sanitizeHtml(request.customer_name)} - niet gekozen`,
                  HTMLPart: rejectedHtml,
                }],
              }),
            });

            await logEmail({
              email_type: EmailTypes.ACCOMMODATION_REJECTED_PARTNER,
              subject: rejectedTemplate?.subject || `Logiesaanvraag ${request.customer_name} - niet gekozen`,
              recipient_email: rejectedEmail,
              recipient_name: partner.name,
              related_accommodation_id: request.id,
              related_partner_id: partner.id,
              status: "sent",
              sent_by: "system",
            });

            console.log(`Rejection notification sent to partner ${partner.name}`);
          } catch (e) {
            console.error(`Error sending rejection email to ${partner.name}:`, e);
            await logEmail({
              email_type: EmailTypes.ACCOMMODATION_REJECTED_PARTNER,
              subject: `Logiesaanvraag ${request.customer_name} - niet gekozen`,
              recipient_email: rejectedEmail,
              recipient_name: partner.name,
              related_accommodation_id: request.id,
              related_partner_id: partner.id,
              status: "failed",
              error_message: String(e),
              sent_by: "system",
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Offerte succesvol geselecteerd" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in select-accommodation-quote:", error);
    return new Response(
      JSON.stringify({ error: "Er ging iets mis bij het verwerken van uw keuze" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
