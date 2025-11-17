import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QuoteRequest {
  eventType: string;
  numberOfPeople: number;
  date: string;
  budget: string;
  location?: string;
  activities?: string[];
  catering?: string;
  extraWishes?: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: QuoteRequest = await req.json();
    console.log("Quote request received:", requestData);

    // Format the quote details for the email
    const quoteDetails = `
      <h2>Nieuwe Offerteaanvraag</h2>
      <p><strong>Type evenement:</strong> ${requestData.eventType}</p>
      <p><strong>Aantal personen:</strong> ${requestData.numberOfPeople}</p>
      <p><strong>Gewenste datum:</strong> ${requestData.date}</p>
      <p><strong>Budget indicatie:</strong> ${requestData.budget}</p>
      ${requestData.location ? `<p><strong>Locatie voorkeur:</strong> ${requestData.location}</p>` : ''}
      ${requestData.activities ? `<p><strong>Activiteiten:</strong> ${requestData.activities.join(', ')}</p>` : ''}
      ${requestData.catering ? `<p><strong>Catering wensen:</strong> ${requestData.catering}</p>` : ''}
      ${requestData.extraWishes ? `<p><strong>Extra wensen:</strong> ${requestData.extraWishes}</p>` : ''}
      
      <h3>Contactgegevens</h3>
      <p><strong>Naam:</strong> ${requestData.name}</p>
      <p><strong>Email:</strong> ${requestData.email}</p>
      <p><strong>Telefoon:</strong> ${requestData.phone}</p>
      ${requestData.company ? `<p><strong>Bedrijf:</strong> ${requestData.company}</p>` : ''}
    `;

    // Send email to Bureau Vlieland
    const bureauEmail = await resend.emails.send({
      from: "Bureau Vlieland <onboarding@resend.dev>",
      to: ["hallo@bureauvlieland.nl"],
      subject: `Nieuwe offerteaanvraag - ${requestData.eventType}`,
      html: quoteDetails,
    });

    console.log("Email sent to Bureau Vlieland:", bureauEmail);

    // Send confirmation email to customer
    const customerEmail = await resend.emails.send({
      from: "Bureau Vlieland <onboarding@resend.dev>",
      to: [requestData.email],
      subject: "Bevestiging offerte aanvraag - Bureau Vlieland",
      html: `
        <h2>Beste ${requestData.name},</h2>
        <p>Bedankt voor je offerteaanvraag bij Bureau Vlieland!</p>
        <p>We hebben je aanvraag goed ontvangen en zullen <strong>binnen 5 werkdagen</strong> contact met je opnemen met een passende offerte.</p>
        
        <h3>Jouw aanvraag:</h3>
        ${quoteDetails}
        
        <p>Heb je nog vragen? Neem gerust contact met ons op via:</p>
        <ul>
          <li>Email: hallo@bureauvlieland.nl</li>
          <li>Telefoon: +31 (0)562 45 27 00</li>
        </ul>
        
        <p>Met vriendelijke groet,<br>
        Erwin & Team Bureau Vlieland</p>
      `,
    });

    console.log("Confirmation email sent to customer:", customerEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        bureauEmailId: bureauEmail.data?.id,
        customerEmailId: customerEmail.data?.id
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-quote-request function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
