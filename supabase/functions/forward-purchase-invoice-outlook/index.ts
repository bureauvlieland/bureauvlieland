import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRecipientEmail, getSubjectPrefix } from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_outlook";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const OUTLOOK_API_KEY = Deno.env.get("MICROSOFT_OUTLOOK_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY || !OUTLOOK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Outlook connector not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reqBody = await req.json();
    const { invoiceId, includePdf } = reqBody;
    const origin = reqBody.origin || req.headers.get("origin") || "";

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "Invoice ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("partner_purchase_invoices")
      .select(`
        *,
        partners!inner(id, name, email),
        program_requests!inner(id, reference_number, customer_name, customer_company)
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("id", "snelstart_email")
      .single();

    const snelstartEmail = settingsData?.value
      ? (typeof settingsData.value === "string"
          ? settingsData.value.replace(/"/g, "")
          : String(settingsData.value))
      : "bureauvlieland@boekhouding.nl";

    const recipient = getRecipientEmail(snelstartEmail, origin);

    const invoiceDate = new Date(invoice.invoice_date);
    const formattedDate = invoiceDate.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Inkoopfactuur Partner</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px 0; color: #666; width: 150px;">Leverancier:</td><td style="padding: 8px 0; font-weight: bold;">${invoice.partners.name}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Factuurnummer:</td><td style="padding: 8px 0; font-weight: bold;">${invoice.invoice_number}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Factuurdatum:</td><td style="padding: 8px 0;">${formattedDate}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Bedrag excl. BTW:</td><td style="padding: 8px 0; font-weight: bold;">€${Number(invoice.amount_excl_vat).toFixed(2)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">BTW (${invoice.vat_rate}%):</td><td style="padding: 8px 0;">€${Number(invoice.vat_amount).toFixed(2)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Totaal incl. BTW:</td><td style="padding: 8px 0; font-weight: bold;">€${Number(invoice.amount_incl_vat).toFixed(2)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Projectreferentie:</td><td style="padding: 8px 0;">${invoice.program_requests.reference_number || "Geen referentie"}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Klant:</td><td style="padding: 8px 0;">${invoice.program_requests.customer_company || invoice.program_requests.customer_name}</td></tr>
          ${invoice.description ? `<tr><td style="padding: 8px 0; color: #666;">Omschrijving:</td><td style="padding: 8px 0;">${invoice.description}</td></tr>` : ""}
        </table>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">Verstuurd vanuit Bureau Vlieland administratie via Outlook.</p>
      </div>
    `;

    const subject = `${getSubjectPrefix(origin)}Inkoopfactuur: ${invoice.partners.name} - ${invoice.invoice_number}`;

    const attachments: any[] = [];
    let pdfIncluded = false;
    if (includePdf && invoice.file_path) {
      try {
        const { data: fileData, error: fileError } = await supabase.storage
          .from("partner-invoices")
          .download(invoice.file_path);
        if (!fileError && fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((d, b) => d + String.fromCharCode(b), ""),
          );
          const fileName = invoice.file_path.split("/").pop() || "factuur.pdf";
          attachments.push({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: fileName,
            contentType: "application/pdf",
            contentBytes: base64,
          });
          pdfIncluded = true;
        }
      } catch (e) {
        console.error("PDF attach error:", e);
      }
    }

    const graphResp = await fetch(`${GATEWAY_URL}/me/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": OUTLOOK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: htmlContent },
          toRecipients: [{ emailAddress: { address: recipient } }],
          attachments: attachments.length ? attachments : undefined,
        },
        saveToSentItems: true,
      }),
    });

    if (!graphResp.ok) {
      const errText = await graphResp.text();
      console.error("Outlook send error:", graphResp.status, errText);

      await logEmail({
        email_type: "purchase_invoice_forward",
        recipient_email: recipient,
        recipient_name: "Boekhouding",
        subject,
        status: "failed",
        error_message: `Outlook ${graphResp.status}: ${errText.slice(0, 500)}`,
        sent_by: user.id,
        related_request_id: invoice.request_id,
        related_partner_id: invoice.partner_id,
        metadata: {
          template_name: "purchase_invoice_forward_outlook",
          actor: "admin → boekhouding",
          send_method: "outlook",
          invoiceId: invoice.id,
          includedPdf: pdfIncluded,
        },
      });

      return new Response(
        JSON.stringify({ error: "Outlook verzenden mislukt", detail: errText.slice(0, 300) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await logEmail({
      email_type: "purchase_invoice_forward",
      recipient_email: recipient,
      recipient_name: "Boekhouding",
      subject,
      status: "sent",
      sent_by: user.id,
      related_request_id: invoice.request_id,
      related_partner_id: invoice.partner_id,
      metadata: {
        template_name: "purchase_invoice_forward_outlook",
        actor: "admin → boekhouding",
        send_method: "outlook",
        invoiceId: invoice.id,
        includedPdf: pdfIncluded,
      },
    });

    return new Response(JSON.stringify({ success: true, method: "outlook" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in forward-purchase-invoice-outlook:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
