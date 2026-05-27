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
          { TrackClicks: "disabled", TrackOpens: "disabled",
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
    const {
      partnerToken,
      invoicedNumber,
      invoicedDate,
      notes,
      filePath,
      // Legacy single-item mode:
      itemId,
      invoicedAmount,
      // New collective mode (preferred):
      items, // [{ itemId, amount }]
    } = reqBody;
    const origin = reqBody.origin || req.headers.get("origin") || "";

    // Normalize to items[] array. Legacy single-item callers still supported.
    const itemsList: Array<{ itemId: string; amount: number; vatRate: number }> =
      Array.isArray(items) && items.length > 0
        ? items
            .filter((x: any) => x && x.itemId && Number(x.amount) > 0)
            .map((x: any) => ({
              itemId: String(x.itemId),
              amount: Number(x.amount),
              vatRate: x.vatRate !== undefined && x.vatRate !== null ? Number(x.vatRate) : 21,
            }))
        : itemId && Number(invoicedAmount) > 0
          ? [{ itemId: String(itemId), amount: Number(invoicedAmount), vatRate: 21 }]
          : [];

    if (!partnerToken || !invoicedNumber || !invoicedDate || itemsList.length === 0) {
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

    if (partner.id === "bureau") {
      return new Response(
        JSON.stringify({ error: "Bureau Vlieland kan geen inkoopfactuur aan zichzelf registreren." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all items, verify they belong to this partner and share the same project
    const itemIds = itemsList.map((x) => x.itemId);
    const { data: dbItems, error: itemsError } = await supabase
      .from("program_request_items")
      .select("*, program_requests!inner(id, customer_name, customer_email, customer_company, selected_dates, invoicing_mode, reference_number)")
      .in("id", itemIds)
      .eq("provider_id", partner.id);

    if (itemsError || !dbItems || dbItems.length !== itemsList.length) {
      return new Response(
        JSON.stringify({ error: "One or more items not found or not assigned to this partner" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All items must belong to the same project (1 project per verzamelfactuur).
    const requestIds = Array.from(new Set(dbItems.map((i: any) => i.request_id)));
    if (requestIds.length !== 1) {
      return new Response(
        JSON.stringify({ error: "Een verzamelfactuur mag maar één project bevatten." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const requestId = requestIds[0];
    const project = dbItems[0].program_requests;

    const invoicingMode = project.invoicing_mode || "bureau_central";
    const commissionPercentage = partner.commission_percentage;

    // Build allocations + totals. VAT rate comes per item from the client
    // (derived from the building block); default to 21% for safety.
    const infoByItem = new Map(itemsList.map((x) => [x.itemId, x]));
    let totalExcl = 0;
    let totalVat = 0;
    const allocations = dbItems.map((it: any, idx: number) => {
      const info = infoByItem.get(it.id);
      const amt = Number(info?.amount || 0);
      const rate = Number(info?.vatRate ?? 21);
      const vatAmt = +(amt * (rate / 100)).toFixed(2);
      totalExcl += amt;
      totalVat += vatAmt;
      return {
        item_id: it.id,
        amount_excl_vat: amt,
        vat_rate: rate,
        vat_amount: vatAmt,
        amount_incl_vat: +(amt + vatAmt).toFixed(2),
        sort_order: idx,
      };
    });
    totalExcl = +totalExcl.toFixed(2);
    totalVat = +totalVat.toFixed(2);
    const totalIncl = +(totalExcl + totalVat).toFixed(2);
    // Header VAT rate: use first allocation's rate if uniform, else 0 (mixed)
    const uniqueRates = Array.from(new Set(allocations.map((a) => a.vat_rate)));
    const headerVatRate = uniqueRates.length === 1 ? uniqueRates[0] : 0;
    const totalCommission = +((totalExcl * commissionPercentage) / 100).toFixed(2);

    const isCollective = dbItems.length > 1;
    const headerDescription = isCollective
      ? `Verzamelfactuur ${dbItems.length} onderdelen — ${project.customer_company || project.customer_name}${project.reference_number ? ` (${project.reference_number})` : ""}`
      : `${dbItems[0].block_name} — ${project.customer_company || project.customer_name}`;

    // Create ONE purchase invoice header (bureau_central is the default; we always store it
    // so admin has a single source of truth, regardless of mode).
    const { data: newInvoice, error: purchaseError } = await supabase
      .from("partner_purchase_invoices")
      .insert({
        request_id: requestId,
        item_id: isCollective ? null : dbItems[0].id,
        partner_id: partner.id,
        invoice_number: invoicedNumber,
        invoice_date: invoicedDate,
        amount_excl_vat: totalExcl,
        vat_rate: headerVatRate,
        vat_amount: totalVat,
        amount_incl_vat: totalIncl,
        description: headerDescription,
        file_path: filePath || null,
        status: "pending",
        registered_by: "partner",
      })
      .select()
      .single();

    if (purchaseError || !newInvoice) {
      console.error("Error creating purchase invoice:", purchaseError);
      return new Response(
        JSON.stringify({ error: "Failed to register purchase invoice" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert allocations (always — even with one item, so the data shape is consistent)
    const allocationRows = allocations.map((a) => ({ ...a, invoice_id: newInvoice.id }));
    const { error: allocErr } = await supabase
      .from("partner_purchase_invoice_allocations")
      .insert(allocationRows);
    if (allocErr) {
      console.error("Error inserting allocations:", allocErr);
      // Non-fatal: header is created. Roll back to keep data clean.
      await supabase.from("partner_purchase_invoices").delete().eq("id", newInvoice.id);
      return new Response(
        JSON.stringify({ error: "Failed to register invoice allocations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update each program_request_items row with denormalized invoice metadata
    // so existing UI (admin + partner) keeps working until fully migrated.
    for (const a of allocations) {
      const itemCommission = +((a.amount_excl_vat * commissionPercentage) / 100).toFixed(2);
      await supabase
        .from("program_request_items")
        .update({
          invoiced_amount: a.amount_excl_vat,
          invoiced_number: invoicedNumber,
          invoiced_date: invoicedDate,
          invoiced_file_path: filePath || null,
          commission_percentage: commissionPercentage,
          commission_amount: itemCommission,
          commission_status: commissionPercentage > 0 ? "pending" : "not_applicable",
          commission_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", a.item_id);
    }

    // Log to history (one entry per item)
    for (const a of allocations) {
      const it = dbItems.find((i: any) => i.id === a.item_id);
      await supabase.from("program_request_history").insert({
        request_id: requestId,
        item_id: a.item_id,
        action: "purchase_invoice_registered",
        actor: "partner",
        actor_name: partner.name,
        new_value: {
          invoice_id: newInvoice.id,
          invoiced_amount: a.amount_excl_vat,
          invoiced_number: invoicedNumber,
          invoiced_date: invoicedDate,
          commission_percentage: commissionPercentage,
          collective: isCollective,
        },
        notes: isCollective
          ? `Partner heeft onderdeel "${it?.block_name}" gefactureerd op verzamelfactuur ${invoicedNumber} (€${a.amount_excl_vat})`
          : `Partner heeft inkoopfactuur ${invoicedNumber} geregistreerd aan Bureau Vlieland (€${a.amount_excl_vat})`,
      });
    }

    // Commission todo (once per invoice)
    if (commissionPercentage > 0 && totalCommission > 0) {
      await supabase.from("admin_todos").insert({
        title: `Commissie factureren: ${partner.name} - €${totalCommission.toFixed(2)}`,
        description: `Partner ${partner.name} heeft factuur ${invoicedNumber} geregistreerd (${dbItems.length} onderdeel${dbItems.length > 1 ? "en" : ""}) voor project ${project.reference_number || requestId}. Commissie van ${commissionPercentage}% moet worden gefactureerd.`,
        priority: "normal",
        status: "todo",
        related_request_id: requestId,
        related_partner_id: partner.id,
        auto_type: "commission_pending",
        auto_entity_id: newInvoice.id,
      });
    }

    // Purchase invoice processing todo (once per invoice)
    if (invoicingMode === "bureau_central") {
      await supabase.from("admin_todos").insert({
        title: `Inkoopfactuur verwerken: ${partner.name} - ${invoicedNumber}`,
        description: `Partner ${partner.name} heeft inkoopfactuur ${invoicedNumber} (€${totalExcl}) geregistreerd voor project ${project.reference_number || requestId}. Factuur doorsturen naar Snelstart.`,
        priority: "normal",
        status: "todo",
        related_request_id: requestId,
        related_partner_id: partner.id,
        auto_type: "purchase_invoice_pending",
        auto_entity_id: newInvoice.id,
      });
    }

    // Notification email to Bureau Vlieland
    const customerName = project.customer_company || project.customer_name;
    const itemsListHtml = dbItems
      .map((it: any) => {
        const amt = infoByItem.get(it.id)?.amount || 0;
        return `<tr><td style="padding:6px 0;">${it.block_name}</td><td style="padding:6px 0;text-align:right;">€${amt.toFixed(2)}</td></tr>`;
      })
      .join("");

    const bureauEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Nieuwe ${isCollective ? "verzamelfactuur" : "factuurregistratie"}</h2>
        <p><strong>${partner.name}</strong> heeft een ${isCollective ? "verzamelfactuur" : "factuur"} geregistreerd voor project <strong>${project.reference_number || requestId}</strong> (${customerName}).</p>

        <div style="background:#f7fafc;padding:20px;border-radius:8px;margin:20px 0;">
          <h3 style="margin-top:0;color:#2d3748;">Factuurgegevens</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#718096;">Factuurnummer:</td><td style="padding:6px 0;font-weight:bold;">${invoicedNumber}</td></tr>
            <tr><td style="padding:6px 0;color:#718096;">Factuurdatum:</td><td style="padding:6px 0;">${invoicedDate}</td></tr>
            <tr><td style="padding:6px 0;color:#718096;">Totaal excl. BTW:</td><td style="padding:6px 0;font-weight:bold;">€${totalExcl.toFixed(2)}</td></tr>
            ${commissionPercentage > 0 ? `<tr><td style="padding:6px 0;color:#718096;">Commissie (${commissionPercentage}%):</td><td style="padding:6px 0;font-weight:bold;color:#2b6cb0;">€${totalCommission.toFixed(2)}</td></tr>` : ""}
          </table>
        </div>

        <div style="background:#edf2f7;padding:20px;border-radius:8px;margin:20px 0;">
          <h3 style="margin-top:0;color:#2d3748;">Onderdelen op deze factuur</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            ${itemsListHtml}
            <tr><td style="padding-top:10px;border-top:1px solid #cbd5e0;font-weight:bold;">Totaal excl. BTW</td><td style="padding-top:10px;border-top:1px solid #cbd5e0;text-align:right;font-weight:bold;">€${totalExcl.toFixed(2)}</td></tr>
          </table>
        </div>

        ${notes ? `<div style="background:#fffaf0;padding:15px;border-radius:8px;margin:20px 0;"><strong>Opmerking partner:</strong><br/>${notes}</div>` : ""}

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:30px 0;" />
        <p style="color:#a0aec0;font-size:12px;">Automatisch bericht van Bureau Vlieland.</p>
      </div>
    `;

    const bureauRecipient = getRecipientEmail("erwin@bureauvlieland.nl", origin);
    const bureauSubject = `${getSubjectPrefix(origin)}${isCollective ? "Verzamelfactuur" : "Factuur"} geregistreerd: ${partner.name} - ${project.reference_number || customerName}`;
    const sendOk = await sendEmailNotification(
      bureauRecipient,
      "Bureau Vlieland",
      bureauSubject,
      bureauEmailHtml,
      project.reference_number || null
    );

    await logEmail({
      email_type: "partner_invoice_registered_bureau",
      recipient_email: bureauRecipient,
      recipient_name: "Bureau Vlieland",
      subject: bureauSubject,
      status: sendOk ? "sent" : "failed",
      sent_by: "system",
      related_request_id: requestId,
      related_partner_id: partner.id,
      metadata: {
        template_name: "partner_invoice_registered_bureau",
        actor: "partner → bureau",
        invoicedNumber,
        invoicedAmount: totalExcl,
        commissionAmount: totalCommission,
        invoicingMode,
        collective: isCollective,
        itemCount: dbItems.length,
        invoiceId: newInvoice.id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        invoiceId: newInvoice.id,
        commission: {
          percentage: commissionPercentage,
          amount: totalCommission,
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
