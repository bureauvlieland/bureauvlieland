import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

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
    const error = await response.text();
    throw new Error(`Mailjet API error: ${error}`);
  }

  return await response.json();
};

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

    // Send both emails using Mailjet
    const emailResponse = await sendEmailViaMailjet([
      // Email to Bureau Vlieland
      {
        From: {
          Email: "noreply@bureauvlieland.nl",
          Name: "Bureau Vlieland Website"
        },
        To: [
          {
            Email: "erwin@bureauvlieland.nl",
            Name: "Erwin van der Most"
          }
        ],
        Subject: `Nieuwe offerteaanvraag - ${requestData.eventType}`,
        HTMLPart: quoteDetails,
      },
      // Confirmation email to customer
      {
        From: {
          Email: "noreply@bureauvlieland.nl",
          Name: "Bureau Vlieland"
        },
        To: [
          {
            Email: requestData.email,
            Name: requestData.name
          }
        ],
        Subject: "Bevestiging offerte aanvraag - Bureau Vlieland",
        HTMLPart: `
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
      }
    ]);

    console.log("Emails sent successfully via Mailjet:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Emails sent successfully"
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
      JSON.stringify({ error: error.message || "Failed to send emails" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
