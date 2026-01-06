import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeddingInquiryRequest {
  name: string;
  email: string;
  phone: string;
  weddingDate: string;
  guestCount: string;
  message: string;
}

const sendEmail = async (payload: {
  from: string;
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  html: string;
}) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: payload.from,
      to: payload.to,
      cc: payload.cc,
      reply_to: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return res.json();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, weddingDate, guestCount, message }: WeddingInquiryRequest = await req.json();

    console.log("Received wedding inquiry from:", name, email);

    // Validate required fields
    if (!name || !email || !message) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Naam, e-mail en bericht zijn verplicht" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email to Karla with CC to Erwin
    const emailToKarla = await sendEmail({
      from: "Bureau Vlieland <noreply@bureauvlieland.nl>",
      to: ["karla@bureauvlieland.nl"],
      cc: ["erwin@bureauvlieland.nl"],
      replyTo: email,
      subject: `Bruiloftsaanvraag van ${name}`,
      html: `
        <h2>Nieuwe bruiloftsaanvraag via de website</h2>
        
        <h3>Contactgegevens</h3>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Naam:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">E-mail:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Telefoon:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${phone || "Niet opgegeven"}</td>
          </tr>
        </table>
        
        <h3>Bruiloft details</h3>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Gewenste datum:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${weddingDate || "Nog niet bekend"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Aantal gasten:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${guestCount || "Nog niet bekend"}</td>
          </tr>
        </table>
        
        <h3>Bericht</h3>
        <p style="background: #f9f9f9; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${message}</p>
        
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          Dit bericht is verzonden via het contactformulier op bureauvlieland.nl/trouwen-op-vlieland
        </p>
      `,
    });

    console.log("Email sent to Karla:", emailToKarla);

    // Send confirmation email to the couple
    const confirmationEmail = await sendEmail({
      from: "Bureau Vlieland <noreply@bureauvlieland.nl>",
      to: [email],
      subject: "Bedankt voor je bruiloftsaanvraag - Bureau Vlieland",
      html: `
        <h2>Bedankt voor je aanvraag, ${name}!</h2>
        
        <p>Wat leuk dat jullie overwegen om te trouwen op Vlieland!</p>
        
        <p>Wij hebben je aanvraag ontvangen en Karla neemt zo snel mogelijk contact met je op om jullie droombruiloft te bespreken.</p>
        
        <h3>Jullie gegevens</h3>
        <ul>
          <li><strong>Gewenste datum:</strong> ${weddingDate || "Nog niet bekend"}</li>
          <li><strong>Aantal gasten:</strong> ${guestCount || "Nog niet bekend"}</li>
        </ul>
        
        <h3>Jullie bericht</h3>
        <p style="background: #f9f9f9; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${message}</p>
        
        <p>Heb je vragen in de tussentijd? Neem gerust contact op via <a href="mailto:karla@bureauvlieland.nl">karla@bureauvlieland.nl</a>.</p>
        
        <p>Hartelijke groet,<br>Het team van Bureau Vlieland</p>
      `,
    });

    console.log("Confirmation email sent to:", email, confirmationEmail);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-wedding-inquiry function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
