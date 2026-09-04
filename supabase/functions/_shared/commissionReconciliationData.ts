/**
 * Eén waarheid voor de commissie-reconciliatie.
 *
 * Zowel de werklijst (`get-commission-reconciliation`), de taakgenerator
 * (`flag-missing-partner-invoices`) als de opschoner (`reconcile-admin-todos`)
 * moeten met exact dezelfde invoer rekenen. Voorheen laadden ze elk hun eigen
 * set gegevens: alleen de werklijst nam logies-offertes mee, waardoor
 * logies-inkoopfacturen daar correct gematcht werden maar in de Werkbank als
 * "niet gekoppeld" opdoken. Deze loader is dus de enige plek waar de invoer
 * voor `buildReconciliationRows` wordt opgehaald.
 */

import { getCommissionRate } from "./commissionRates.ts";
import { calculateLodgingCommission, type LodgingExtraInput } from "./lodgingCommission.ts";
import {
  DEFAULT_RECON_SETTINGS,
  invoiceKey,
  type ReconInvoiceInput,
  type ReconItemInput,
  type ReconPartnerInput,
  type ReconProjectInput,
  type ReconSettings,
} from "./commissionReconciliation.ts";

/** Statussen waarbij het onderdeel daadwerkelijk verkocht is en dus commissie hoort op te leveren. */
export const SOLD_ITEM_STATUSES = [
  "confirmed",
  "accepted",
  "executed",
  "invoiced",
  "completed",
];

/** Inkoopfactuurstatussen die niet meetellen in de reconciliatie. */
export const IGNORED_INVOICE_STATUSES = ["rejected", "archived"];

export interface LoadReconciliationOptions {
  /** Beperk tot één partner (null/undefined = alle partners). */
  partnerId?: string | null;
  /**
   * Sla geannuleerde en (nog) gesnoozede projecten over. De Werkbank wil die
   * niet signaleren; de werklijst toont ze wel.
   */
  skipCancelledAndSnoozed?: boolean;
  now?: Date;
}

export interface ReconciliationInputs {
  items: ReconItemInput[];
  invoices: ReconInvoiceInput[];
  projects: ReconProjectInput[];
  partners: ReconPartnerInput[];
  settings: ReconSettings;
  /** partner::factuurnummer van alle facturen die via een onderdeel of logies gekoppeld zijn. */
  linkedInvoiceKeys: Set<string>;
}

// deno-lint-ignore no-explicit-any
type AnyClient = any;

export async function loadReconciliationSettings(client: AnyClient): Promise<ReconSettings> {
  const { data } = await client
    .from("app_settings")
    .select("id, value")
    .in("id", ["commission_match_tolerance_eur", "commission_match_tolerance_pct"]);

  // deno-lint-ignore no-explicit-any
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

export async function loadReconciliationInputs(
  client: AnyClient,
  options: LoadReconciliationOptions = {},
): Promise<ReconciliationInputs> {
  const partnerIdFilter = options.partnerId && options.partnerId !== "all" ? options.partnerId : null;
  const now = options.now ?? new Date();

  const settings = await loadReconciliationSettings(client);

  // ── Verkoopkant: programma-onderdelen ────────────────────────────────────
  let itemsQuery = client
    .from("program_request_items")
    .select(
      "id, request_id, provider_id, block_id, block_name, quoted_price, vat_rate, commission_percentage, " +
        "commission_status, commission_basis, invoiced_number, invoiced_amount, " +
        "status, block_type, proposed_date, commission_exempt, commission_exempt_reason, " +
        "commission_exempt_at",
    )
    .in("status", SOLD_ITEM_STATUSES)
    .not("provider_id", "is", null);
  if (partnerIdFilter) itemsQuery = itemsQuery.eq("provider_id", partnerIdFilter);

  // ── Inkoopkant: geregistreerde inkoopfacturen ────────────────────────────
  let invoicesQuery = client
    .from("partner_purchase_invoices")
    .select(
      "id, partner_id, request_id, item_id, invoice_number, invoice_date, amount_excl_vat, " +
        "amount_incl_vat, commission_exempt, commission_exempt_reason, commission_exempt_at, " +
        "status, created_at, commission_invoiced_at",
    );
  if (partnerIdFilter) invoicesQuery = invoicesQuery.eq("partner_id", partnerIdFilter);

  // ── Logies: geselecteerde offertes leveren ook commissie op ──────────────
  let quotesQuery = client
    .from("accommodation_quotes")
    .select(
      "id, request_id, partner_id, accommodation_name, price_total, price_includes_vat, vat_rate, " +
        "commission_percentage, commission_status, invoiced_number, invoiced_amount, status, " +
        "purchase_invoice_id, " +
        "commission_exempt, commission_exempt_reason, commission_exempt_at, " +
        "accommodation_requests!inner(id, reference_number, customer_name, customer_company, " +
        "arrival_date, departure_date, completion_status, completed_at)",

    )
    .eq("status", "selected");
  if (partnerIdFilter) quotesQuery = quotesQuery.eq("partner_id", partnerIdFilter);

  const [itemsRes, invoicesRes, quotesRes] = await Promise.all([
    itemsQuery,
    invoicesQuery,
    quotesQuery,
  ]);

  if (itemsRes.error) throw new Error(`program_request_items lookup failed: ${itemsRes.error.message}`);
  if (invoicesRes.error) {
    throw new Error(`partner_purchase_invoices lookup failed: ${invoicesRes.error.message}`);
  }
  if (quotesRes.error) throw new Error(`accommodation_quotes lookup failed: ${quotesRes.error.message}`);

  // deno-lint-ignore no-explicit-any
  const rawItems: any[] = itemsRes.data ?? [];
  // deno-lint-ignore no-explicit-any
  const rawInvoices: any[] = invoicesRes.data ?? [];
  // deno-lint-ignore no-explicit-any
  const rawQuotes: any[] = quotesRes.data ?? [];

  // ── Allocaties ───────────────────────────────────────────────────────────
  const invoiceIds = rawInvoices.map((i) => i.id);
  const allocMap = new Map<string, string[]>();
  const allocAmountMap = new Map<string, Record<string, number>>();
  if (invoiceIds.length) {
    const { data: allocations, error: allocError } = await client
      .from("partner_purchase_invoice_allocations")
      .select("invoice_id, item_id, amount_excl_vat")
      .in("invoice_id", invoiceIds);
    if (allocError) {
      throw new Error(
        `partner_purchase_invoice_allocations lookup failed: ${allocError.message}`,
      );
    }
    for (const a of allocations ?? []) {
      const arr = allocMap.get(a.invoice_id) ?? [];
      if (a.item_id) arr.push(a.item_id);
      allocMap.set(a.invoice_id, arr);
      if (a.item_id) {
        const rec = allocAmountMap.get(a.invoice_id) ?? {};
        rec[a.item_id] = (rec[a.item_id] ?? 0) + (Number(a.amount_excl_vat) || 0);
        allocAmountMap.set(a.invoice_id, rec);
      }
    }
  }

  // ── Btw-fallback vanuit de bouwsteen ─────────────────────────────────────
  // Items zonder eigen vat_rate erven het tarief van de gekoppelde bouwsteen,
  // zodat ex-btw-verkoop niet onterecht tegen 21% wordt teruggerekend.
  const blockIds = [
    ...new Set(
      rawItems.filter((i) => i.vat_rate == null && i.block_id).map((i) => i.block_id as string),
    ),
  ];
  const blockVatMap = new Map<string, number>();
  if (blockIds.length) {
    const { data: blocks, error: blocksError } = await client
      .from("building_blocks")
      .select("id, vat_rate")
      .in("id", blockIds);
    if (blocksError) {
      throw new Error(`building_blocks lookup failed: ${blocksError.message}`);
    }
    for (const b of blocks ?? []) {
      if (b.vat_rate != null) blockVatMap.set(b.id, Number(b.vat_rate));
    }
  }

  // ── Extra's bij logies-offertes (commissionabel) ─────────────────────────
  const quoteIds = rawQuotes.map((q) => q.id);
  /** De extra's per offerte, elk met eigen btw-tarief en eigen commissiepercentage. */
  const extrasByQuote = new Map<string, LodgingExtraInput[]>();
  if (quoteIds.length) {
    const { data: quoteExtras, error: extrasError } = await client
      .from("accommodation_quote_extras")
      .select(
        "quote_id, name, category, unit_price, quantity, pricing_type, vat_rate, " +
          "price_includes_vat, commission_percentage",
      )
      .in("quote_id", quoteIds);
    if (extrasError) {
      throw new Error(`accommodation_quote_extras lookup failed: ${extrasError.message}`);
    }
    for (const extra of quoteExtras ?? []) {
      const unitPrice = Number(extra.unit_price) || 0;
      const amount = extra.pricing_type === "fixed"
        ? unitPrice
        : unitPrice * (Number(extra.quantity) || 0);
      const list = extrasByQuote.get(extra.quote_id) ?? [];
      list.push({
        label: extra.name ?? extra.category ?? "Extra",
        amount,
        vatRate: extra.vat_rate,
        priceIncludesVat: extra.price_includes_vat,
        // `apply-purchase-invoice-to-lodging` zet hier het extra's-percentage van
        // de partner neer. Dat is de afspraak voor déze regel en gaat vóór.
        commissionPercentage: extra.commission_percentage,
      });
      extrasByQuote.set(extra.quote_id, list);
    }
  }

  // ── Projecten & partners ─────────────────────────────────────────────────
  const requestIds = [
    ...new Set(
      [
        ...rawItems.map((i) => i.request_id),
        ...rawInvoices.map((i) => i.request_id),
      ].filter(Boolean),
    ),
  ];

  const [projectsRes, partnersRes] = await Promise.all([
    requestIds.length
      ? client
          .from("program_requests")
          .select(
            "id, reference_number, customer_name, customer_company, selected_dates, cancelled_at, " +
              "snoozed_until, completion_status, completed_at",
          )
          .in("id", requestIds)
      : Promise.resolve({ data: [], error: null }),
    client
      .from("partners")
      .select(
        "id, name, commission_percentage, accommodation_commission_percentage, " +
          "extras_commission_percentage, pays_by_direct_debit",
      ),
  ]);

  if (projectsRes.error) throw new Error(`program_requests lookup failed: ${projectsRes.error.message}`);
  if (partnersRes.error) throw new Error(`partners lookup failed: ${partnersRes.error.message}`);

  // deno-lint-ignore no-explicit-any
  const rawProjects: any[] = projectsRes.data ?? [];

  const skipRequestIds = new Set<string>(
    options.skipCancelledAndSnoozed
      ? rawProjects
          .filter(
            (p) =>
              p.cancelled_at ||
              (p.snoozed_until && new Date(p.snoozed_until).getTime() > now.getTime()),
          )
          .map((p) => p.id)
      : [],
  );

  const items: ReconItemInput[] = rawItems
    .filter((i) => !skipRequestIds.has(i.request_id))
    .map((i) => ({
      id: i.id,
      request_id: i.request_id,
      provider_id: i.provider_id,
      block_name: i.block_name,
      quoted_price: i.quoted_price,
      vat_rate: i.vat_rate ?? blockVatMap.get(i.block_id) ?? null,
      commission_percentage: i.commission_percentage,
      commission_status: i.commission_status,
      commission_basis: i.commission_basis,
      invoiced_number: i.invoiced_number,
      invoiced_amount: i.invoiced_amount,
      status: i.status,
      block_type: i.block_type,
      execution_date: i.proposed_date ?? null,
      item_type: "activity" as const,
      commission_exempt: i.commission_exempt ?? false,
      commission_exempt_reason: i.commission_exempt_reason ?? null,
      commission_exempt_at: i.commission_exempt_at ?? null,
    }));

  const partnerById = new Map<string, ReconPartnerInput>(
    ((partnersRes.data ?? []) as ReconPartnerInput[]).map((p) => [p.id, p]),
  );

  const accommodationProjects: ReconProjectInput[] = [];
  const accommodationItems: ReconItemInput[] = rawQuotes.map((q) => {
    const request = q.accommodation_requests;
    if (request) {
      accommodationProjects.push({
        id: request.id,
        reference_number: request.reference_number ?? null,
        customer_name: request.customer_name,
        customer_company: request.customer_company,
        selected_dates: request.arrival_date ? [request.arrival_date] : null,
        completion_status: request.completion_status ?? null,
        completed_at: request.completed_at ?? null,
      });
    }
    // Kamerprijs en extra's worden apart naar ex btw teruggerekend — ze hebben
    // verschillende tarieven — en pas daarna opgeteld. We leveren de grondslag
    // dus al ex btw aan, met vat_rate 0 zodat er niet nog eens door wordt gedeeld.
    // `price_includes_vat` heeft in de database default `true`; alleen een
    // expliciete `false` betekent dat de prijs al ex btw is. Kamer en extra's
    // hanteren nu dezelfde regel — eerder gold een leeg veld bij de kamer als
    // "ex btw", wat de commissiegrondslag op oude offertes te hoog maakte.
    const roomExcl = lodgingAmountExclVat({
      unit_price: q.price_total,
      pricing_type: "fixed",
      vat_rate: q.vat_rate,
      price_includes_vat: q.price_includes_vat,
    });
    const totalExcl = roomExcl + (extrasExclByQuote.get(q.id) ?? 0);
    const partner = partnerById.get(q.partner_id);
    return {
      id: q.id,
      request_id: request?.id ?? q.request_id ?? null,
      provider_id: q.partner_id,
      block_name: q.accommodation_name,
      quoted_price: totalExcl,
      vat_rate: 0,
      commission_percentage: q.commission_percentage,
      commission_status: q.commission_status,
      commission_basis: "purchase",
      invoiced_number: q.invoiced_number,
      invoiced_amount: q.invoiced_amount,
      status: q.status,
      block_type: "partner",
      execution_date: request?.arrival_date ?? null,
      item_type: "accommodation" as const,
      commission_exempt: q.commission_exempt ?? false,
      commission_exempt_reason: q.commission_exempt_reason ?? null,
      commission_exempt_at: q.commission_exempt_at ?? null,
      // Kamer en extra's vallen onder één percentage. Wijkt het extra's-tarief
      // van deze partner daarvan af, dan moet de admin de regel nalopen.
      extras_rate_mismatch: quotesWithExtras.has(q.id) &&
        getCommissionRate(partner, "extras") !== getCommissionRate(partner, "lodging"),
    } satisfies ReconItemInput;
  });

  const allItems = [...items, ...accommodationItems];

  const invoices: ReconInvoiceInput[] = rawInvoices
    .filter((i) => !IGNORED_INVOICE_STATUSES.includes(i.status ?? ""))
    .filter((i) => !i.request_id || !skipRequestIds.has(i.request_id))
    .map((i) => ({
      id: i.id,
      partner_id: i.partner_id,
      request_id: i.request_id,
      item_id: i.item_id,
      invoice_number: i.invoice_number,
      invoice_date: i.invoice_date,
      amount_excl_vat: i.amount_excl_vat,
      amount_incl_vat: i.amount_incl_vat,
      commission_exempt: i.commission_exempt,
      commission_exempt_reason: i.commission_exempt_reason ?? null,
      commission_exempt_at: i.commission_exempt_at ?? null,

      commission_invoiced_at: i.commission_invoiced_at,
      created_at: i.created_at,
      allocated_item_ids: allocMap.get(i.id) ?? [],
      allocation_amounts: allocAmountMap.get(i.id) ?? null,
    }));

  const linkedInvoiceKeys = new Set<string>();
  for (const item of allItems) {
    if (item.invoiced_number) {
      linkedInvoiceKeys.add(invoiceKey(item.provider_id, item.invoiced_number));
    }
  }

  const projects: ReconProjectInput[] = [
    ...rawProjects.map((p) => ({
      id: p.id,
      reference_number: p.reference_number ?? null,
      customer_name: p.customer_name,
      customer_company: p.customer_company,
      selected_dates: p.selected_dates,
      completion_status: p.completion_status ?? null,
      completed_at: p.completed_at ?? null,
    })),

    ...accommodationProjects,
  ];

  return {
    items: allItems,
    invoices,
    projects,
    partners: [...partnerById.values()],
    settings,
    linkedInvoiceKeys,
  };
}
