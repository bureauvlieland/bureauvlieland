import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildReconciliationRows,
  summarizeReconciliation,
  DEFAULT_RECON_SETTINGS,
  type ReconInvoiceInput,
  type ReconItemInput,
  type ReconPartnerInput,
  type ReconProjectInput,
  type ReconSettings,
} from "../_shared/commissionReconciliation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Statussen waarbij het onderdeel daadwerkelijk verkocht is en dus commissie hoort op te leveren. */
const SOLD_STATUSES = ["confirmed", "accepted", "executed", "invoiced", "completed"];

export async function loadReconciliationSettings(
  adminClient: ReturnType<typeof createClient>,
): Promise<ReconSettings> {
  const { data } = await adminClient
    .from("app_settings")
    .select("id, value")
    .in("id", ["commission_match_tolerance_eur", "commission_match_tolerance_pct"]);

  const map = new Map((data ?? []).map((r: any) => [r.id, r.value]));
  const num = (key: string, fallback: number) => {
    const raw = map.get(key);
    const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    toleranceEur: num("commission_match_tolerance_eur", DEFAULT_RECON_SETTINGS.toleranceEur),
    tolerancePct: num("commission_match_tolerance_pct", DEFAULT_RECON_SETTINGS.tolerancePct),
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
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

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const partnerIdFilter = typeof body.partnerId === "string" && body.partnerId ? body.partnerId : null;

    const settings = await loadReconciliationSettings(adminClient);

    // ── Verkoopkant: alle verkochte programma-onderdelen ────────────────────
    let itemsQuery = adminClient
      .from("program_request_items")
      .select(
        "id, request_id, provider_id, block_name, quoted_price, vat_rate, commission_percentage, " +
          "commission_status, commission_basis, invoiced_number, invoiced_amount, invoiced_date, " +
          "status, block_type, proposed_date",
      )
      .in("status", SOLD_STATUSES)
      .not("provider_id", "is", null);

    if (partnerIdFilter) itemsQuery = itemsQuery.eq("provider_id", partnerIdFilter);

    // ── Inkoopkant: alle geregistreerde inkoopfacturen ──────────────────────
    let invoicesQuery = adminClient
      .from("partner_purchase_invoices")
      .select(
        "id, partner_id, request_id, item_id, invoice_number, invoice_date, amount_excl_vat, " +
          "amount_incl_vat, commission_exempt, commission_exempt_reason, status, created_at, " +
          "commission_invoiced_at",
      );

    if (partnerIdFilter) invoicesQuery = invoicesQuery.eq("partner_id", partnerIdFilter);


    const [{ data: rawItems, error: itemsError }, { data: rawInvoices, error: invoicesError }] =
      await Promise.all([itemsQuery, invoicesQuery]);

    if (itemsError) throw itemsError;
    if (invoicesError) throw invoicesError;

    const invoiceIds = (rawInvoices ?? []).map((i: any) => i.id);
    const { data: allocations } = invoiceIds.length
      ? await adminClient
          .from("partner_purchase_invoice_allocations")
          .select("invoice_id, item_id")
          .in("invoice_id", invoiceIds)
      : { data: [] as any[] };

    const allocMap = new Map<string, string[]>();
    for (const a of allocations ?? []) {
      const arr = allocMap.get(a.invoice_id) ?? [];
      if (a.item_id) arr.push(a.item_id);
      allocMap.set(a.invoice_id, arr);
    }

    const requestIds = [
      ...new Set([
        ...(rawItems ?? []).map((i: any) => i.request_id),
        ...(rawInvoices ?? []).map((i: any) => i.request_id),
      ].filter(Boolean)),
    ];

    const [{ data: projects }, { data: partners }] = await Promise.all([
      requestIds.length
        ? adminClient
            .from("program_requests")
            .select("id, reference_number, customer_name, customer_company, selected_dates")
            .in("id", requestIds)
        : Promise.resolve({ data: [] as any[] }),
      adminClient
        .from("partners")
        .select("id, name, commission_percentage, pays_by_direct_debit"),
    ]);

    const items: ReconItemInput[] = (rawItems ?? []).map((i: any) => ({
      id: i.id,
      request_id: i.request_id,
      provider_id: i.provider_id,
      block_name: i.block_name,
      quoted_price: i.quoted_price,
      vat_rate: i.vat_rate,
      commission_percentage: i.commission_percentage,
      commission_status: i.commission_status,
      commission_basis: i.commission_basis,
      invoiced_number: i.invoiced_number,
      invoiced_amount: i.invoiced_amount,
      status: i.status,
      block_type: i.block_type,
      execution_date: i.proposed_date ?? null,
      item_type: "activity",
    }));

    // ── Logies: geselecteerde offertes leveren ook commissie op ─────────────
    let quotesQuery = adminClient
      .from("accommodation_quotes")
      .select(
        "id, request_id, partner_id, accommodation_name, price_total, price_includes_vat, vat_rate, " +
          "commission_percentage, commission_status, invoiced_number, invoiced_amount, status, " +
          "accommodation_requests!inner(id, customer_name, customer_company, arrival_date)",
      )
      .eq("status", "selected");

    if (partnerIdFilter) quotesQuery = quotesQuery.eq("partner_id", partnerIdFilter);

    const { data: rawQuotes, error: quotesError } = await quotesQuery;
    if (quotesError) throw quotesError;

    const quoteIds = (rawQuotes ?? []).map((q: any) => q.id);
    const { data: quoteExtras } = quoteIds.length
      ? await adminClient
          .from("accommodation_quote_extras")
          .select("quote_id, unit_price, quantity, pricing_type")
          .in("quote_id", quoteIds)
      : { data: [] as any[] };

    const extrasByQuote = new Map<string, number>();
    for (const extra of quoteExtras ?? []) {
      const amount = extra.pricing_type === "fixed"
        ? Number(extra.unit_price) || 0
        : (Number(extra.unit_price) || 0) * (Number(extra.quantity) || 0);
      extrasByQuote.set(extra.quote_id, (extrasByQuote.get(extra.quote_id) ?? 0) + amount);
    }

    const accommodationProjects: ReconProjectInput[] = [];
    const accommodationItems: ReconItemInput[] = (rawQuotes ?? []).map((q: any) => {
      const request = q.accommodation_requests;
      if (request) {
        accommodationProjects.push({
          id: request.id,
          reference_number: null,
          customer_name: request.customer_name,
          customer_company: request.customer_company,
          selected_dates: request.arrival_date ? [request.arrival_date] : null,
        });
      }
      const total = (Number(q.price_total) || 0) + (extrasByQuote.get(q.id) ?? 0);
      return {
        id: q.id,
        request_id: request?.id ?? q.request_id ?? null,
        provider_id: q.partner_id,
        block_name: q.accommodation_name,
        // quoted_price wordt in de logica als incl. btw behandeld; bij excl.-prijzen zetten we vat_rate op 0.
        quoted_price: total,
        vat_rate: q.price_includes_vat ? (q.vat_rate ?? 9) : 0,
        commission_percentage: q.commission_percentage,
        commission_status: q.commission_status,
        commission_basis: "purchase",
        invoiced_number: q.invoiced_number,
        invoiced_amount: q.invoiced_amount,
        status: q.status,
        block_type: "partner",
        execution_date: request?.arrival_date ?? null,
        item_type: "accommodation",
      } satisfies ReconItemInput;
    });

    const invoices: ReconInvoiceInput[] = (rawInvoices ?? []).map((i: any) => ({
      id: i.id,
      partner_id: i.partner_id,
      request_id: i.request_id,
      item_id: i.item_id,
      invoice_number: i.invoice_number,
      invoice_date: i.invoice_date,
      amount_excl_vat: i.amount_excl_vat,
      amount_incl_vat: i.amount_incl_vat,
      commission_exempt: i.commission_exempt,
      commission_invoiced_at: i.commission_invoiced_at,
      created_at: i.created_at,
      allocated_item_ids: allocMap.get(i.id) ?? [],
    }));

    const rows = buildReconciliationRows({
      items: [...items, ...accommodationItems],
      invoices,
      projects: [...((projects ?? []) as ReconProjectInput[]), ...accommodationProjects],
      partners: (partners ?? []) as ReconPartnerInput[],
      settings,
    });


    const summary = summarizeReconciliation(rows);

    return new Response(JSON.stringify({ rows, summary, settings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("get-commission-reconciliation error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Onbekende fout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
