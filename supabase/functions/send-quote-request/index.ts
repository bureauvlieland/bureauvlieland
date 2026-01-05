import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rate limiting - in-memory store (resets on cold start)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  
  // Filter out requests outside the window
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW_MS);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  // Add current request
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  
  return false;
}

// Zod schema for server-side validation
const QuoteRequestSchema = z.object({
  name: z.string().trim().min(2, "Naam moet minimaal 2 karakters zijn").max(100, "Naam mag maximaal 100 karakters zijn"),
  company: z.string().trim().max(100, "Bedrijfsnaam mag maximaal 100 karakters zijn").optional().or(z.literal("")),
  email: z.string().trim().email("Ongeldig e-mailadres").max(255, "E-mail mag maximaal 255 karakters zijn"),
  phone: z.string().trim().min(10, "Telefoonnummer moet minimaal 10 karakters zijn").max(20, "Telefoonnummer mag maximaal 20 karakters zijn"),
  numberOfPeople: z.string().trim().min(1, "Aantal personen is verplicht").max(10),
  startDate: z.string().trim().min(1, "Startdatum is verplicht").max(20),
  numberOfDays: z.string().trim().min(1, "Aantal dagen is verplicht").max(10),
  budgetPerPerson: z.string().trim().min(1, "Budget is verplicht").max(50),
  description: z.string().trim().max(2000, "Omschrijving mag maximaal 2000 karakters zijn").optional().or(z.literal("")),
});

type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

// Sanitize HTML to prevent XSS in emails
function sanitizeHtml(str: string | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
    const errorText = await response.text();
    console.error("Mailjet API error:", errorText);
    throw new Error("EMAIL_SERVICE_ERROR");
  }

  return await response.json();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    
    // Check rate limit
    if (isRateLimited(clientIp)) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Te veel verzoeken. Probeer het over een minuut opnieuw." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const rawData = await req.json();
    
    // Validate with Zod schema
    const validationResult = QuoteRequestSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      console.warn("Validation failed:", errors);
      return new Response(
        JSON.stringify({ error: `Validatiefout: ${errors}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const requestData: QuoteRequest = validationResult.data;
    console.log("Quote request received and validated for:", requestData.email);

    // Sanitize all string fields for email HTML
    const safeName = sanitizeHtml(requestData.name);
    const safeCompany = sanitizeHtml(requestData.company);
    const safeEmail = sanitizeHtml(requestData.email);
    const safePhone = sanitizeHtml(requestData.phone);
    const safeNumberOfPeople = sanitizeHtml(requestData.numberOfPeople);
    const safeStartDate = sanitizeHtml(requestData.startDate);
    const safeNumberOfDays = sanitizeHtml(requestData.numberOfDays);
    const safeBudgetPerPerson = sanitizeHtml(requestData.budgetPerPerson);
    const safeDescription = sanitizeHtml(requestData.description);

    // Format the quote details for the email
    const quoteDetails = `
      <h2>Nieuwe Offerteaanvraag</h2>
      
      <h3>Contactgegevens</h3>
      <p><strong>Naam:</strong> ${safeName}</p>
      ${safeCompany ? `<p><strong>Bedrijf:</strong> ${safeCompany}</p>` : ''}
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Telefoon:</strong> ${safePhone}</p>
      
      <h3>Evenement Details</h3>
      <p><strong>Aantal personen:</strong> ${safeNumberOfPeople}</p>
      <p><strong>Gewenste startdatum:</strong> ${safeStartDate}</p>
      <p><strong>Aantal dagen:</strong> ${safeNumberOfDays}</p>
      <p><strong>Budget indicatie p.p.:</strong> ${safeBudgetPerPerson}</p>
      
      ${safeDescription ? `
      <h3>Omschrijving / Bijzondere wensen</h3>
      <p>${safeDescription.replace(/\n/g, '<br>')}</p>
      ` : ''}
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
        Subject: `Nieuwe offerteaanvraag - ${safeNumberOfPeople} personen`,
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
          <h2>Beste ${safeName},</h2>
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

    console.log("Emails sent successfully via Mailjet");

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
      JSON.stringify({ error: "Er kon geen email worden verstuurd. Probeer het later opnieuw of neem direct contact met ons op." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
