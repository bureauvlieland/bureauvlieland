import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  sanitizeHtml,
  formatDateNL,
  formatCurrencyNL,
  getPortalBaseUrl,
  isTestMode,
  getSubjectPrefix,
  getRecipientEmail,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Request schema
const SendQuoteOfferSchema = z.object({
  requestId: z.string().uuid(),
  validUntil: z.string(), // ISO date string
  personalMessage: z.string().optional(),
  origin: z.string().optional(),
  pdfBase64: z.string().optional(), // Base64-encoded PDF
  pdfFilename: z.string().optional(), // PDF filename
});

interface ProgramItem {
  block_name: string;
  block_category: string;
  provider_name: string;
  item_quote_status: string | null;
  admin_price_override: number | null;
  quoted_price: number | null;
  preferred_time: string | null;
  price_type: string | null;
  day_index: number;
}

const sendEmailViaMailjet = async (messages: any[]) => {
  const auth = btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`);

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
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

function generateQuoteEmailHtml(
  customerName: string,
  customerCompany: string | null,
  dates: string[],
  numberOfPeople: number,
  items: ProgramItem[],
  personalMessage: string | null,
  validUntil: string,
  portalUrl: string
): string {
  // Format dates
  const formattedDates = dates
    .map((d) => formatDateNL(d))
    .join(", ");

  // Calculate total estimate
  let totalEstimate = 0;
  // Separate program items and extra costs (day_index = -1)
  const programItems = items.filter((item) => item.item_quote_status !== "cancelled" && item.day_index >= 0);
  const extraCostItems = items.filter((item) => item.day_index === -1);
  
  const itemsHtml = programItems
    .map((item) => {
      const price = item.admin_price_override ?? item.quoted_price;
      const isPerPerson = !item.price_type || item.price_type === "per_person";
      const priceStr = price ? formatCurrencyNL(price) : "Op aanvraag";
      const priceLabel = isPerPerson ? "p.p." : "";
      if (price) {
        totalEstimate += isPerPerson ? price * numberOfPeople : price;
      }

      const statusLabel =
        item.item_quote_status === "bevestigd"
          ? '<span style="color: #059669;">✓ Bevestigd</span>'
          : item.item_quote_status === "optioneel"
          ? '<span style="color: #d97706;">○ Optioneel</span>'
          : "";

      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>${sanitizeHtml(item.block_name)}</strong><br>
            <span style="color: #6b7280; font-size: 13px;">${sanitizeHtml(item.provider_name)}</span>
            ${item.preferred_time ? `<br><span style="color: #6b7280; font-size: 12px;">⏰ ${sanitizeHtml(item.preferred_time)}</span>` : ""}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${priceStr}${priceLabel ? ` ${priceLabel}` : ""}<br>
            <span style="font-size: 12px;">${statusLabel}</span>
          </td>
        </tr>
      `;
    })
    .join("");

  // Add extra costs to total
  const extraCostsTotal = extraCostItems.reduce((sum, item) => sum + (item.admin_price_override ?? 0), 0);
  totalEstimate += extraCostsTotal;

  // Extra costs HTML
  const extraCostsHtml = extraCostItems.length > 0 ? extraCostItems.map((item) => {
    const price = item.admin_price_override ?? 0;
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${sanitizeHtml(item.block_name)}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${formatCurrencyNL(price)}
        </td>
      </tr>
    `;
  }).join("") : "";

  const personalMessageHtml = personalMessage
    ? `
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; white-space: pre-line;">${sanitizeHtml(personalMessage)}</p>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Uw Maatwerkvoorstel</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0 0;">Bureau Vlieland</p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          <p>Beste ${sanitizeHtml(customerName)},</p>

          <p>Hierbij ontvangt u ons maatwerkvoorstel voor uw evenement op Vlieland. 
          Wij hebben dit programma speciaal voor ${customerCompany ? sanitizeHtml(customerCompany) : "u"} samengesteld.</p>

          ${personalMessageHtml}

          <!-- Program details -->
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px 0; color: #374151;">Programma details</h3>
            <table style="width: 100%;">
              <tr>
                <td style="color: #6b7280; padding: 4px 0;">Datum:</td>
                <td style="text-align: right; font-weight: 600;">${formattedDates}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding: 4px 0;">Aantal personen:</td>
                <td style="text-align: right; font-weight: 600;">${numberOfPeople}</td>
              </tr>
            </table>
          </div>

          <!-- Items table -->
          <h3 style="margin: 24px 0 12px 0; color: #374151;">Programma-onderdelen</h3>
          <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Activiteit</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Prijs</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              ${extraCostsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #f9fafb;">
                <td style="padding: 12px; font-weight: 600;">Geschat totaal (${numberOfPeople} pers.)</td>
                <td style="padding: 12px; text-align: right; font-weight: 600; color: #1e3a5f;">
                  ${formatCurrencyNL(totalEstimate)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">
            * Prijzen zijn onder voorbehoud van wijzigingen en exclusief eventuele aanpassingen.
          </p>

          <!-- Validity info -->
          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #78350f;">
              <strong>Dit voorstel is geldig tot ${formatDateNL(validUntil)}</strong><br>
              Bent u akkoord? Bevestig het voorstel in uw klantomgeving. 
              Hierna worden de leveranciers op de hoogte gebracht.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${portalUrl}" style="display: inline-block; background: #1e3a5f; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Bekijk voorstel & geef akkoord
            </a>
          </div>

          <p style="color: #6b7280;">
            Heeft u vragen over dit voorstel? Neem gerust contact met ons op. 
            Wij helpen u graag verder!
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

          <p style="margin-bottom: 0;">
            Met vriendelijke groet,<br>
            <strong>Bureau Vlieland</strong><br>
            📧 <a href="mailto:hallo@bureauvlieland.nl" style="color: #1e3a5f;">hallo@bureauvlieland.nl</a><br>
            📞 0562 700 208
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 24px; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">
            Dit is een automatisch gegenereerde e-mail van Bureau Vlieland.<br>
            Volg de link in deze mail om uw voorstel te bekijken.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    const rawData = await req.json();
    const validationResult = SendQuoteOfferSchema.safeParse(rawData);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ");
      return new Response(JSON.stringify({ error: `Validatiefout: ${errors}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { requestId, validUntil, personalMessage, origin, pdfBase64, pdfFilename } = validationResult.data;
    const testMode = isTestMode(origin);
    const subjectPrefix = getSubjectPrefix(origin);

    console.log(`Sending quote offer for request: ${requestId} [Test mode: ${testMode}]`);

    // Fetch the program request with items
    const { data: programRequest, error: fetchError } = await supabase
      .from("program_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !programRequest) {
      console.error("Error fetching program request:", fetchError);
      return new Response(JSON.stringify({ error: "Aanvraag niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from("program_request_items")
      .select("block_name, block_category, provider_name, item_quote_status, admin_price_override, quoted_price, preferred_time, price_type, day_index")
      .eq("request_id", requestId)
      .neq("status", "cancelled");

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
      return new Response(JSON.stringify({ error: "Fout bij ophalen onderdelen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build portal URL
    const baseUrl = getPortalBaseUrl(origin);
    const portalUrl = `${baseUrl}/mijn-programma/${programRequest.customer_token}`;

    // Generate email HTML
    const emailHtml = generateQuoteEmailHtml(
      programRequest.customer_name,
      programRequest.customer_company,
      programRequest.selected_dates as string[],
      programRequest.number_of_people,
      items || [],
      personalMessage || null,
      validUntil,
      portalUrl
    );

    // Get recipient email (redirect in test mode)
    const recipientEmail = getRecipientEmail(programRequest.customer_email, origin);

    // Build email message with optional PDF attachment
    const emailMessage: any = {
      From: {
        Email: "noreply@bureauvlieland.nl",
        Name: "Bureau Vlieland",
      },
      To: [
        {
          Email: recipientEmail,
          Name: programRequest.customer_name,
        },
      ],
      Subject: `${subjectPrefix}Uw maatwerkvoorstel van Bureau Vlieland`,
      HTMLPart: emailHtml,
    };

    // Add PDF attachment if provided
    if (pdfBase64 && pdfFilename) {
      emailMessage.Attachments = [
        {
          ContentType: "application/pdf",
          Filename: pdfFilename,
          Base64Content: pdfBase64,
        },
      ];
      console.log(`Attaching PDF: ${pdfFilename} (${Math.round(pdfBase64.length / 1024)}KB base64)`);
    }

    // Send the email
    const mailjetResponse = await sendEmailViaMailjet([emailMessage]);

    // Log the email
    const messageId = mailjetResponse?.Messages?.[0]?.MessageID || null;
    await logEmail({
      email_type: "quote_offer_customer",
      subject: `${subjectPrefix}Uw maatwerkvoorstel van Bureau Vlieland`,
      recipient_email: recipientEmail,
      recipient_name: programRequest.customer_name,
      related_request_id: requestId,
      status: "sent",
      mailjet_message_id: messageId?.toString() || null,
      sent_by: "system",
      metadata: {
        valid_until: validUntil,
        has_personal_message: !!personalMessage,
        item_count: items?.length || 0,
        test_mode: testMode,
      },
    });

    // Update program request status to 'offerte_verstuurd'
    const { error: updateError } = await supabase
      .from("program_requests")
      .update({
        quote_status: "offerte_verstuurd",
        quote_sent_at: new Date().toISOString(),
        quote_valid_until: validUntil,
        quote_personal_message: personalMessage || null,
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Error updating program request status:", updateError);
      // Don't fail the request, email was already sent
    }

    console.log(`Quote offer sent successfully to ${recipientEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Offerte verstuurd",
        messageId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-quote-offer:", error);
    return new Response(
      JSON.stringify({ error: "Er ging iets mis bij het versturen van de offerte" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
