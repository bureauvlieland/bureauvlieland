// Commissiefacturen van het bureau aan één partner, voor de pagina
// Facturatie in het partnerportaal (docs/plan-commissiefacturen.md, fase 3).
//
// Partners kunnen `commission_invoices` en de bucket `commission-invoices`
// niet zelf lezen (admin-only RLS), dus deze functie leest met de service
// role op basis van het partner-token en geeft per factuur een tijdelijke
// (één uur geldige) link naar de PDF mee. Alleen facturen die de partner ook
// echt gekregen heeft: verstuurd, doorgestuurd, betaald of gecrediteerd.
// Concepten en definitieve-maar-nog-niet-verstuurde facturen blijven intern.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** Statussen die de partner te zien krijgt. */
export const PARTNER_VISIBLE_STATUSES = ["sent", "forwarded", "paid", "credited"];

/** Geldigheid van de PDF-link in seconden. */
export const PDF_URL_TTL_SECONDS = 60 * 60;

// Eén letterlijke string per select: bij samengevoegde strings verliest de
// client het rijtype (GenericStringError) en faalt `deno check`.
const INVOICE_COLUMNS =
  "id, invoice_number, invoice_date, due_date, status, amount_excl_vat, vat_amount, amount_incl_vat, vat_rate, pdf_path, sent_at, paid_at, credited_at, credits_invoice_id, credit_reason, notes";

const LINE_COLUMNS =
  "id, invoice_id, item_type, block_name, customer_label, event_date, reference_number, invoiced_amount_excl_vat, commission_percentage, commission_amount, description, sort_order";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  const token = (new URL(req.url).searchParams.get("token") ?? "").trim();
  if (!token) return json(400, { error: "Partner token is required" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .select("id, name")
    .eq("partner_token", token)
    .eq("is_active", true)
    .maybeSingle();
  if (partnerError || !partner) return json(404, { error: "Invalid or inactive partner token" });

  const { data: invoices, error: invoicesError } = await supabase
    .from("commission_invoices")
    .select(INVOICE_COLUMNS)
    .eq("partner_id", partner.id)
    .in("status", PARTNER_VISIBLE_STATUSES)
    .order("invoice_date", { ascending: false });
  if (invoicesError) {
    console.error("get-partner-commission-invoices: facturen laden mislukt", invoicesError.message);
    return json(500, { error: "Kon facturen niet laden" });
  }

  const rows = invoices ?? [];
  const ids = rows.map((row) => row.id);

  const linesByInvoice = new Map<string, unknown[]>();
  if (ids.length > 0) {
    const { data: lines, error: linesError } = await supabase
      .from("commission_invoice_lines")
      .select(LINE_COLUMNS)
      .in("invoice_id", ids)
      .order("sort_order", { ascending: true });
    if (linesError) {
      console.error("get-partner-commission-invoices: regels laden mislukt", linesError.message);
      return json(500, { error: "Kon factuurregels niet laden" });
    }
    for (const line of lines ?? []) {
      const list = linesByInvoice.get(line.invoice_id) ?? [];
      list.push(line);
      linesByInvoice.set(line.invoice_id, list);
    }
  }

  // Eén aanvraag voor alle PDF-links; een factuur zonder PDF krijgt null.
  const pdfPaths = rows.map((row) => row.pdf_path).filter((path): path is string => !!path);
  const pdfUrlByPath = new Map<string, string>();
  if (pdfPaths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from("commission-invoices")
      .createSignedUrls(pdfPaths, PDF_URL_TTL_SECONDS);
    if (signError) {
      console.error("get-partner-commission-invoices: PDF-links maken mislukt", signError.message);
    }
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl && !entry.error) pdfUrlByPath.set(entry.path, entry.signedUrl);
    }
  }

  return json(200, {
    partner: { id: partner.id, name: partner.name },
    invoices: rows.map((row) => ({
      ...row,
      pdf_path: undefined,
      pdfUrl: row.pdf_path ? (pdfUrlByPath.get(row.pdf_path) ?? null) : null,
      lines: linesByInvoice.get(row.id) ?? [],
    })),
  });
}

if (import.meta.main) Deno.serve(handler);
