// Using Deno.serve() instead of deprecated import
import { z } from "npm:zod@3.22.4";
import { getRenderedTemplate, sanitizeHtml, TemplateIds, SENDER_EMAIL, SENDER_NAME, getRecipientEmail, getSubjectPrefix } from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

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

// Fallback hardcoded template if database template not found
function getFallbackBureauHtml(data: QuoteRequest): string {
  const safeName = sanitizeHtml(data.name);
  const safeCompany = sanitizeHtml(data.company);
  const safeEmail = sanitizeHtml(data.email);
  const safePhone = sanitizeHtml(data.phone);
  const safeNumberOfPeople = sanitizeHtml(data.numberOfPeople);
  const safeStartDate = sanitizeHtml(data.startDate);
  const safeNumberOfDays = sanitizeHtml(data.numberOfDays);
  const safeBudgetPerPerson = sanitizeHtml(data.budgetPerPerson);
  const safeDescription = sanitizeHtml(data.description);

  return `
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
}

function getFallbackCustomerHtml(data: QuoteRequest, quoteDetails: string): string {
  const safeName = sanitizeHtml(data.name);

  return `
    <h2>Beste ${safeName},</h2>
    <p>Bedankt voor uw offerteaanvraag bij Bureau Vlieland!</p>
    <p>Wij hebben uw aanvraag goed ontvangen en zullen <strong>binnen 5 werkdagen</strong> contact met u opnemen met een passende offerte.</p>
    
    <h3>Uw aanvraag:</h3>
    ${quoteDetails}
    
    <p>Heeft u nog vragen? Neem gerust contact met ons op via:</p>
    <ul>
      <li>Email: hallo@bureauvlieland.nl</li>
      <li>Telefoon: 0562 700 208</li>
    </ul>
    
    <p>Met vriendelijke groet,<br>
    Erwin & Team Bureau Vlieland</p>
  `;
}

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
    const origin = rawData.origin || req.headers.get("origin") || "";
    
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

    // Prepare template variables
    const templateVariables = {
      customer_name: sanitizeHtml(requestData.name),
      company_name: sanitizeHtml(requestData.company) || "",
      customer_email: sanitizeHtml(requestData.email),
      customer_phone: sanitizeHtml(requestData.phone),
      number_of_people: sanitizeHtml(requestData.numberOfPeople),
      start_date: sanitizeHtml(requestData.startDate),
      number_of_days: sanitizeHtml(requestData.numberOfDays),
      budget_per_person: sanitizeHtml(requestData.budgetPerPerson),
      description: sanitizeHtml(requestData.description)?.replace(/\n/g, '<br>') || "",
      admin_link: "https://bureauvlieland.nl/admin",
    };

    // Try to get templates from database
    const [bureauTemplate, customerTemplate] = await Promise.all([
      getRenderedTemplate(TemplateIds.QUOTE_REQUEST_BUREAU, templateVariables),
      getRenderedTemplate(TemplateIds.QUOTE_REQUEST_CUSTOMER, templateVariables),
    ]);

    // Use database templates or fallback to hardcoded
    const bureauHtml = bureauTemplate?.body || getFallbackBureauHtml(requestData);
    const subjectPrefix = getSubjectPrefix(origin);
    const bureauSubject = `${subjectPrefix}${bureauTemplate?.subject || `Nieuwe offerteaanvraag - ${requestData.numberOfPeople} personen`}`;

    const fallbackQuoteDetails = getFallbackBureauHtml(requestData);
    const customerHtml = customerTemplate?.body || getFallbackCustomerHtml(requestData, fallbackQuoteDetails);
    const customerSubject = `${subjectPrefix}${customerTemplate?.subject || "Bevestiging offerte aanvraag - Bureau Vlieland"}`;

    // Send both emails using Mailjet
    const bureauRecipient = getRecipientEmail("erwin@bureauvlieland.nl", origin);
    const customerRecipient = getRecipientEmail(requestData.email, origin);

    const mailjetResponse = await sendEmailViaMailjet([
      // Email to Bureau Vlieland
      {
        From: {
          Email: SENDER_EMAIL,
          Name: "Bureau Vlieland Website"
        },
        To: [
          {
            Email: bureauRecipient,
            Name: "Erwin Soolsma"
          }
        ],
        Subject: bureauSubject,
        HTMLPart: bureauHtml,
      },
      // Confirmation email to customer
      {
        From: {
          Email: SENDER_EMAIL,
          Name: SENDER_NAME
        },
        To: [
          {
            Email: customerRecipient,
            Name: requestData.name
          }
        ],
        Subject: customerSubject,
        HTMLPart: customerHtml,
      }
    ]);

    // Log both sends (Email Logging Contract)
    const bureauMsgId = mailjetResponse?.Messages?.[0]?.MessageID?.toString() || null;
    const customerMsgId = mailjetResponse?.Messages?.[1]?.MessageID?.toString() || null;

    await Promise.all([
      logEmail({
        email_type: TemplateIds.QUOTE_REQUEST_BUREAU,
        subject: bureauSubject,
        recipient_email: bureauRecipient,
        recipient_name: "Erwin Soolsma",
        status: "sent",
        mailjet_message_id: bureauMsgId,
        sent_by: "system",
        metadata: {
          template_name: TemplateIds.QUOTE_REQUEST_BUREAU,
          actor: "klant → bureau (offerte-aanvraag)",
          customer_email: requestData.email,
          number_of_people: requestData.numberOfPeople,
        },
      }),
      logEmail({
        email_type: TemplateIds.QUOTE_REQUEST_CUSTOMER,
        subject: customerSubject,
        recipient_email: customerRecipient,
        recipient_name: requestData.name,
        status: "sent",
        mailjet_message_id: customerMsgId,
        sent_by: "system",
        metadata: {
          template_name: TemplateIds.QUOTE_REQUEST_CUSTOMER,
          actor: "system → klant (bevestiging offerte-aanvraag)",
          number_of_people: requestData.numberOfPeople,
        },
      }),
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

Deno.serve(handler);
