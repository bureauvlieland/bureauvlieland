// Deprecated: import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRecipientEmail, getSubjectPrefix, buildReplyTo } from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

async function sendEmailNotification(
  to: string,
  toName: string,
  subject: string,
  htmlContent: string,
  referenceNumber?: string | null
) {
  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
    console.error("Mailjet credentials not configured");
    return false;
  }

  try {
    const replyTo = buildReplyTo(referenceNumber);
    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: "hallo@bureauvlieland.nl",
              Name: "Bureau Vlieland",
            },
            To: [{ Email: to, Name: toName }],
            ...(replyTo ? { ReplyTo: replyTo } : {}),
            Subject: subject,
            HTMLPart: htmlContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Mailjet error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reqBody = await req.json();
    const { partnerToken, itemId, invoicedAmount, invoicedNumber, invoicedDate, notes, filePath } = reqBody;
    const origin = reqBody.origin || req.headers.get("origin") || "";

    if (!partnerToken || !itemId || !invoicedAmount || !invoicedNumber || !invoicedDate) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify partner token
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("*")
      .eq("partner_token", partnerToken)
      .eq("is_active", true)
      .single();

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: "Invalid partner token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Guard: Bureau Vlieland is de centrale facturerende partij — kan geen inkoopfactuur aan zichzelf registreren
    if (partner.id === "bureau") {
      return new Response(
        JSON.stringify({ error: "Bureau Vlieland kan geen inkoopfactuur aan zichzelf registreren. Bureau-managed items lopen via de verkoopfacturen (bureau_invoices)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify item belongs to this partner and get invoicing_mode
    const { data: item, error: itemError } = await supabase
      .from("program_request_items")
      .select("*, program_requests!inner(id, customer_name, customer_email, customer_company, selected_dates, invoicing_mode, reference_number)")
      .eq("id", itemId)
      .eq("provider_id", partner.id)
      .single();

    if (itemError || !item) {
      return new Response(
        JSON.stringify({ error: "Item not found or not assigned to this partner" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const invoicingMode = item.program_requests.invoicing_mode || "bureau_central";

    // Calculate commission
    const commissionPercentage = partner.commission_percentage;
    const commissionAmount = (invoicedAmount * commissionPercentage) / 100;

    // Calculate VAT (assume 21% for activities)
    const vatRate = 21;
    const vatAmount = invoicedAmount * (vatRate / 100);
    const amountInclVat = invoicedAmount + vatAmount;

    // If bureau_central mode, create a purchase invoice record instead of just updating the item
    if (invoicingMode === "bureau_central") {
      // Create purchase invoice record
      const { error: purchaseError } = await supabase
        .from("partner_purchase_invoices")
        .insert({
          request_id: item.request_id,
          item_id: itemId,
          partner_id: partner.id,
          invoice_number: invoicedNumber,
          invoice_date: invoicedDate,
          amount_excl_vat: invoicedAmount,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          amount_incl_vat: amountInclVat,
          description: `${item.block_name} - ${item.program_requests.customer_company || item.program_requests.customer_name}`,
          file_path: filePath || null,
          status: "pending",
          registered_by: "partner",
        });

      if (purchaseError) {
        console.error("Error creating purchase invoice:", purchaseError);
        return new Response(
          JSON.stringify({ error: "Failed to register purchase invoice" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update item with invoice details (for both modes)
    const { error: updateError } = await supabase
      .from("program_request_items")
      .update({
        invoiced_amount: invoicedAmount,
        invoiced_number: invoicedNumber,
        invoiced_date: invoicedDate,
        invoiced_file_path: filePath || null,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        commission_status: commissionPercentage > 0 ? "pending" : "not_applicable",
        commission_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (updateError) {
      console.error("Error updating item:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to register invoice" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log to history
    await supabase.from("program_request_history").insert({
      request_id: item.request_id,
      item_id: itemId,
      action: invoicingMode === "bureau_central" ? "purchase_invoice_registered" : "invoice_registered",
      actor: "partner",
      actor_name: partner.name,
      new_value: {
        invoiced_amount: invoicedAmount,
        invoiced_number: invoicedNumber,
        invoiced_date: invoicedDate,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        invoicing_mode: invoicingMode,
      },
      notes: invoicingMode === "bureau_central" 
        ? `Partner heeft inkoopfactuur ${invoicedNumber} geregistreerd aan Bureau Vlieland (€${invoicedAmount})`
        : `Partner heeft factuur ${invoicedNumber} geregistreerd (€${invoicedAmount})`,
    });

    // Create auto todo for commission handling if commission > 0
    if (commissionPercentage > 0 && commissionAmount > 0) {
      const { data: existingTodo } = await supabase
        .from("admin_todos")
        .select("id")
        .eq("auto_type", "commission_pending")
        .eq("auto_entity_id", itemId)
        .neq("status", "done")
        .maybeSingle();
      
      if (!existingTodo) {
        await supabase.from("admin_todos").insert({
          title: `Commissie factureren: ${partner.name} - €${commissionAmount.toFixed(2)}`,
          description: `Partner ${partner.name} heeft factuur ${invoicedNumber} geregistreerd voor activiteit "${item.block_name}". Commissie van ${commissionPercentage}% moet worden gefactureerd.`,
          priority: "normal",
          status: "todo",
          related_request_id: item.request_id,
          related_partner_id: partner.id,
          auto_type: "commission_pending",
          auto_entity_id: itemId,
        });
        console.log(`Created commission_pending todo for item ${itemId}`);
      }
    }

    // Create auto todo for purchase invoice processing if bureau_central
    if (invoicingMode === "bureau_central") {
      await supabase.from("admin_todos").insert({
        title: `Inkoopfactuur verwerken: ${partner.name} - ${invoicedNumber}`,
        description: `Partner ${partner.name} heeft inkoopfactuur ${invoicedNumber} (€${invoicedAmount}) geregistreerd voor project ${item.program_requests.reference_number || item.request_id}. Factuur doorsturen naar Snelstart.`,
        priority: "normal",
        status: "todo",
        related_request_id: item.request_id,
        related_partner_id: partner.id,
        auto_type: "purchase_invoice_pending",
        auto_entity_id: itemId,
      });
    }

    // Send notification email to Bureau Vlieland
    const customerName = item.program_requests.customer_company || item.program_requests.customer_name;
    const activityDate = item.program_requests.selected_dates?.[item.day_index] || "Onbekend";
    
    const bureauEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Nieuwe factuurregistratie</h2>
        
        <p><strong>${partner.name}</strong> heeft een factuur geregistreerd.</p>
        
        <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2d3748;">Factuurgegevens</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #718096;">Factuurnummer:</td>
              <td style="padding: 8px 0; font-weight: bold;">${invoicedNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096;">Bedrag excl. BTW:</td>
              <td style="padding: 8px 0; font-weight: bold;">€${invoicedAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096;">Factuurdatum:</td>
              <td style="padding: 8px 0;">${invoicedDate}</td>
            </tr>
            ${commissionPercentage > 0 ? `
            <tr>
              <td style="padding: 8px 0; color: #718096;">Commissie (${commissionPercentage}%):</td>
              <td style="padding: 8px 0; font-weight: bold; color: #2b6cb0;">€${commissionAmount.toFixed(2)}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="background: #edf2f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2d3748;">Activiteit</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #718096;">Activiteit:</td>
              <td style="padding: 8px 0;">${item.block_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096;">Klant:</td>
              <td style="padding: 8px 0;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096;">Datum:</td>
              <td style="padding: 8px 0;">${activityDate}</td>
            </tr>
          </table>
        </div>
        
        ${notes ? `
        <div style="background: #fffaf0; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong>Opmerking partner:</strong><br/>
          ${notes}
        </div>
        ` : ''}
        
        ${commissionPercentage > 0 ? `
        <p style="color: #718096; font-size: 14px;">
          💰 Deze commissie staat klaar om gefactureerd te worden in het admin dashboard.
        </p>
        ` : ''}
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #a0aec0; font-size: 12px;">
          Dit is een automatisch bericht van Bureau Vlieland.
        </p>
      </div>
    `;

    const bureauRecipient = getRecipientEmail("erwin@bureauvlieland.nl", origin);
    const bureauSubject = `${getSubjectPrefix(origin)}Factuur geregistreerd: ${partner.name} - ${item.block_name}`;
    const sendOk = await sendEmailNotification(
      bureauRecipient,
      "Bureau Vlieland",
      bureauSubject,
      bureauEmailHtml,
      item.program_requests?.reference_number || null
    );

    await logEmail({
      email_type: "partner_invoice_registered_bureau",
      recipient_email: bureauRecipient,
      recipient_name: "Bureau Vlieland",
      subject: bureauSubject,
      status: sendOk ? "sent" : "failed",
      sent_by: "system",
      related_request_id: item.request_id,
      related_partner_id: partner.id,
      related_item_id: itemId,
      metadata: {
        template_name: "partner_invoice_registered_bureau",
        actor: "partner → bureau",
        invoicedNumber,
        invoicedAmount,
        commissionAmount,
        invoicingMode,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        commission: {
          percentage: commissionPercentage,
          amount: commissionAmount,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in register-partner-invoice:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
