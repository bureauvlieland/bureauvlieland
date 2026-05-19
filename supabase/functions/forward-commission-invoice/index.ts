import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRecipientEmail, getSubjectPrefix } from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

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

    const reqBody = await req.json();
    const { invoiceId } = reqBody;
    const origin = reqBody.origin || req.headers.get("origin") || "";

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "Invoice ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: invoice, error: invErr } = await supabase
      .from("commission_invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();
    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: partner } = await supabase
      .from("partners")
      .select("name, kvk_number")
      .eq("id", invoice.partner_id)
      .maybeSingle();

    // Get Snelstart email
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("id", "snelstart_email")
      .maybeSingle();
    const snelstartEmail = settingsData?.value
      ? (typeof settingsData.value === "string"
          ? settingsData.value.replace(/"/g, "")
          : String(settingsData.value))
      : "bureauvlieland@boekhouding.nl";

    const formattedDate = new Date(invoice.invoice_date).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Try to download PDF attachment from storage if available
    let pdfBase64: string | null = null;
    if (invoice.pdf_path) {
      const { data: pdfBlob } = await supabase.storage
        .from("commission-invoices")
        .download(invoice.pdf_path);
      if (pdfBlob) {
        const buf = new Uint8Array(await pdfBlob.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        pdfBase64 = btoa(bin);
      }
    }

    const partnerLabel = invoice.recipient_name || partner?.name || "Partner";
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Verkoopfactuur Bureau Vlieland (commissie)</h2>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px 0; color: #666; width: 200px;">Klant (debiteur):</td><td style="padding: 8px 0; font-weight: bold;">${partnerLabel}</td></tr>
          ${partner?.kvk_number ? `<tr><td style="padding: 8px 0; color: #666;">KvK:</td><td style="padding: 8px 0;">${partner.kvk_number}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #666;">Factuurnummer:</td><td style="padding: 8px 0; font-weight: bold;">${invoice.invoice_number}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Type:</td><td style="padding: 8px 0;">Commissiefactuur</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Factuurdatum:</td><td style="padding: 8px 0;">${formattedDate}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Bedrag excl. BTW:</td><td style="padding: 8px 0; font-weight: bold;">€${Number(invoice.amount_excl_vat).toFixed(2)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">BTW (${invoice.vat_rate}%):</td><td style="padding: 8px 0;">€${Number(invoice.vat_amount).toFixed(2)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Totaal incl. BTW:</td><td style="padding: 8px 0; font-weight: bold;">€${Number(invoice.amount_incl_vat).toFixed(2)}</td></tr>
        </table>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">
          Dit is een automatisch bericht vanuit het Bureau Vlieland administratiesysteem.
        </p>
      </div>
    `;

    const emailSubject = `${getSubjectPrefix(origin)}Commissiefactuur: ${partnerLabel} - ${invoice.invoice_number}`;
    const emailMessage: any = {
      From: { Email: "hallo@bureauvlieland.nl", Name: "Bureau Vlieland Admin" },
      To: [{ Email: getRecipientEmail(snelstartEmail, origin), Name: "Boekhouding" }],
      Subject: emailSubject,
      HTMLPart: htmlContent,
    };
    if (pdfBase64) {
      emailMessage.Attachments = [
        {
          ContentType: "application/pdf",
          Filename: `Commissiefactuur-${invoice.invoice_number}.pdf`,
          Base64Content: pdfBase64,
        },
      ];
    }

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("commission_invoices")
      .update({
        status: "forwarded",
        forwarded_to_accounting_at: new Date().toISOString(),
        forwarded_by: user.id,
      })
      .eq("id", invoiceId);

    await logEmail({
      email_type: "commission_invoice_forward",
      recipient_email: getRecipientEmail(snelstartEmail, origin),
      recipient_name: "Boekhouding",
      subject: emailSubject,
      status: "sent",
      sent_by: user.id,
      related_partner_id: invoice.partner_id,
      metadata: {
        template_name: "commission_invoice_forward",
        actor: "admin → boekhouding",
        commissionInvoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in forward-commission-invoice:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
