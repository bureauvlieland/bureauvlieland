/**
 * Betaalgegevens van één klantfactuur voor de publieke betaalpagina
 * /betalen/<factuur-id> (docs/nummering.md, "Betaallink").
 *
 * De factuur-id is een uuid die alleen in de factuurmail en op de pdf staat;
 * daarom geen login. We geven alleen terug wat op de factuur zelf ook staat:
 * nummer, bedrag, vervaldatum, dossier, IBAN en begunstigde, plus de tekst
 * van de EPC-QR-code. Geen regels, geen adres, geen e-mailadres.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEpcPayload } from "../_shared/epcQr.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface InvoicePaymentView {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amountInclVat: number;
  /** Creditnota: niets te betalen. */
  isCredit: boolean;
  paid: boolean;
  reference: string | null;
  customerLabel: string | null;
  iban: string;
  beneficiary: string;
  /** Tekst voor de EPC-QR; null als er niets te betalen is. */
  epcPayload: string | null;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  invoice_date: string;
  amount_incl_vat: number;
  invoice_type: string;
  status: string | null;
  program_requests: { reference_number: string | null; billing_company_name: string | null; customer_company: string | null; customer_name: string | null } | null;
}

const addDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Puur: van factuurrij en instellingen naar wat de pagina toont. */
export function buildPaymentView(row: InvoiceRow, settings: { iban: string; legalName: string; paymentTermDays: number }): InvoicePaymentView {
  const isCredit = row.invoice_type === "credit";
  const paid = row.status === "paid";
  const amount = Number(row.amount_incl_vat) || 0;
  const pr = row.program_requests;
  const epcPayload = isCredit || paid
    ? null
    : buildEpcPayload({ beneficiaryName: settings.legalName, iban: settings.iban, amount, remittance: row.invoice_number });
  return {
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    dueDate: addDays(row.invoice_date, settings.paymentTermDays),
    amountInclVat: amount,
    isCredit,
    paid,
    reference: pr?.reference_number ?? null,
    customerLabel: pr?.billing_company_name || pr?.customer_company || pr?.customer_name || null,
    iban: settings.iban,
    beneficiary: settings.legalName,
    epcPayload,
  };
}

async function loadSettings(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase
    .from("app_settings")
    .select("id, value")
    .in("id", ["bureau_iban", "bureau_legal_name", "bureau_company_name", "bureau_payment_term_days"]);
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as Array<{ id: string; value: unknown }>) {
    map[r.id] = typeof r.value === "string" ? r.value : JSON.stringify(r.value ?? "");
  }
  const term = Number(String(map.bureau_payment_term_days ?? "").replace(/"/g, ""));
  return {
    iban: map.bureau_iban ?? "",
    legalName: map.bureau_legal_name || map.bureau_company_name || "Bureau Vlieland B.V.",
    paymentTermDays: Number.isFinite(term) && term > 0 ? term : 14,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Alleen POST" });

  let invoiceId: unknown;
  try {
    ({ invoiceId } = await req.json());
  } catch {
    return json(400, { error: "Ongeldige aanvraag" });
  }
  if (typeof invoiceId !== "string" || !UUID_RE.test(invoiceId)) return json(400, { error: "Ongeldige factuur-id" });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase
    .from("bureau_invoices")
    .select("id, invoice_number, invoice_date, amount_incl_vat, invoice_type, status, program_requests(reference_number, billing_company_name, customer_company, customer_name)")
    .eq("id", invoiceId)
    .maybeSingle();
  if (error) {
    console.error("get-invoice-payment:", error);
    return json(500, { error: "Factuur ophalen mislukt" });
  }
  if (!data) return json(404, { error: "Factuur niet gevonden" });

  const settings = await loadSettings(supabase);
  return json(200, buildPaymentView(data as unknown as InvoiceRow, settings));
});
