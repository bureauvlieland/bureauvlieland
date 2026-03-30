import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRecipientEmail, getSubjectPrefix } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reqBody = await req.json();
    const { invoiceId, includePdf } = reqBody;
    const origin = reqBody.origin || req.headers.get("origin") || "";

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch invoice with relations
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
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Snelstart email from settings
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("id", "snelstart_email")
      .single();

    const snelstartEmail = settingsData?.value 
      ? (typeof settingsData.value === "string" ? settingsData.value.replace(/"/g, "") : String(settingsData.value))
      : "bureauvlieland@boekhouding.nl";

    // Format date
    const invoiceDate = new Date(invoice.invoice_date);
    const formattedDate = invoiceDate.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Build email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Inkoopfactuur Partner</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 150px;">Leverancier:</td>
            <td style="padding: 8px 0; font-weight: bold;">${invoice.partners.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Factuurnummer:</td>
            <td style="padding: 8px 0; font-weight: bold;">${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Factuurdatum:</td>
            <td style="padding: 8px 0;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Bedrag excl. BTW:</td>
            <td style="padding: 8px 0; font-weight: bold;">€${Number(invoice.amount_excl_vat).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">BTW (${invoice.vat_rate}%):</td>
            <td style="padding: 8px 0;">€${Number(invoice.vat_amount).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Totaal incl. BTW:</td>
            <td style="padding: 8px 0; font-weight: bold;">€${Number(invoice.amount_incl_vat).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Projectreferentie:</td>
            <td style="padding: 8px 0;">${invoice.program_requests.reference_number || "Geen referentie"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Klant:</td>
            <td style="padding: 8px 0;">${invoice.program_requests.customer_company || invoice.program_requests.customer_name}</td>
          </tr>
          ${invoice.description ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">Omschrijving:</td>
            <td style="padding: 8px 0;">${invoice.description}</td>
          </tr>
          ` : ""}
        </table>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        
        <p style="color: #666; font-size: 12px;">
          Dit is een automatisch bericht vanuit het Bureau Vlieland administratiesysteem.
        </p>
      </div>
    `;

    const emailSubject = `${getSubjectPrefix(origin)}Inkoopfactuur: ${invoice.partners.name} - ${invoice.invoice_number}`;
    const emailMessage: any = {
      From: {
        Email: "hallo@bureauvlieland.nl",
        Name: "Bureau Vlieland Admin",
      },
      To: [{ Email: getRecipientEmail(snelstartEmail, origin), Name: "Boekhouding" }],
      Subject: emailSubject,
      HTMLPart: htmlContent,
    };

    // Add PDF attachment if requested and available
    if (includePdf && invoice.file_path) {
      try {
        // Download file from storage
        const { data: fileData, error: fileError } = await supabase.storage
          .from("partner-invoices")
          .download(invoice.file_path);

        if (!fileError && fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
          );

          const fileName = invoice.file_path.split("/").pop() || "factuur.pdf";

          emailMessage.Attachments = [
            {
              ContentType: "application/pdf",
              Filename: fileName,
              Base64Content: base64,
            },
          ];
        }
      } catch (pdfError) {
        console.error("Error attaching PDF:", pdfError);
        // Continue without attachment
      }
    }

    // Send email via Mailjet
    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      console.error("Mailjet credentials not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mailjetResponse = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({ Messages: [emailMessage] }),
    });

    if (!mailjetResponse.ok) {
      const error = await mailjetResponse.text();
      console.error("Mailjet error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log email
    await supabase.from("email_log").insert({
      email_type: "purchase_invoice_forward",
      recipient_email: snelstartEmail,
      recipient_name: "Boekhouding",
      subject: `Inkoopfactuur: ${invoice.partners.name} - ${invoice.invoice_number}`,
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_by: user.id,
      related_request_id: invoice.request_id,
      related_partner_id: invoice.partner_id,
      metadata: { invoiceId: invoice.id, includedPdf: includePdf && !!invoice.file_path },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in forward-purchase-invoice:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
