// Deprecated: import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRecipientEmail, getSubjectPrefix } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_KEY = Deno.env.get("LOVABLE_API_KEY");
const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

async function sendEmailNotification(
  to: string,
  toName: string,
  subject: string,
  htmlContent: string
) {
  if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
    console.error("Mailjet credentials not configured");
    return false;
  }

  try {
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
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${ADMIN_KEY}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reqBody = await req.json();
    const { itemIds, status, notes, commissionInvoiceNumber, itemType = "activity" } = reqBody;
    const origin = reqBody.origin || req.headers.get("origin") || "";

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Item IDs are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validStatuses = ["pending", "invoiced", "paid"];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const updateData: Record<string, unknown> = {
      commission_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === "invoiced") {
      updateData.commission_invoiced_at = new Date().toISOString();
    }

    if (notes) {
      updateData.commission_notes = notes;
    }

    // Determine which table to update based on itemType
    const tableName = itemType === "accommodation" ? "accommodation_quotes" : "program_request_items";
    
    // Get items with partner info before updating
    let items: any[] = [];
    if (itemType === "activity") {
      const { data: rawItems } = await supabase
        .from("program_request_items")
        .select(`
          id, 
          request_id, 
          block_name,
          provider_id,
          provider_name,
          invoiced_amount,
          invoiced_number,
          commission_percentage,
          commission_amount,
          program_requests!inner(customer_name, customer_company)
        `)
        .in("id", itemIds);

      items = (rawItems || []).map((item: any) => ({
        ...item,
        customer_name: item.program_requests?.customer_name,
        customer_company: item.program_requests?.customer_company,
      }));
    } else {
      const { data: rawItems } = await supabase
        .from("accommodation_quotes")
        .select(`
          id,
          accommodation_name,
          partner_id,
          invoiced_amount,
          invoiced_number,
          commission_percentage,
          commission_amount,
          accommodation_requests!inner(id, customer_name, customer_company)
        `)
        .in("id", itemIds);

      items = (rawItems || []).map((item: any) => ({
        ...item,
        block_name: item.accommodation_name,
        provider_id: item.partner_id,
        request_id: item.accommodation_requests?.id,
        customer_name: item.accommodation_requests?.customer_name,
        customer_company: item.accommodation_requests?.customer_company,
      }));
    }

    // Update items
    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .in("id", itemIds);

    if (updateError) {
      console.error("Error updating items:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update commission status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log to history for activity items only (accommodation doesn't have request history)
    if (itemType === "activity" && items.length > 0) {
      const historyEntries = items.map((item) => ({
        request_id: item.request_id,
        item_id: item.id,
        action: "commission_status_changed",
        actor: "admin",
        actor_name: "Bureau Vlieland",
        new_value: { commission_status: status, commission_invoice_number: commissionInvoiceNumber },
        notes: `Commissie status gewijzigd naar ${status}${notes ? `: ${notes}` : ""}`,
      }));

      await supabase.from("program_request_history").insert(historyEntries);
    }

    // Send email notifications to partners when status is "invoiced"
    if (status === "invoiced" && items && items.length > 0) {
      // Get unique partner IDs
      const partnerIds = [...new Set(items.map((i) => i.provider_id))];

      // Get partner emails
      const { data: partners } = await supabase
        .from("partners")
        .select("id, name, email")
        .in("id", partnerIds);

      if (partners) {
        // Group items by partner
        const itemsByPartner = new Map<string, typeof items>();
        items.forEach((item) => {
          if (!itemsByPartner.has(item.provider_id)) {
            itemsByPartner.set(item.provider_id, []);
          }
          itemsByPartner.get(item.provider_id)!.push(item);
        });

        // Send email to each partner
        for (const partner of partners) {
          const partnerItems = itemsByPartner.get(partner.id) || [];
          if (partnerItems.length === 0) continue;

          const totalCommission = partnerItems.reduce(
            (sum, item) => sum + (parseFloat(item.commission_amount) || 0),
            0
          );

          const itemsHtml = partnerItems
            .map(
              (item: any) => `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.block_name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${
                  item.customer_company || item.customer_name
                }</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">€${parseFloat(item.invoiced_amount).toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.commission_percentage}%</td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">€${parseFloat(item.commission_amount).toFixed(2)}</td>
              </tr>
            `
            )
            .join("");

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
              <h2 style="color: #1a365d;">Commissiefactuur Bureau Vlieland</h2>
              
              <p>Beste ${partner.name},</p>
              
              <p>Hierbij informeren wij je dat wij een commissiefactuur hebben verzonden voor de onderstaande activiteiten.</p>
              
              ${commissionInvoiceNumber ? `
              <div style="background: #ebf8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>Factuurnummer:</strong> ${commissionInvoiceNumber}
              </div>
              ` : ''}
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background: #f7fafc;">
                    <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Activiteit</th>
                    <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Klant</th>
                    <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Jouw factuur</th>
                    <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">%</th>
                    <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Commissie</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background: #f7fafc;">
                    <td colspan="4" style="padding: 12px 10px; font-weight: bold; text-align: right;">Totaal commissie:</td>
                    <td style="padding: 12px 10px; font-weight: bold; color: #2b6cb0;">€${totalCommission.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              
              <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2d3748;">Betaalgegevens</h3>
                <p style="margin-bottom: 0;">
                  Gelieve het bedrag binnen 14 dagen over te maken naar:<br/>
                  <strong>IBAN:</strong> NL00 BANK 0000 0000 00<br/>
                  <strong>T.n.v.:</strong> Bureau Vlieland<br/>
                  <strong>O.v.v.:</strong> ${commissionInvoiceNumber || 'Commissie ' + new Date().toLocaleDateString('nl-NL')}
                </p>
              </div>
              
              <p>Heb je vragen over deze factuur? Neem dan contact met ons op via <a href="mailto:erwin@bureauvlieland.nl">erwin@bureauvlieland.nl</a>.</p>
              
              <p>Met vriendelijke groet,<br/>
              <strong>Bureau Vlieland</strong></p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
              <p style="color: #a0aec0; font-size: 12px;">
                Dit is een automatisch bericht van Bureau Vlieland.
              </p>
            </div>
          `;

          await sendEmailNotification(
            getRecipientEmail(partner.email, origin),
            partner.name,
            `${getSubjectPrefix(origin)}Commissiefactuur Bureau Vlieland${commissionInvoiceNumber ? ` - ${commissionInvoiceNumber}` : ''}`,
            emailHtml
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, updatedCount: itemIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-commission-status:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
