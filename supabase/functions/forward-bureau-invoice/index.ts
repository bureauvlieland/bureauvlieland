import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRecipientEmail, getSubjectPrefix, buildReplyTo } from "../_shared/email-templates.ts";
import { logEmail } from "../_shared/email-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILJET_API_KEY = Deno.env.get("MAILJET_API_KEY");
const MAILJET_SECRET_KEY = Deno.env.get("MAILJET_SECRET_KEY");

const invoiceTypeLabels: Record<string, string> = {
  partial: "Deelfactuur",
  final: "Eindfactuur",
  credit: "Creditnota",
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => round2(n).toFixed(2);

// Escape XML special characters
const xmlEscape = (s: string | null | undefined): string => {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

// Add N days to a YYYY-MM-DD date string
const addDays = (isoDate: string, days: number): string => {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// Read app_settings value (json) and unwrap to plain string/number
const readSetting = async (
  supabase: ReturnType<typeof createClient>,
  id: string,
  fallback: string,
): Promise<string> => {
  const { data } = await supabase.from("app_settings").select("value").eq("id", id).maybeSingle();
  if (!data?.value) return fallback;
  const v = data.value as unknown;
  if (typeof v === "string") return v.replace(/^"|"$/g, "");
  if (typeof v === "number") return String(v);
  return fallback;
};

interface SupplierInfo {
  legalName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  kvk: string;
  vatNumber: string;
  iban: string;
  paymentTermDays: number;
}

interface BillingLineRow {
  description: string;
  quantity: number;
  unit_price_excl_vat: number;
  vat_rate: number;
  amount_excl_vat: number;
  vat_amount: number;
}

interface UblParams {
  invoice: any;
  request: any;
  supplier: SupplierInfo;
  lines: BillingLineRow[];
  isCredit: boolean;
}

function buildUblXml({ invoice, request, supplier, lines, isCredit }: UblParams): string {
  const docTag = isCredit ? "CreditNote" : "Invoice";
  const lineTag = isCredit ? "CreditNoteLine" : "InvoiceLine";
  const qtyTag = isCredit ? "CreditedQuantity" : "InvoicedQuantity";

  // Group VAT amounts by rate
  const vatByRate = new Map<number, { taxable: number; tax: number }>();
  for (const l of lines) {
    const cur = vatByRate.get(l.vat_rate) || { taxable: 0, tax: 0 };
    cur.taxable = round2(cur.taxable + Number(l.amount_excl_vat || 0));
    cur.tax = round2(cur.tax + Number(l.vat_amount || 0));
    vatByRate.set(l.vat_rate, cur);
  }

  const totalExcl = round2(lines.reduce((s, l) => s + Number(l.amount_excl_vat || 0), 0));
  const totalTax = round2(lines.reduce((s, l) => s + Number(l.vat_amount || 0), 0));
  const totalIncl = round2(totalExcl + totalTax);

  const issueDate = String(invoice.invoice_date).slice(0, 10);
  const dueDate = addDays(issueDate, supplier.paymentTermDays);

  const customerName = request.customer_company || request.customer_name || "Onbekend";
  const customerEmail = request.customer_email || "";

  // Build TaxSubtotal blocks
  const taxSubtotals = Array.from(vatByRate.entries())
    .map(([rate, { taxable, tax }]) => {
      const category = rate === 0 ? "E" : "S"; // E = exempt, S = standard
      return `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${fmt(taxable)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${fmt(tax)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${category}</cbc:ID>
        <cbc:Percent>${fmt(rate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
    })
    .join("");

  // Build line entries
  const lineXml = lines
    .map((l, idx) => {
      const category = l.vat_rate === 0 ? "E" : "S";
      const lineExcl = fmt(round2(Number(l.amount_excl_vat || 0)));
      const unitPrice = fmt(round2(Number(l.unit_price_excl_vat || 0)));
      const qty = fmt(round2(Number(l.quantity || 1)));
      return `
  <cac:${lineTag}>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:${qtyTag} unitCode="EA">${qty}</cbc:${qtyTag}>
    <cbc:LineExtensionAmount currencyID="EUR">${lineExcl}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${xmlEscape(l.description || "Dienst")}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${category}</cbc:ID>
        <cbc:Percent>${fmt(l.vat_rate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">${unitPrice}</cbc:PriceAmount>
    </cac:Price>
  </cac:${lineTag}>`;
    })
    .join("");

  const note = invoice.description ? `\n  <cbc:Note>${xmlEscape(invoice.description)}</cbc:Note>` : "";
  const projectRef = request.reference_number
    ? `\n  <cac:OrderReference><cbc:ID>${xmlEscape(request.reference_number)}</cbc:ID></cac:OrderReference>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<${docTag} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${docTag}-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:nen.nl:nlcius:v1.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${xmlEscape(invoice.invoice_number)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:DueDate>${dueDate}</cbc:DueDate>
  <cbc:${isCredit ? "CreditNoteTypeCode" : "InvoiceTypeCode"}>${isCredit ? "381" : "380"}</cbc:${isCredit ? "CreditNoteTypeCode" : "InvoiceTypeCode"}>${note}
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>${projectRef}
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0106">${xmlEscape(supplier.kvk)}</cbc:EndpointID>
      <cac:PartyIdentification><cbc:ID schemeID="0106">${xmlEscape(supplier.kvk)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${xmlEscape(supplier.legalName)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${xmlEscape(supplier.street)}</cbc:StreetName>
        <cbc:CityName>${xmlEscape(supplier.city)}</cbc:CityName>
        <cbc:PostalZone>${xmlEscape(supplier.postalCode)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${xmlEscape(supplier.country)}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${xmlEscape(supplier.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${xmlEscape(supplier.legalName)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="0106">${xmlEscape(supplier.kvk)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      ${customerEmail ? `<cbc:EndpointID schemeID="EM">${xmlEscape(customerEmail)}</cbc:EndpointID>` : ""}
      <cac:PartyName><cbc:Name>${xmlEscape(customerName)}</cbc:Name></cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${xmlEscape(customerName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      ${customerEmail ? `<cac:Contact><cbc:ElectronicMail>${xmlEscape(customerEmail)}</cbc:ElectronicMail></cac:Contact>` : ""}
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cbc:PaymentID>${xmlEscape(invoice.invoice_number)}</cbc:PaymentID>
    ${supplier.iban ? `<cac:PayeeFinancialAccount><cbc:ID>${xmlEscape(supplier.iban)}</cbc:ID></cac:PayeeFinancialAccount>` : ""}
  </cac:PaymentMeans>
  <cac:PaymentTerms>
    <cbc:Note>Betaling binnen ${supplier.paymentTermDays} dagen</cbc:Note>
  </cac:PaymentTerms>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${fmt(totalTax)}</cbc:TaxAmount>${taxSubtotals}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${fmt(totalExcl)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${fmt(totalExcl)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${fmt(totalIncl)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${fmt(totalIncl)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${lineXml}
</${docTag}>`;
}

// base64-encode a UTF-8 string for Mailjet attachment
function base64FromString(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

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
    const { invoiceId, pdfBase64, pdfFilename } = reqBody as {
      invoiceId?: string;
      pdfBase64?: string;
      pdfFilename?: string;
      origin?: string;
    };
    const origin = reqBody.origin || req.headers.get("origin") || "";

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "Invoice ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch bureau invoice with project
    const { data: invoice, error: invoiceError } = await supabase
      .from("bureau_invoices")
      .select(`
        *,
        program_requests!inner(id, reference_number, customer_name, customer_company, customer_email)
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Snelstart inbox
    const snelstartEmail = await readSetting(supabase, "snelstart_email", "bureauvlieland@boekhouding.nl");

    // Bureau company info for UBL
    const supplier: SupplierInfo = {
      legalName: await readSetting(supabase, "bureau_legal_name", "Bureau Vlieland"),
      street: await readSetting(supabase, "bureau_street", ""),
      postalCode: await readSetting(supabase, "bureau_postal_code", ""),
      city: await readSetting(supabase, "bureau_city", ""),
      country: "NL",
      kvk: await readSetting(supabase, "bureau_kvk_number", ""),
      vatNumber: await readSetting(supabase, "bureau_vat_number", ""),
      iban: await readSetting(supabase, "bureau_iban", ""),
      paymentTermDays: Number(await readSetting(supabase, "bureau_payment_term_days", "14")) || 14,
    };

    // Fetch billing lines for this project's items, fallback to summary line if none
    const { data: items } = await supabase
      .from("program_request_items")
      .select("id")
      .eq("request_id", invoice.request_id);
    const itemIds = (items || []).map((i: any) => i.id);

    let lines: BillingLineRow[] = [];
    if (itemIds.length > 0) {
      const { data: lineRows } = await supabase
        .from("program_item_billing_lines")
        .select("description, quantity, unit_price_excl_vat, vat_rate, amount_excl_vat, vat_amount")
        .in("item_id", itemIds)
        .order("sort_order", { ascending: true });
      lines = (lineRows || []) as BillingLineRow[];
    }

    const isCredit = invoice.invoice_type === "credit";

    // Fallback: synthesize a single line from invoice totals if no billing lines exist
    if (lines.length === 0) {
      const excl = Number(invoice.amount_excl_vat || 0);
      const tax = Number(invoice.vat_amount || 0);
      const rate = excl > 0 ? round2((tax / excl) * 100) : 21;
      lines = [{
        description: invoice.description || `${invoiceTypeLabels[invoice.invoice_type] || invoice.invoice_type} ${invoice.invoice_number}`,
        quantity: 1,
        unit_price_excl_vat: excl,
        vat_rate: rate,
        amount_excl_vat: excl,
        vat_amount: tax,
      }];
    }

    // For credit notes: ensure amounts are positive in UBL (CreditNote semantics flip the sign)
    if (isCredit) {
      lines = lines.map((l) => ({
        ...l,
        quantity: Math.abs(Number(l.quantity || 1)),
        unit_price_excl_vat: Math.abs(Number(l.unit_price_excl_vat || 0)),
        amount_excl_vat: Math.abs(Number(l.amount_excl_vat || 0)),
        vat_amount: Math.abs(Number(l.vat_amount || 0)),
      }));
    }

    const ublXml = buildUblXml({
      invoice,
      request: invoice.program_requests,
      supplier,
      lines,
      isCredit,
    });
    const ublBase64 = base64FromString(ublXml);

    const customerLabel =
      invoice.program_requests.customer_company || invoice.program_requests.customer_name;
    const typeLabel = invoiceTypeLabels[invoice.invoice_type] || invoice.invoice_type;
    const amountIncl = Number(invoice.amount_incl_vat ?? (Number(invoice.amount_excl_vat) + Number(invoice.vat_amount)));

    // Minimal HTML body — keeps Snelstart from saving the message itself as a separate "e-mail.pdf".
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; font-size: 13px; color: #333;">
        <p>Verkoopfactuur <strong>${invoice.invoice_number}</strong> — ${customerLabel} — €${amountIncl.toFixed(2)} incl. BTW.</p>
        <p>Zie bijlagen: PDF (visueel) en UBL/XML (boekhoudkundige verwerking).</p>
      </div>
    `;

    const emailSubject = `${getSubjectPrefix(origin)}Verkoopfactuur ${typeLabel}: ${customerLabel} - ${invoice.invoice_number}`;
    const refNum = invoice.program_requests?.reference_number || null;
    const replyTo = buildReplyTo(refNum);

    if (!pdfBase64) {
      console.warn(
        `[forward-bureau-invoice] No PDF attachment provided for invoice ${invoice.invoice_number}.`,
      );
    }

    const baseFilename = (pdfFilename || `Factuur-${invoice.invoice_number}.pdf`).replace(/\.pdf$/i, "");

    const attachments: Array<{ ContentType: string; Filename: string; Base64Content: string }> = [];
    if (pdfBase64) {
      attachments.push({
        ContentType: "application/pdf",
        Filename: `${baseFilename}.pdf`,
        Base64Content: pdfBase64,
      });
    }
    attachments.push({
      ContentType: "application/xml",
      Filename: `${baseFilename}.xml`,
      Base64Content: ublBase64,
    });

    const emailMessage: any = {
      From: {
        Email: "hallo@bureauvlieland.nl",
        Name: "Bureau Vlieland Admin",
      },
      To: [{ Email: getRecipientEmail(snelstartEmail, origin), Name: "Boekhouding" }],
      ...(replyTo ? { ReplyTo: replyTo } : {}),
      Subject: emailSubject,
      HTMLPart: htmlContent,
      Attachments: attachments,
    };

    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) {
      console.error("Mailjet credentials not configured");
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

    // Update status
    await supabase
      .from("bureau_invoices")
      .update({
        status: "forwarded",
        forwarded_to_accounting_at: new Date().toISOString(),
        forwarded_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    // Log email (centralized helper — validates template_name + actor)
    await logEmail({
      email_type: "bureau_invoice_forward",
      recipient_email: getRecipientEmail(snelstartEmail, origin),
      recipient_name: "Boekhouding",
      subject: emailSubject,
      status: "sent",
      sent_by: user.id,
      related_request_id: invoice.request_id,
      metadata: {
        template_name: "bureau_invoice_forward",
        actor: "admin → boekhouding",
        invoiceId: invoice.id,
        invoiceType: invoice.invoice_type,
        hasAttachment: Boolean(pdfBase64),
        hasUblAttachment: true,
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in forward-bureau-invoice:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
