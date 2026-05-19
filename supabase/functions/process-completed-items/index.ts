import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getRenderedTemplate, 
  formatCurrencyNL, 
  formatDateNL,
  getPortalBaseUrl,
  getSubjectPrefix,
  getRecipientEmail,
  buildReplyTo,
} from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessResult {
  activitiesProcessed: number;
  accommodationsProcessed: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const origin = req.headers.get("origin") || "https://bureauvlieland.nl";
    const result: ProcessResult = {
      activitiesProcessed: 0,
      accommodationsProcessed: 0,
      errors: [],
    };

    // Get pro forma deadline days from app_settings
    const { data: deadlineSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("id", "proforma_deadline_days")
      .single();
    
    const deadlineDays = (deadlineSetting?.value as number) || 7;

    // ============================================
    // PROCESS EXECUTED ACTIVITY ITEMS
    // ============================================
    const { data: executedItems, error: itemsError } = await supabase
      .from("program_request_items")
      .select(`
        *,
        program_requests (
          id,
          customer_name,
          customer_company,
          selected_dates,
          reference_number
        )
      `)
      .eq("status", "executed")
      .is("proforma_sent_at", null)
      .not("quoted_price", "is", null);

    if (itemsError) {
      console.error("Error fetching executed items:", itemsError);
      result.errors.push(`Failed to fetch executed items: ${itemsError.message}`);
    } else if (executedItems && executedItems.length > 0) {
      console.log(`Found ${executedItems.length} executed items to process`);

      for (const item of executedItems) {
        try {
          // Get partner info for email
          const { data: partner } = await supabase
            .from("partners")
            .select("name, email, contact_email, partner_token, commission_percentage")
            .eq("id", item.provider_id)
            .single();

          if (!partner) {
            result.errors.push(`Partner not found for item ${item.id}`);
            continue;
          }

          // Calculate amounts
          const vatRate = 21; // Activities use 21% VAT
          const quotedPrice = item.quoted_price!;
          const amountExclVat = quotedPrice / (1 + vatRate / 100);
          const commissionPercentage = item.commission_percentage ?? partner.commission_percentage ?? 15;
          const commissionAmount = amountExclVat * (commissionPercentage / 100);

          // Calculate deadline
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + deadlineDays);
          const deadlineDate = deadline.toISOString().split("T")[0];

          // Update item with pro forma data
          const { error: updateError } = await supabase
            .from("program_request_items")
            .update({
              proforma_sent_at: new Date().toISOString(),
              proforma_amount_excl_vat: Math.round(amountExclVat * 100) / 100,
              proforma_commission: Math.round(commissionAmount * 100) / 100,
              proforma_deadline: deadlineDate,
              commission_status: "pending_confirmation",
            })
            .eq("id", item.id);

          if (updateError) {
            result.errors.push(`Failed to update item ${item.id}: ${updateError.message}`);
            continue;
          }

          // Get activity date from request
          const dates = (item.program_requests?.selected_dates as string[]) || [];
          const activityDate = dates[item.day_index] || dates[0];

          // Send pro forma email
          const portalLink = `${getPortalBaseUrl(origin)}/partner`;
          const completionText = `De activiteit "${item.block_name}" voor ${item.program_requests?.customer_name} is uitgevoerd${activityDate ? ` op ${formatDateNL(activityDate)}` : ""}.`;

          const template = await getRenderedTemplate("proforma_commission_notification", {
            partner_name: partner.name,
            customer_name: item.program_requests?.customer_name || "Klant",
            item_name: item.block_name,
            completion_text: completionText,
            quoted_amount_incl: formatCurrencyNL(quotedPrice).replace("€", "").trim(),
            amount_excl_vat: formatCurrencyNL(amountExclVat).replace("€", "").trim(),
            vat_rate: String(vatRate),
            commission_percentage: String(commissionPercentage),
            commission_amount: formatCurrencyNL(commissionAmount).replace("€", "").trim(),
            deadline_date: formatDateNL(deadlineDate),
            partner_portal_link: portalLink,
          });

          if (template) {
            const mailjetApiKey = Deno.env.get("MAILJET_API_KEY");
            const mailjetSecretKey = Deno.env.get("MAILJET_SECRET_KEY");

            if (mailjetApiKey && mailjetSecretKey) {
              const recipientEmail = getRecipientEmail(partner.contact_email || partner.email, origin);
              const subjectPrefix = getSubjectPrefix(origin);

              const programRef = item.program_requests?.reference_number;
              const replyTo = buildReplyTo(programRef);

              const emailResponse = await fetch("https://api.mailjet.com/v3.1/send", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Basic ${btoa(`${mailjetApiKey}:${mailjetSecretKey}`)}`,
                },
                body: JSON.stringify({
                  Messages: [{
                    From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
                    To: [{ Email: recipientEmail, Name: partner.name }],
                    ...(replyTo ? { ReplyTo: replyTo } : {}),
                    Subject: `${subjectPrefix}${template.subject}`,
                    HTMLPart: template.body,
                  }],
                }),
              });

              if (emailResponse.ok) {
                // Log email
                await supabase.from("email_log").insert({
                  email_type: "proforma_commission_notification",
                  subject: `${subjectPrefix}${template.subject}`,
                  recipient_email: recipientEmail,
                  recipient_name: partner.name,
                  related_item_id: item.id,
                  related_request_id: item.request_id,
                  related_partner_id: item.provider_id,
                  status: "sent",
                  sent_at: new Date().toISOString(),
                  metadata: { 
                    type: "activity",
                    commission_amount: commissionAmount,
                    deadline: deadlineDate,
                  },
                });
              }
            }
          }

          result.activitiesProcessed++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Error processing item ${item.id}:`, err);
          result.errors.push(`Error processing item ${item.id}: ${message}`);
        }
      }
    }

    // ============================================
    // PROCESS SELECTED ACCOMMODATION QUOTES (AFTER DEPARTURE)
    // ============================================
    const today = new Date().toISOString().split("T")[0];
    
    const { data: selectedQuotes, error: quotesError } = await supabase
      .from("accommodation_quotes")
      .select(`
        *,
        accommodation_requests (
          id,
          customer_name,
          customer_company,
          arrival_date,
          departure_date,
          number_of_guests,
          reference_number
        )
      `)
      .eq("status", "selected")
      .is("proforma_sent_at", null)
      .not("price_total", "is", null);

    if (quotesError) {
      console.error("Error fetching accommodation quotes:", quotesError);
      result.errors.push(`Failed to fetch accommodation quotes: ${quotesError.message}`);
    } else if (selectedQuotes && selectedQuotes.length > 0) {
      // Filter for departed stays
      const departedQuotes = selectedQuotes.filter(q => {
        const departureDate = q.accommodation_requests?.departure_date;
        return departureDate && departureDate < today;
      });

      console.log(`Found ${departedQuotes.length} departed accommodation quotes to process`);

      for (const quote of departedQuotes) {
        try {
          // Get partner info
          const { data: partner } = await supabase
            .from("partners")
            .select("name, email, contact_email, partner_token, accommodation_commission_percentage, commission_percentage")
            .eq("id", quote.partner_id)
            .single();

          if (!partner) {
            result.errors.push(`Partner not found for quote ${quote.id}`);
            continue;
          }

          // Calculate amounts including extras
          const vatRate = quote.vat_rate ?? 9; // Accommodation uses 9% VAT default
          const basePrice = quote.price_total;

          // Fetch extras for grand total
          const { data: quoteExtras } = await supabase
            .from("accommodation_quote_extras")
            .select("unit_price, quantity, pricing_type")
            .eq("quote_id", quote.id);
          const extrasTotal = (quoteExtras || []).reduce((sum: number, e: any) =>
            sum + (e.pricing_type === "fixed" ? e.unit_price : e.unit_price * e.quantity), 0);
          const priceTotal = basePrice + extrasTotal;

          const amountExclVat = quote.price_includes_vat 
            ? priceTotal / (1 + vatRate / 100)
            : priceTotal;
          const commissionPercentage = quote.commission_percentage 
            ?? partner.accommodation_commission_percentage 
            ?? 10;
          const commissionAmount = amountExclVat * (commissionPercentage / 100);

          // Calculate deadline
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + deadlineDays);
          const deadlineDate = deadline.toISOString().split("T")[0];

          // Update quote with pro forma data
          const { error: updateError } = await supabase
            .from("accommodation_quotes")
            .update({
              proforma_sent_at: new Date().toISOString(),
              proforma_amount_excl_vat: Math.round(amountExclVat * 100) / 100,
              proforma_commission: Math.round(commissionAmount * 100) / 100,
              proforma_deadline: deadlineDate,
              commission_status: "pending_confirmation",
            })
            .eq("id", quote.id);

          if (updateError) {
            result.errors.push(`Failed to update quote ${quote.id}: ${updateError.message}`);
            continue;
          }

          // Send pro forma email
          const portalLink = `${getPortalBaseUrl(origin)}/partner`;
          const request = quote.accommodation_requests;
          const completionText = `Het verblijf van ${request?.customer_name} bij ${quote.accommodation_name} is afgerond (${formatDateNL(request?.arrival_date || "")} - ${formatDateNL(request?.departure_date || "")}).`;
          const priceInclVat = quote.price_includes_vat ? priceTotal : priceTotal * (1 + vatRate / 100);

          const template = await getRenderedTemplate("proforma_commission_notification", {
            partner_name: partner.name,
            customer_name: request?.customer_name || "Klant",
            item_name: quote.accommodation_name,
            completion_text: completionText,
            quoted_amount_incl: formatCurrencyNL(priceInclVat).replace("€", "").trim(),
            amount_excl_vat: formatCurrencyNL(amountExclVat).replace("€", "").trim(),
            vat_rate: String(vatRate),
            commission_percentage: String(commissionPercentage),
            commission_amount: formatCurrencyNL(commissionAmount).replace("€", "").trim(),
            deadline_date: formatDateNL(deadlineDate),
            partner_portal_link: portalLink,
          });

          if (template) {
            const mailjetApiKey = Deno.env.get("MAILJET_API_KEY");
            const mailjetSecretKey = Deno.env.get("MAILJET_SECRET_KEY");

            if (mailjetApiKey && mailjetSecretKey) {
              const recipientEmail = getRecipientEmail(partner.contact_email || partner.email, origin);
              const subjectPrefix = getSubjectPrefix(origin);

              const accReplyTo = buildReplyTo(request?.reference_number);
              
              const emailResponse = await fetch("https://api.mailjet.com/v3.1/send", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Basic ${btoa(`${mailjetApiKey}:${mailjetSecretKey}`)}`,
                },
                body: JSON.stringify({
                  Messages: [{
                    From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland" },
                    To: [{ Email: recipientEmail, Name: partner.name }],
                    ...(accReplyTo ? { ReplyTo: accReplyTo } : {}),
                    Subject: `${subjectPrefix}${template.subject}`,
                    HTMLPart: template.body,
                  }],
                }),
              });

              if (emailResponse.ok) {
                // Log email
                await supabase.from("email_log").insert({
                  email_type: "proforma_commission_notification",
                  subject: `${subjectPrefix}${template.subject}`,
                  recipient_email: recipientEmail,
                  recipient_name: partner.name,
                  related_accommodation_id: request?.id,
                  related_partner_id: quote.partner_id,
                  status: "sent",
                  sent_at: new Date().toISOString(),
                  metadata: { 
                    type: "accommodation",
                    quote_id: quote.id,
                    commission_amount: commissionAmount,
                    deadline: deadlineDate,
                  },
                });
              }
            }
          }

          result.accommodationsProcessed++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Error processing quote ${quote.id}:`, err);
          result.errors.push(`Error processing quote ${quote.id}: ${message}`);
        }
      }
    }

    console.log("Process completed items result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in process-completed-items:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
