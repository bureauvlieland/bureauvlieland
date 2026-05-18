import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";
import {
  formatDateNL,
  getPortalBaseUrl,
  isTestMode,
  getSubjectPrefix,
  getRecipientEmail,
  getRenderedTemplate,
  buildReplyTo,
  SENDER_EMAIL,
  SENDER_NAME,
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
  validUntil: z.string(),
  personalMessage: z.string().optional(),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  origin: z.string().optional(),
  pdfStoragePath: z.string().optional(),
  pdfFilename: z.string().optional(),
  testRecipient: z.string().email().optional(),
});

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

    const { requestId, validUntil, personalMessage, emailSubject, emailBody, origin, pdfStoragePath, pdfFilename, testRecipient } = validationResult.data;
    const isTestEmail = !!testRecipient;
    const testMode = isTestEmail ? false : isTestMode(origin);
    const subjectPrefix = isTestEmail ? "[TEST] " : getSubjectPrefix(origin);

    console.log(`Sending quote offer for request: ${requestId} [Test mode: ${testMode}]`);

    // Fetch the program request
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

    // Fetch items (for logging metadata)
    const { data: items, error: itemsError } = await supabase
      .from("program_request_items")
      .select("block_name, block_category, provider_name, item_quote_status, admin_price_override, quoted_price, preferred_time, price_type, day_index")
      .eq("request_id", requestId)
      .neq("status", "cancelled");

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
    }

    // Build portal URL
    const baseUrl = getPortalBaseUrl(origin);
    const portalUrl = `${baseUrl}/mijn-programma/${programRequest.customer_token}`;

    // Build template variables
    const formattedDates = (programRequest.selected_dates as string[]).map((d: string) => formatDateNL(d)).join(", ");
    
    // Convert admin emailBody (plain text) to HTML for personal_message
    let personalMessageHtml = "";
    if (emailBody) {
      personalMessageHtml = emailBody
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    } else if (personalMessage) {
      personalMessageHtml = personalMessage
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    }

    const templateVars = {
      customer_name: programRequest.customer_name,
      company_name: programRequest.customer_company || "u",
      dates: formattedDates,
      number_of_people: programRequest.number_of_people,
      valid_until: formatDateNL(validUntil),
      portal_url: portalUrl,
      personal_message: personalMessageHtml,
    };

    // Render the database template
    const rendered = await getRenderedTemplate("quote_offer_customer", templateVars);
    
    let emailHtml: string;
    let finalSubject: string;

    if (rendered) {
      emailHtml = rendered.body;
      finalSubject = emailSubject || rendered.subject;
    } else {
      // Fallback if template not found
      console.error("quote_offer_customer template not found, using minimal fallback");
      finalSubject = emailSubject || "Uw maatwerkvoorstel van Bureau Vlieland";
      emailHtml = `<html><body><p>Beste ${programRequest.customer_name},</p><p>Bekijk uw voorstel via: <a href="${portalUrl}">${portalUrl}</a></p></body></html>`;
    }

    // Get recipient email
    const recipientEmail = isTestEmail
      ? testRecipient!
      : getRecipientEmail(programRequest.customer_email, origin);

    const fullSubject = `${subjectPrefix}${finalSubject}`;

    // Build email message
    const replyTo = buildReplyTo(programRequest.reference_number);
    const emailMessage: any = {
      From: {
        Email: SENDER_EMAIL,
        Name: SENDER_NAME,
      },
      ...(replyTo ? { ReplyTo: replyTo } : {}),
      To: [
        {
          Email: recipientEmail,
          Name: programRequest.customer_name,
        },
      ],
      Subject: fullSubject,
      HTMLPart: emailHtml,
    };

    // Handle PDF attachment link
    let quotePdfPath: string | null = pdfStoragePath || null;

    if (pdfStoragePath) {
      try {
        const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: signedData } = await serviceClient.storage
          .from("quote-documents")
          .createSignedUrl(pdfStoragePath, 60 * 60 * 24 * 90);
        if (signedData?.signedUrl) {
          const downloadBlock = `
            <div style="max-width: 600px; margin: 0 auto;">
              <div style="padding: 0 24px 24px 24px;">
                <div style="background: #f0f4f8; padding: 16px; border-radius: 8px; border-left: 4px solid #0F4C5C; text-align: center;">
                  <p style="margin: 0 0 12px 0; color: #0F4C5C; font-weight: 600;">📄 Uw voorstel als PDF</p>
                  <a href="${signedData.signedUrl}" style="display: inline-block; background: #0F4C5C; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 14px;">
                    Download PDF
                  </a>
                </div>
              </div>
            </div>`;
          emailMessage.HTMLPart = emailMessage.HTMLPart.replace("</body>", `${downloadBlock}</body>`);
        }
      } catch (err) {
        console.error("Error generating signed URL:", err);
      }
      console.log(`PDF in storage: ${pdfStoragePath}, download link included in email`);
    }

    // Send the email
    const mailjetResponse = await sendEmailViaMailjet([emailMessage]);

    // Log the email
    const messageId = mailjetResponse?.Messages?.[0]?.MessageID || null;
    await logEmail({
      email_type: "quote_offer_customer",
      subject: fullSubject,
      recipient_email: recipientEmail,
      recipient_name: programRequest.customer_name,
      related_request_id: requestId,
      status: "sent",
      mailjet_message_id: messageId?.toString() || null,
      sent_by: "system",
      metadata: {
        template_name: "quote_offer_customer",
        actor: "admin → klant (offerte)",
        valid_until: validUntil,
        has_custom_body: !!emailBody,
        item_count: items?.length || 0,
        test_mode: testMode,
        has_pdf: !!pdfStoragePath,
      },
    });

    // Update program request status (skip for test emails)
    if (!isTestEmail) {
      const updateData: Record<string, any> = {
        quote_status: "offerte_verstuurd",
        quote_sent_at: new Date().toISOString(),
        quote_valid_until: validUntil,
        quote_personal_message: emailBody || personalMessage || null,
      };
      if (quotePdfPath) {
        updateData.quote_pdf_path = quotePdfPath;
      }

      const { error: updateError } = await supabase
        .from("program_requests")
        .update(updateData)
        .eq("id", requestId);

      if (updateError) {
        console.error("Error updating program request status:", updateError);
      }

      // Mark active items as 'offerte_verstuurd' so klant ziet status "wacht op klant-akkoord"
      const { error: itemsUpdateError } = await supabase
        .from("program_request_items")
        .update({ item_quote_status: "offerte_verstuurd" })
        .eq("request_id", requestId)
        .neq("status", "cancelled")
        .in("item_quote_status", ["concept", "offerte_verstuurd", "in_afstemming"]);

      if (itemsUpdateError) {
        console.error("Error updating item quote statuses:", itemsUpdateError);
      }
    } else {
      console.log("[TEST] Skipping program_requests status update for test email");
    }

    // Resolve the "quote_ready_to_send" auto-todo
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await supabaseAdmin
      .from("admin_todos")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("related_request_id", requestId)
      .eq("auto_type", "quote_ready_to_send")
      .neq("status", "done");

    console.log(`Quote offer sent successfully to ${recipientEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Offerte verstuurd",
        messageId: messageId || null,
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
