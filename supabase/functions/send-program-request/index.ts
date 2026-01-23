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
  
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW_MS);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  
  return false;
}

// Zod schema for server-side validation
const BlockItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  provider: z.string(),
  priceIndication: z.string(),
  priceNote: z.string().optional(),
  blockType: z.enum(["bureau", "partner", "self_arranged"]),
  externalUrl: z.string().optional(),
});

const ProgramRequestSchema = z.object({
  name: z.string().trim().min(2, "Naam moet minimaal 2 karakters zijn").max(100),
  company: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email("Ongeldig e-mailadres").max(255),
  phone: z.string().trim().min(10, "Telefoonnummer moet minimaal 10 karakters zijn").max(20),
  numberOfPeople: z.number().min(1).max(1000),
  selectedDate: z.string().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  blocks: z.array(BlockItemSchema),
  bureauFee: z.number(),
});

type ProgramRequest = z.infer<typeof ProgramRequestSchema>;

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

// Group blocks by type for email formatting
function groupBlocksByType(blocks: z.infer<typeof BlockItemSchema>[]) {
  return {
    bureau: blocks.filter((b) => b.blockType === "bureau"),
    partner: blocks.filter((b) => b.blockType === "partner"),
    self_arranged: blocks.filter((b) => b.blockType === "self_arranged"),
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    
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
    
    const validationResult = ProgramRequestSchema.safeParse(rawData);
    
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

    const requestData: ProgramRequest = validationResult.data;
    console.log("Program request received for:", requestData.email);

    // Sanitize all string fields
    const safeName = sanitizeHtml(requestData.name);
    const safeCompany = sanitizeHtml(requestData.company);
    const safeEmail = sanitizeHtml(requestData.email);
    const safePhone = sanitizeHtml(requestData.phone);
    const safeNotes = sanitizeHtml(requestData.notes);
    const safeDate = sanitizeHtml(requestData.selectedDate);

    const groupedBlocks = groupBlocksByType(requestData.blocks);
    const hasBillableItems = groupedBlocks.bureau.length > 0 || groupedBlocks.partner.length > 0;

    // Build blocks HTML for emails
    const buildBlocksListHtml = (blocks: z.infer<typeof BlockItemSchema>[], showExternal = false) => {
      return blocks.map(block => {
        const externalLink = showExternal && block.externalUrl 
          ? ` — <a href="${sanitizeHtml(block.externalUrl)}" style="color: #0066cc;">${sanitizeHtml(block.externalUrl)}</a>`
          : '';
        return `<li><strong>${sanitizeHtml(block.name)}</strong> (${sanitizeHtml(block.provider)}) — ${sanitizeHtml(block.priceIndication)}${block.priceNote ? ` ${sanitizeHtml(block.priceNote)}` : ''}${externalLink}</li>`;
      }).join('');
    };

    // Email to Bureau Vlieland
    const bureauEmailHtml = `
      <h2>Nieuwe Programma Aanvraag</h2>
      
      <h3>Contactgegevens</h3>
      <p><strong>Naam:</strong> ${safeName}</p>
      ${safeCompany ? `<p><strong>Bedrijf:</strong> ${safeCompany}</p>` : ''}
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Telefoon:</strong> ${safePhone}</p>
      
      <h3>Programma Details</h3>
      <p><strong>Aantal personen:</strong> ${requestData.numberOfPeople}</p>
      <p><strong>Gewenste datum:</strong> ${safeDate || 'Nog niet gekozen'}</p>
      <p><strong>Handling fee:</strong> € ${requestData.bureauFee}</p>
      
      ${groupedBlocks.bureau.length > 0 ? `
      <h3>Bureau Vlieland factureert</h3>
      <ul>${buildBlocksListHtml(groupedBlocks.bureau)}</ul>
      ` : ''}
      
      ${groupedBlocks.partner.length > 0 ? `
      <h3>Door te zetten naar partners</h3>
      <ul>${buildBlocksListHtml(groupedBlocks.partner)}</ul>
      ` : ''}
      
      ${groupedBlocks.self_arranged.length > 0 ? `
      <h3>Zelf te regelen door klant</h3>
      <ul>${buildBlocksListHtml(groupedBlocks.self_arranged, true)}</ul>
      ` : ''}
      
      ${safeNotes ? `
      <h3>Opmerkingen / Wensen</h3>
      <p>${safeNotes.replace(/\n/g, '<br>')}</p>
      ` : ''}
    `;

    // Confirmation email to customer (includes external links for self-arranged items)
    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Beste ${safeName},</h2>
        
        <p>Bedankt voor je programma aanvraag bij Bureau Vlieland!</p>
        
        <p>We hebben je aanvraag goed ontvangen. De betreffende aanbieders zullen je aanvraag behandelen en eventueel contact opnemen om details te bespreken. <strong>Je betaalt pas na bevestiging</strong> en ontvangt hiervan een factuur van de aanbieder.</p>
        
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2d3748;">Jouw aanvraag</h3>
          <p><strong>Datum:</strong> ${safeDate || 'Nog niet gekozen'}</p>
          <p><strong>Aantal personen:</strong> ${requestData.numberOfPeople}</p>
        </div>
        
        ${groupedBlocks.bureau.length > 0 || groupedBlocks.partner.length > 0 ? `
        <div style="margin: 20px 0;">
          <h3 style="color: #2d3748;">Aangevraagde onderdelen</h3>
          <p style="color: #718096; font-size: 14px;">Deze worden door de betreffende aanbieders bevestigd:</p>
          <ul style="padding-left: 20px;">
            ${buildBlocksListHtml([...groupedBlocks.bureau, ...groupedBlocks.partner])}
          </ul>
          ${hasBillableItems ? `<p style="color: #718096; font-size: 14px;">Handling fee: € ${requestData.bureauFee}</p>` : ''}
        </div>
        ` : ''}
        
        ${groupedBlocks.self_arranged.length > 0 ? `
        <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">🔗 Zelf te regelen</h3>
          <p style="color: #78350f; font-size: 14px;">Onderstaande onderdelen regel je zelf. Klik op de links om te boeken:</p>
          <ul style="padding-left: 20px;">
            ${groupedBlocks.self_arranged.map(block => `
              <li style="margin-bottom: 10px;">
                <strong>${sanitizeHtml(block.name)}</strong><br>
                <span style="color: #78350f;">${sanitizeHtml(block.priceIndication)}${block.priceNote ? ` ${sanitizeHtml(block.priceNote)}` : ''}</span><br>
                ${block.externalUrl ? `<a href="${sanitizeHtml(block.externalUrl)}" style="color: #0066cc; font-weight: bold;">→ Boek bij ${sanitizeHtml(block.provider)}</a>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${safeNotes ? `
        <div style="margin: 20px 0;">
          <h3 style="color: #2d3748;">Jouw opmerkingen</h3>
          <p style="color: #4a5568; background: #f7fafc; padding: 15px; border-radius: 8px;">${safeNotes.replace(/\n/g, '<br>')}</p>
        </div>
        ` : ''}
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p>Heb je nog vragen? Neem gerust contact met ons op:</p>
        <ul style="list-style: none; padding: 0;">
          <li>📧 Email: <a href="mailto:hallo@bureauvlieland.nl" style="color: #0066cc;">hallo@bureauvlieland.nl</a></li>
          <li>📞 Telefoon: +31 (0)562 45 27 00</li>
        </ul>
        
        <p style="margin-top: 30px;">Met vriendelijke groet,<br><strong>Erwin & Team Bureau Vlieland</strong></p>
      </div>
    `;

    // Send both emails
    const emailResponse = await sendEmailViaMailjet([
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
        Subject: `Nieuwe programma aanvraag - ${requestData.numberOfPeople} personen`,
        HTMLPart: bureauEmailHtml,
      },
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
        Subject: "Bevestiging programma aanvraag - Bureau Vlieland",
        HTMLPart: customerEmailHtml,
      }
    ]);

    console.log("Program request emails sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Aanvraag verzonden"
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
    console.error("Error in send-program-request function:", error);
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
