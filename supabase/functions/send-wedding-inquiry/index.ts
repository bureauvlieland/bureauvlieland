import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
const WeddingInquirySchema = z.object({
  name: z.string().trim().min(2, "Naam moet minimaal 2 karakters zijn").max(100, "Naam mag maximaal 100 karakters zijn"),
  email: z.string().trim().email("Ongeldig e-mailadres").max(255, "E-mail mag maximaal 255 karakters zijn"),
  phone: z.string().trim().max(20, "Telefoonnummer mag maximaal 20 karakters zijn").optional().or(z.literal("")),
  weddingDate: z.string().trim().max(50, "Datum mag maximaal 50 karakters zijn").optional().or(z.literal("")),
  guestCount: z.string().trim().max(20, "Aantal gasten mag maximaal 20 karakters zijn").optional().or(z.literal("")),
  message: z.string().trim().min(10, "Bericht moet minimaal 10 karakters zijn").max(2000, "Bericht mag maximaal 2000 karakters zijn"),
});

type WeddingInquiryRequest = z.infer<typeof WeddingInquirySchema>;

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
    const validationResult = WeddingInquirySchema.safeParse(rawData);
    
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

    const { name, email, phone, weddingDate, guestCount, message }: WeddingInquiryRequest = validationResult.data;

    console.log("Received wedding inquiry from:", name);

    // Sanitize all string fields for email HTML
    const safeName = sanitizeHtml(name);
    const safeEmail = sanitizeHtml(email);
    const safePhone = sanitizeHtml(phone);
    const safeWeddingDate = sanitizeHtml(weddingDate);
    const safeGuestCount = sanitizeHtml(guestCount);
    const safeMessage = sanitizeHtml(message);

    // Send email to Karla with CC to Erwin
    const emailToKarla = await sendEmail({
      from: "Bureau Vlieland <noreply@bureauvlieland.nl>",
      to: ["karla@bureauvlieland.nl"],
      cc: ["erwin@bureauvlieland.nl"],
      replyTo: email,
      subject: `Bruiloftsaanvraag van ${safeName}`,
      html: `
        <h2>Nieuwe bruiloftsaanvraag via de website</h2>
        
        <h3>Contactgegevens</h3>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Naam:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">E-mail:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Telefoon:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${safePhone || "Niet opgegeven"}</td>
          </tr>
        </table>
        
        <h3>Bruiloft details</h3>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Gewenste datum:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${safeWeddingDate || "Nog niet bekend"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Aantal gasten:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${safeGuestCount || "Nog niet bekend"}</td>
          </tr>
        </table>
        
        <h3>Bericht</h3>
        <p style="background: #f9f9f9; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${safeMessage}</p>
        
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
        <h2>Bedankt voor je aanvraag, ${safeName}!</h2>
        
        <p>Wat leuk dat jullie overwegen om te trouwen op Vlieland!</p>
        
        <p>Wij hebben je aanvraag ontvangen en Karla neemt zo snel mogelijk contact met je op om jullie droombruiloft te bespreken.</p>
        
        <h3>Jullie gegevens</h3>
        <ul>
          <li><strong>Gewenste datum:</strong> ${safeWeddingDate || "Nog niet bekend"}</li>
          <li><strong>Aantal gasten:</strong> ${safeGuestCount || "Nog niet bekend"}</li>
        </ul>
        
        <h3>Jullie bericht</h3>
        <p style="background: #f9f9f9; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${safeMessage}</p>
        
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
