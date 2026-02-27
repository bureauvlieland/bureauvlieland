// Using Deno.serve() instead of deprecated import
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
  category: z.string().nullable().optional().transform(v => v ?? ""),
  provider: z.string().nullable().optional().transform(v => v ?? "Bureau Vlieland"),
  providerId: z.string().nullable().optional().transform(v => v ?? ""),
  providerEmail: z.string().email().nullable().optional().or(z.literal("")),
  priceIndication: z.string().nullable().optional().transform(v => v ?? "Op aanvraag"),
  priceNote: z.string().nullable().optional(),
  blockType: z.enum(["bureau", "partner", "self_arranged"]),
  externalUrl: z.string().nullable().optional(),
  preferredTime: z.string().nullable().optional(),
  itemNotes: z.string().max(500).nullable().optional().or(z.literal("")),
  dayIndex: z.number().optional(),
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
  customerToken: z.string().min(8).max(32).optional(),
  origin: z.string().optional(), // For test mode detection
});

// Import shared email utilities
import { 
  sanitizeHtml, 
  isTestMode, 
  getRecipientEmail, 
  getSubjectPrefix 
} from "../_shared/email-templates.ts";

type ProgramRequest = z.infer<typeof ProgramRequestSchema>;
type BlockItem = z.infer<typeof BlockItemSchema>;

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
function groupBlocksByType(blocks: BlockItem[]) {
  return {
    bureau: blocks.filter((b) => b.blockType === "bureau"),
    partner: blocks.filter((b) => b.blockType === "partner"),
    self_arranged: blocks.filter((b) => b.blockType === "self_arranged"),
  };
}

// Group blocks by provider for partner emails (excludes self_arranged)
interface ProviderGroup {
  providerId: string;
  providerName: string;
  providerEmail: string;
  blocks: BlockItem[];
}

function groupBlocksByProvider(blocks: BlockItem[]): ProviderGroup[] {
  // Filter out self_arranged blocks - they don't get emails
  const billableBlocks = blocks.filter(b => b.blockType !== "self_arranged");
  
  const grouped = new Map<string, ProviderGroup>();
  
  for (const block of billableBlocks) {
    if (!block.providerEmail) continue; // Skip if no email
    
    if (!grouped.has(block.providerId)) {
      grouped.set(block.providerId, {
        providerId: block.providerId,
        providerName: block.provider,
        providerEmail: block.providerEmail,
        blocks: []
      });
    }
    grouped.get(block.providerId)!.blocks.push(block);
  }
  
  return Array.from(grouped.values());
}

// Generate partner email HTML
function generatePartnerEmailHtml(
  group: ProviderGroup,
  customerData: {
    name: string;
    company: string;
    email: string;
    phone: string;
    date: string;
    numberOfPeople: number;
    notes: string;
  }
): string {
  const activitiesHtml = group.blocks.map(block => {
    const timeInfo = block.preferredTime 
      ? `<br><span style="color: #666; font-size: 13px;">⏰ Gewenste tijd: ${sanitizeHtml(block.preferredTime)}</span>` 
      : '';
    const notesInfo = block.itemNotes 
      ? `<br><span style="color: #666; font-size: 13px;">💬 Opmerking: ${sanitizeHtml(block.itemNotes)}</span>` 
      : '';
    return `<li style="margin-bottom: 12px;">
      <strong>${sanitizeHtml(block.name)}</strong> — ${sanitizeHtml(block.priceIndication)}${block.priceNote ? ` ${sanitizeHtml(block.priceNote)}` : ''}
      ${timeInfo}
      ${notesInfo}
    </li>`;
  }).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px;">
        Nieuwe aanvraag via Bureau Vlieland
      </h2>
      
      <p>Beste ${sanitizeHtml(group.providerName)},</p>
      
      <p>Er is een nieuwe <strong>vrijblijvende aanvraag</strong> binnengekomen via Bureau Vlieland.</p>
      
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2d3748;">📋 Klantgegevens</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 5px 0; color: #666;">Naam:</td><td style="padding: 5px 0;"><strong>${sanitizeHtml(customerData.name)}</strong></td></tr>
          ${customerData.company ? `<tr><td style="padding: 5px 0; color: #666;">Bedrijf:</td><td style="padding: 5px 0;"><strong>${sanitizeHtml(customerData.company)}</strong></td></tr>` : ''}
          <tr><td style="padding: 5px 0; color: #666;">Email:</td><td style="padding: 5px 0;"><a href="mailto:${sanitizeHtml(customerData.email)}" style="color: #0066cc;">${sanitizeHtml(customerData.email)}</a></td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Telefoon:</td><td style="padding: 5px 0;"><a href="tel:${sanitizeHtml(customerData.phone)}" style="color: #0066cc;">${sanitizeHtml(customerData.phone)}</a></td></tr>
        </table>
      </div>
      
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2d3748;">📅 Aanvraag details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 5px 0; color: #666;">Datum:</td><td style="padding: 5px 0;"><strong>${sanitizeHtml(customerData.date) || 'Nog niet gekozen'}</strong></td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Aantal personen:</td><td style="padding: 5px 0;"><strong>${customerData.numberOfPeople}</strong></td></tr>
        </table>
      </div>
      
      <div style="background: #edf7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #48bb78;">
        <h3 style="margin-top: 0; color: #276749;">🎯 Aangevraagde activiteiten bij jullie</h3>
        <ul style="padding-left: 20px; margin-bottom: 0;">
          ${activitiesHtml}
        </ul>
      </div>
      
      ${customerData.notes ? `
      <div style="background: #fff8e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f6ad55;">
        <h3 style="margin-top: 0; color: #c05621;">💬 Algemene opmerkingen van de klant</h3>
        <p style="margin-bottom: 0; white-space: pre-line;">${sanitizeHtml(customerData.notes)}</p>
      </div>
      ` : ''}
      
      <div style="background: #ebf8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4299e1;">
        <h3 style="margin-top: 0; color: #2b6cb0;">📋 Partner Portal</h3>
        <p>Je kunt al je aanvragen terugvinden en beheren in de Partner Portal.</p>
        <p style="margin-bottom: 0; text-align: center;">
          <a href="https://bureauvlieland.nl/partner/login" style="display: inline-block; background: #1a365d; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Ga naar Partner Portal</a>
        </p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      
      <p style="color: #666; font-size: 14px;">
        <strong>Dit is een vrijblijvende aanvraag.</strong> Neem contact op met de klant om 
        beschikbaarheid te bevestigen en verdere details te bespreken.
      </p>
      
      <p style="margin-top: 30px;">
        Met vriendelijke groet,<br>
        <strong>Bureau Vlieland</strong><br>
        📧 <a href="mailto:hallo@bureauvlieland.nl" style="color: #0066cc;">hallo@bureauvlieland.nl</a><br>
        📞 0562 700 208
      </p>
    </div>
  `;
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
    const origin = requestData.origin;
    const testMode = isTestMode(origin);
    const subjectPrefix = getSubjectPrefix(origin);
    
    console.log(`Program request received for: ${requestData.email} [Test mode: ${testMode}]`);
    if (testMode) {
      console.log(`[TEST MODE] All partner emails will be redirected to ${TEST_EMAIL}`);
    }

    // Sanitize all string fields
    const safeName = sanitizeHtml(requestData.name);
    const safeCompany = sanitizeHtml(requestData.company);
    const safeEmail = sanitizeHtml(requestData.email);
    const safePhone = sanitizeHtml(requestData.phone);
    const safeNotes = sanitizeHtml(requestData.notes);
    const safeDate = sanitizeHtml(requestData.selectedDate);
    const customerToken = requestData.customerToken || null;
    const portalUrl = customerToken ? `https://bureauvlieland.nl/mijn-programma/${customerToken}` : null;

    const groupedBlocks = groupBlocksByType(requestData.blocks);
    const hasBillableItems = groupedBlocks.bureau.length > 0 || groupedBlocks.partner.length > 0;

    // Build blocks HTML for emails (with time and notes)
    const buildBlocksListHtml = (blocks: BlockItem[], showExternal = false) => {
      return blocks.map(block => {
        const externalLink = showExternal && block.externalUrl 
          ? ` — <a href="${sanitizeHtml(block.externalUrl)}" style="color: #0066cc;">${sanitizeHtml(block.externalUrl)}</a>`
          : '';
        const timeInfo = block.preferredTime 
          ? `<br><span style="color: #666; font-size: 12px;">⏰ Gewenste tijd: ${sanitizeHtml(block.preferredTime)}</span>` 
          : '';
        const notesInfo = block.itemNotes 
          ? `<br><span style="color: #666; font-size: 12px;">💬 ${sanitizeHtml(block.itemNotes)}</span>` 
          : '';
        return `<li style="margin-bottom: 8px;">
          <strong>${sanitizeHtml(block.name)}</strong> (${sanitizeHtml(block.provider)}) — ${sanitizeHtml(block.priceIndication)}${block.priceNote ? ` ${sanitizeHtml(block.priceNote)}` : ''}${externalLink}
          ${timeInfo}
          ${notesInfo}
        </li>`;
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
      <h3>Door te zetten naar partners (email wordt automatisch verstuurd)</h3>
      <ul>${buildBlocksListHtml(groupedBlocks.partner)}</ul>
      ` : ''}
      
      ${groupedBlocks.self_arranged.length > 0 ? `
      <h3>Zelf te regelen door klant</h3>
      <ul>${buildBlocksListHtml(groupedBlocks.self_arranged, true)}</ul>
      ` : ''}
      
      ${safeNotes ? `
      <h3>Algemene opmerkingen / Wensen</h3>
      <p>${safeNotes.replace(/\n/g, '<br>')}</p>
      ` : ''}
    `;

    // Confirmation email to customer (includes external links for self-arranged items)
    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Beste ${safeName},</h2>
        
        <p>Bedankt voor uw programma-aanvraag bij Bureau Vlieland!</p>
        
        <p>Wij hebben uw aanvraag goed ontvangen. De betreffende aanbieders zullen uw aanvraag behandelen en eventueel contact opnemen om details te bespreken. <strong>U betaalt pas na bevestiging</strong> en ontvangt hiervan een factuur van de aanbieder.</p>
        
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2d3748;">Uw aanvraag</h3>
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
          <p style="color: #78350f; font-size: 14px;">Onderstaande onderdelen regelt u zelf. Klik op de links om te boeken:</p>
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
          <h3 style="color: #2d3748;">Uw opmerkingen</h3>
          <p style="color: #4a5568; background: #f7fafc; padding: 15px; border-radius: 8px;">${safeNotes.replace(/\n/g, '<br>')}</p>
        </div>
        ` : ''}
        
        ${portalUrl ? `
        <div style="background-color: #edf2f7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #2d3748;">📊 Volg uw programma</h3>
          <p style="color: #4a5568;">
            Bekijk de status van uw aanvraag en voer eventuele wijzigingen door in uw persoonlijke klantomgeving:
          </p>
          <a href="${portalUrl}" 
             style="display: inline-block; background-color: #1a365d; color: white; 
                    padding: 12px 24px; border-radius: 6px; text-decoration: none; 
                    font-weight: bold; margin-top: 10px;">
            Bekijk uw programma →
          </a>
          <p style="color: #718096; font-size: 12px; margin-top: 15px;">
            Deze link is persoonlijk en 90 dagen geldig.
          </p>
        </div>
        ` : ''}
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p>Heeft u nog vragen? Neem gerust contact met ons op:</p>
        <ul style="list-style: none; padding: 0;">
          <li>📧 Email: <a href="mailto:hallo@bureauvlieland.nl" style="color: #0066cc;">hallo@bureauvlieland.nl</a></li>
          <li>📞 Telefoon: 0562 700 208</li>
        </ul>
        
        <p style="margin-top: 30px;">Met vriendelijke groet,<br><strong>Erwin & Team Bureau Vlieland</strong></p>
      </div>
    `;

    // Generate partner emails (redirected to test email in test mode)
    const providerGroups = groupBlocksByProvider(requestData.blocks);
    const partnerEmails = providerGroups.map(group => ({
      From: {
        Email: "hallo@bureauvlieland.nl",
        Name: "Bureau Vlieland"
      },
      To: [{
        Email: getRecipientEmail(group.providerEmail, origin),
        Name: group.providerName
      }],
      Subject: `${subjectPrefix}Nieuwe aanvraag via Bureau Vlieland - ${group.blocks.map(b => b.name).join(', ')}`,
      HTMLPart: generatePartnerEmailHtml(group, {
        name: safeName,
        company: safeCompany,
        email: safeEmail,
        phone: safePhone,
        date: safeDate,
        numberOfPeople: requestData.numberOfPeople,
        notes: safeNotes,
      }),
    }));

    console.log(`Sending emails: 1 to bureau, 1 to customer, ${partnerEmails.length} to partners ${testMode ? "(TEST MODE - partners redirected)" : ""}`);

    // Send all emails in one batch
    const emailResponse = await sendEmailViaMailjet([
      {
        From: {
          Email: "hallo@bureauvlieland.nl",
          Name: "Bureau Vlieland Website"
        },
        To: [
          {
            Email: "erwin@bureauvlieland.nl",
            Name: "Erwin van der Most"
          }
        ],
        Subject: `${subjectPrefix}Nieuwe programma aanvraag - ${requestData.numberOfPeople} personen`,
        HTMLPart: bureauEmailHtml,
      },
      {
        From: {
          Email: "hallo@bureauvlieland.nl",
          Name: "Bureau Vlieland"
        },
        To: [
          {
            Email: requestData.email,
            Name: requestData.name
          }
        ],
        Subject: `${subjectPrefix}Bevestiging programma aanvraag - Bureau Vlieland`,
        HTMLPart: customerEmailHtml,
      },
      ...partnerEmails
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

Deno.serve(handler);
