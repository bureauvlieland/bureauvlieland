import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SelectQuoteRequest {
  token: string;
  quoteId: string;
}

serve(async (req) => {
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

    // Update the selected quote
    const { error: updateQuoteError } = await supabase
      .from("accommodation_quotes")
      .update({
        status: "selected",
        selected_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    if (updateQuoteError) {
      console.error("Update quote error:", updateQuoteError);
      throw new Error("Fout bij bijwerken offerte");
    }

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
      const isTestMode = !origin.includes("bureauvlieland.nl");

      // Email to selected partner
      const partnerEmail = isTestMode ? "erwin@bureauvlieland.nl" : quote.partner?.email;
      if (partnerEmail) {
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
                  From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" },
                  To: [{ Email: partnerEmail }],
                  Subject: isTestMode
                    ? `[TEST] Uw offerte voor ${request.customer_name} is geaccepteerd`
                    : `Uw offerte voor ${request.customer_name} is geaccepteerd`,
                  HTMLPart: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                      <h1 style="color: #16a34a;">Goed nieuws!</h1>
                      <p>Uw offerte voor <strong>${quote.accommodation_name}</strong> is geaccepteerd door ${request.customer_name}.</p>
                      
                      <h2>Klantgegevens</h2>
                      <ul>
                        <li><strong>Naam:</strong> ${request.customer_name}</li>
                        <li><strong>Email:</strong> ${request.customer_email}</li>
                        <li><strong>Telefoon:</strong> ${request.customer_phone}</li>
                        ${request.customer_company ? `<li><strong>Bedrijf:</strong> ${request.customer_company}</li>` : ""}
                      </ul>
                      
                      <h2>Reserveringsdetails</h2>
                      <ul>
                        <li><strong>Aankomst:</strong> ${request.arrival_date}</li>
                        <li><strong>Vertrek:</strong> ${request.departure_date}</li>
                        <li><strong>Aantal gasten:</strong> ${request.number_of_guests}</li>
                        <li><strong>Totaalprijs:</strong> €${quote.price_total}</li>
                      </ul>
                      
                      <p>Neem zo snel mogelijk contact op met de klant om de reservering te bevestigen.</p>
                      
                      <p style="color: #666; font-size: 12px; margin-top: 40px;">
                        Dit bericht is verzonden door Bureau Vlieland.
                      </p>
                    </div>
                  `,
                },
              ],
            }),
          });
        } catch (e) {
          console.error("Error sending partner email:", e);
        }
      }

      // Email to customer
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
                From: { Email: "noreply@bureauvlieland.nl", Name: "Bureau Vlieland" },
                To: [{ Email: request.customer_email }],
                Subject: "Bevestiging van uw logies keuze",
                HTMLPart: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #0f766e;">Bedankt voor uw keuze!</h1>
                    <p>Beste ${request.customer_name},</p>
                    <p>U heeft gekozen voor <strong>${quote.accommodation_name}</strong> voor uw verblijf op Vlieland.</p>
                    
                    <h2>Uw reservering</h2>
                    <ul>
                      <li><strong>Accommodatie:</strong> ${quote.accommodation_name}</li>
                      <li><strong>Aankomst:</strong> ${request.arrival_date}</li>
                      <li><strong>Vertrek:</strong> ${request.departure_date}</li>
                      <li><strong>Aantal gasten:</strong> ${request.number_of_guests}</li>
                      <li><strong>Totaalprijs:</strong> €${quote.price_total}</li>
                    </ul>
                    
                    <p>De accommodatie neemt binnenkort contact met u op om de reservering definitief te maken.</p>
                    
                    <p>U kunt de status van uw aanvraag altijd bekijken via:<br>
                    <a href="${origin}/mijn-logies/${token}">${origin}/mijn-logies/${token}</a></p>
                    
                    <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
                  </div>
                `,
              },
            ],
          }),
        });
      } catch (e) {
        console.error("Error sending customer email:", e);
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
