/**
 * Commissie-reconciliatie: matcht onze verkoopwaarde tegen geregistreerde inkoopfacturen.
 *
 * Twee lekken die dit dicht:
 *  1. Verkocht/uitgevoerd, maar de partner heeft nooit een inkoopfactuur ingediend
 *     -> geen commissie, want de commissieflow start pas bij een gekoppelde inkoopfactuur.
 *  2. Inkoopfactuur wél geregistreerd, maar nooit aan een programma-onderdeel gekoppeld
 *     -> valt eveneens buiten de commissieflow.
 *
 * Deze module is puur (geen I/O) zodat hij zowel in de admin-UI als in edge functions
 * gebruikt kan worden en volledig te testen is.
 */

export type ReconStatus =
  | "missing_invoice"
  | "unlinked_invoice"
  | "deviation"
  | "match"
  | "exempt";

/** Soort regel in de werklijst. */
export type ReconItemType = "activity" | "accommodation" | "purchase_invoice";

/** Grondslag voor de commissieberekening. */
export type CommissionBasis = "purchase" | "sales";


export interface ReconSettings {
  /** Absolute tolerantie in euro's (ex btw). */
  toleranceEur: number;
  /** Relatieve tolerantie in procenten. */
  tolerancePct: number;
}

export const DEFAULT_RECON_SETTINGS: ReconSettings = {
  toleranceEur: 5,
  tolerancePct: 2,
};

export interface ReconItemInput {
  id: string;
  request_id: string | null;
  provider_id: string | null;
  block_name: string | null;
  /** Verkoopprijs incl. btw zoals wij die aan de klant factureren. */
  quoted_price: number | null;
  vat_rate: number | null;
  commission_percentage: number | null;
  commission_status: string | null;
  commission_basis?: string | null;
  invoiced_number: string | null;
  invoiced_amount: number | null;
  status: string | null;
  block_type?: string | null;
  /** Datum waarop het onderdeel plaatsvond (yyyy-mm-dd). */
  execution_date?: string | null;
  /** "activity" (programma-onderdeel) of "accommodation" (logies-offerte). */
  item_type?: ReconItemType;
}


export interface ReconInvoiceInput {
  id: string;
  partner_id: string | null;
  request_id: string | null;
  item_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount_excl_vat: number | null;
  amount_incl_vat: number | null;
  commission_exempt?: boolean | null;
  created_at?: string | null;
  /** Gezet zodra deze inkoopfactuur op een commissiefactuur is meegenomen. */
  commission_invoiced_at?: string | null;
  /** item_ids uit partner_purchase_invoice_allocations. */
  allocated_item_ids?: string[];
}

export interface ReconProjectInput {
  id: string;
  reference_number: string | null;
  customer_name: string | null;
  customer_company: string | null;
  selected_dates?: unknown;
}

export interface ReconPartnerInput {
  id: string;
  name: string | null;
  commission_percentage?: number | null;
  pays_by_direct_debit?: boolean | null;
}

export interface ReconRow {
  key: string;
  status: ReconStatus;
  partnerId: string;
  partnerName: string;
  projectId: string | null;
  projectReference: string | null;
  /** Bedrijfsnaam indien bekend, anders de klantnaam. */
  projectLabel: string | null;
  /** Naam van de contactpersoon/klant (los van bedrijfsnaam). */
  customerName: string | null;

  itemId: string | null;
  invoiceId: string | null;
  /** Soort regel: programma-onderdeel, logies-offerte of losse inkoopfactuur. */
  itemType: ReconItemType;
  label: string;
  /** Verkoopwaarde ex btw. */
  salesExclVat: number | null;
  /** Inkoopfactuurbedrag ex btw. */
  purchaseExclVat: number | null;
  /** purchase - sales (ex btw); positief = partner factureerde meer dan wij verkochten. */
  differenceExclVat: number | null;
  commissionPercentage: number;
  /** Commissie die we mislopen/verwachten op basis van de beste beschikbare grondslag. */
  commissionAtRisk: number;
  /** Commissie op basis van onze verkoopwaarde (null als er geen verkoopwaarde is). */
  salesCommission: number | null;
  /** Commissie op basis van de inkoopfactuur (null als er geen factuur is). */
  purchaseCommission: number | null;
  /** Voorgestelde grondslag: inkoop indien beschikbaar, anders verkoop. */
  defaultBasis: CommissionBasis;
  /** True als deze regel commissievrij is (partner of factuur). */
  commissionExempt: boolean;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  executionDate: string | null;
  commissionStatus: string | null;
  commissionBasis: string | null;
  /** Aantal dagen sinds uitvoering (missing) of registratie (unlinked). */
  ageDays: number | null;
}

/** Voorgestelde grondslag voor een regel. */
export function defaultBasisForRow(row: {
  purchaseExclVat: number | null;
  commissionBasis?: string | null;
}): CommissionBasis {
  if (row.commissionBasis === "sales") return "sales";
  return row.purchaseExclVat !== null ? "purchase" : "sales";
}

/** Commissiebedrag voor een gekozen grondslag; valt terug op de andere grondslag als de gekozene ontbreekt. */
export function commissionForBasis(
  row: Pick<ReconRow, "salesCommission" | "purchaseCommission">,
  basis: CommissionBasis,
): number {
  const chosen = basis === "sales" ? row.salesCommission : row.purchaseCommission;
  if (chosen !== null && chosen !== undefined) return chosen;
  const fallback = basis === "sales" ? row.purchaseCommission : row.salesCommission;
  return fallback ?? 0;
}

/** Grondslagbedrag (ex btw) voor een gekozen grondslag. */
export function basisAmountForBasis(
  row: Pick<ReconRow, "salesExclVat" | "purchaseExclVat">,
  basis: CommissionBasis,
): number {
  const chosen = basis === "sales" ? row.salesExclVat : row.purchaseExclVat;
  if (chosen !== null && chosen !== undefined) return chosen;
  const fallback = basis === "sales" ? row.purchaseExclVat : row.salesExclVat;
  return fallback ?? 0;
}

/** Regels die nog gefactureerd moeten worden (commissie niet gefactureerd/betaald en niet commissievrij). */
export function isBillableRow(row: ReconRow): boolean {
  if (row.commissionExempt) return false;
  if (row.commissionStatus && ["invoiced", "paid", "not_applicable"].includes(row.commissionStatus)) return false;
  return row.commissionPercentage > 0;
}


/** Partners waarvoor commissie principieel niet van toepassing is. */
export const COMMISSION_FREE_PARTNER_IDS = new Set<string>([
  "rederij",
  "bureau",
]);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysSince(dateStr: string | null | undefined, now: Date = new Date()): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((now.getTime() - d.getTime()) / MS_PER_DAY);
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/** Haalt de eerste datum uit selected_dates (jsonb array of string). */
export function firstSelectedDate(selectedDates: unknown): string | null {
  if (Array.isArray(selectedDates) && selectedDates.length > 0) {
    const first = selectedDates[0];
    return typeof first === "string" ? first : null;
  }
  if (typeof selectedDates === "string" && selectedDates) return selectedDates;
  return null;
}

export function exclVatFromIncl(inclVat: number, vatRate: number | null): number {
  const rate = vatRate === null || vatRate === undefined ? 21 : vatRate;
  return inclVat / (1 + rate / 100);
}

/** Binnen tolerantie? */
export function isWithinTolerance(
  sales: number,
  purchase: number,
  settings: ReconSettings = DEFAULT_RECON_SETTINGS,
): boolean {
  const diff = Math.abs(purchase - sales);
  if (diff <= settings.toleranceEur) return true;
  const base = Math.max(Math.abs(sales), 0.01);
  return (diff / base) * 100 <= settings.tolerancePct;
}

/** Is deze factuur op enige manier aan een programma-onderdeel of logies-offerte gekoppeld? */
export function invoiceIsLinked(
  invoice: ReconInvoiceInput,
  itemsByInvoiceNumber: Set<string>,
): boolean {
  if (invoice.item_id) return true;
  if ((invoice.allocated_item_ids?.length ?? 0) > 0) return true;
  if (invoice.invoice_number && itemsByInvoiceNumber.has(invoiceKey(invoice.partner_id, invoice.invoice_number))) {
    return true;
  }
  return false;
}

export function invoiceKey(partnerId: string | null | undefined, invoiceNumber: string | null | undefined): string {
  return `${(partnerId ?? "").trim().toLowerCase()}::${(invoiceNumber ?? "").trim().toLowerCase()}`;
}

export interface BuildReconInput {
  items: ReconItemInput[];
  invoices: ReconInvoiceInput[];
  projects: ReconProjectInput[];
  partners: ReconPartnerInput[];
  settings?: ReconSettings;
  now?: Date;
}

/**
 * Bouwt één regel per programma-onderdeel dat commissie zou moeten opleveren,
 * plus één regel per inkoopfactuur die nergens aan gekoppeld is.
 */
export function buildReconciliationRows(input: BuildReconInput): ReconRow[] {
  const settings = input.settings ?? DEFAULT_RECON_SETTINGS;
  const now = input.now ?? new Date();

  const partnerMap = new Map(input.partners.map((p) => [p.id, p]));
  const projectMap = new Map(input.projects.map((p) => [p.id, p]));

  // Index: alle factuurnummers die aan een item hangen (voor koppelingsdetectie).
  const linkedInvoiceNumbers = new Set<string>();
  for (const item of input.items) {
    if (item.invoiced_number) {
      linkedInvoiceNumbers.add(invoiceKey(item.provider_id, item.invoiced_number));
    }
  }

  // Index: facturen per item (via item_id, allocaties of factuurnummer).
  const invoicesByItem = new Map<string, ReconInvoiceInput[]>();
  const pushInvoice = (itemId: string, inv: ReconInvoiceInput) => {
    const arr = invoicesByItem.get(itemId) ?? [];
    if (!arr.some((i) => i.id === inv.id)) arr.push(inv);
    invoicesByItem.set(itemId, arr);
  };

  for (const inv of input.invoices) {
    if (inv.item_id) pushInvoice(inv.item_id, inv);
    for (const allocId of inv.allocated_item_ids ?? []) pushInvoice(allocId, inv);
  }
  for (const item of input.items) {
    if (!item.invoiced_number) continue;
    const key = invoiceKey(item.provider_id, item.invoiced_number);
    for (const inv of input.invoices) {
      if (invoiceKey(inv.partner_id, inv.invoice_number) === key) pushInvoice(item.id, inv);
    }
  }

  const rows: ReconRow[] = [];

  // ── 1. Regels vanuit de verkoopkant (programma-onderdelen) ──────────────
  for (const item of input.items) {
    const partnerId = item.provider_id ?? "";
    if (!partnerId) continue;
    if (item.block_type === "bureau" || item.block_type === "self_arranged") continue;

    const partner = partnerMap.get(partnerId);
    const project = item.request_id ? projectMap.get(item.request_id) : undefined;
    const quoted = toNumber(item.quoted_price);
    const salesExcl = quoted === null ? null : exclVatFromIncl(quoted, toNumber(item.vat_rate));
    const commissionPct = toNumber(item.commission_percentage) ?? toNumber(partner?.commission_percentage) ?? 10;

    const invoices = invoicesByItem.get(item.id) ?? [];
    const activeInvoices = invoices.filter((i) => i.commission_exempt !== true);
    const purchaseExcl = activeInvoices.length > 0
      ? activeInvoices.reduce((sum, i) => sum + (toNumber(i.amount_excl_vat) ?? 0), 0)
      : (toNumber(item.invoiced_amount) !== null && item.invoiced_number ? toNumber(item.invoiced_amount) : null);

    const executionDate = item.execution_date ?? firstSelectedDate(project?.selected_dates);

    let status: ReconStatus;
    if (COMMISSION_FREE_PARTNER_IDS.has(partnerId) || commissionPct <= 0) {
      status = "exempt";
    } else if (purchaseExcl === null) {
      status = "missing_invoice";
    } else if (salesExcl === null || isWithinTolerance(salesExcl, purchaseExcl, settings)) {
      status = "match";
    } else {
      status = "deviation";
    }

    const basisAmount = purchaseExcl ?? salesExcl ?? 0;
    const exemptItem = status === "exempt";
    const commissionBasis = item.commission_basis ?? "purchase";

    rows.push({
      key: `item:${item.id}`,
      status,
      partnerId,
      partnerName: partner?.name ?? partnerId,
      projectId: item.request_id,
      projectReference: project?.reference_number ?? null,
      projectLabel: project?.customer_company || project?.customer_name || null,
      customerName: project?.customer_name ?? null,

      itemId: item.id,
      invoiceId: activeInvoices[0]?.id ?? null,
      itemType: item.item_type ?? "activity",
      label: item.block_name ?? "Onbekend onderdeel",
      salesExclVat: salesExcl,
      purchaseExclVat: purchaseExcl,
      differenceExclVat: salesExcl !== null && purchaseExcl !== null ? purchaseExcl - salesExcl : null,
      commissionPercentage: commissionPct,
      commissionAtRisk: exemptItem ? 0 : basisAmount * (commissionPct / 100),
      salesCommission: exemptItem || salesExcl === null ? (exemptItem ? 0 : null) : salesExcl * (commissionPct / 100),
      purchaseCommission: exemptItem || purchaseExcl === null
        ? (exemptItem ? 0 : null)
        : purchaseExcl * (commissionPct / 100),
      defaultBasis: defaultBasisForRow({ purchaseExclVat: purchaseExcl, commissionBasis }),
      commissionExempt: exemptItem,
      invoiceNumber: activeInvoices[0]?.invoice_number ?? item.invoiced_number,
      invoiceDate: activeInvoices[0]?.invoice_date ?? null,
      executionDate,
      commissionStatus: item.commission_status,
      commissionBasis,
      ageDays: daysSince(executionDate, now),
    });
  }

  // ── 2. Regels vanuit de inkoopkant (facturen zonder koppeling) ──────────
  for (const inv of input.invoices) {
    if (invoiceIsLinked(inv, linkedInvoiceNumbers)) continue;

    const partnerId = inv.partner_id ?? "";
    const partner = partnerMap.get(partnerId);
    const project = inv.request_id ? projectMap.get(inv.request_id) : undefined;
    const purchaseExcl = toNumber(inv.amount_excl_vat);
    const commissionPct = toNumber(partner?.commission_percentage) ?? 10;
    const exempt = inv.commission_exempt === true || COMMISSION_FREE_PARTNER_IDS.has(partnerId);
    const purchaseCommission = exempt ? 0 : (purchaseExcl ?? 0) * (commissionPct / 100);

    rows.push({
      key: `invoice:${inv.id}`,
      status: exempt ? "exempt" : "unlinked_invoice",
      partnerId,
      partnerName: partner?.name ?? partnerId,
      projectId: inv.request_id,
      projectReference: project?.reference_number ?? null,
      projectLabel: project?.customer_company || project?.customer_name || null,
      customerName: project?.customer_name ?? null,

      itemId: null,
      invoiceId: inv.id,
      itemType: "purchase_invoice",
      label: `Inkoopfactuur ${inv.invoice_number ?? "zonder nummer"}`,
      salesExclVat: null,
      purchaseExclVat: purchaseExcl,
      differenceExclVat: null,
      commissionPercentage: commissionPct,
      commissionAtRisk: exempt ? 0 : (purchaseExcl ?? 0) * (commissionPct / 100),
      salesCommission: null,
      purchaseCommission,
      defaultBasis: "purchase",
      commissionExempt: exempt,
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date,
      executionDate: null,
      commissionStatus: inv.commission_invoiced_at ? "invoiced" : null,
      commissionBasis: null,
      ageDays: daysSince(inv.invoice_date ?? inv.created_at ?? null, now),
    });
  }


  return rows;
}

export interface ReconSummary {
  total: number;
  missingInvoice: number;
  unlinkedInvoice: number;
  deviation: number;
  match: number;
  exempt: number;
  /** Som van commissie die nu buiten beeld valt (missing + unlinked). */
  commissionAtRisk: number;
  /** Aantal regels dat aandacht vraagt. */
  openCount: number;
}

export function summarizeReconciliation(rows: ReconRow[]): ReconSummary {
  const summary: ReconSummary = {
    total: rows.length,
    missingInvoice: 0,
    unlinkedInvoice: 0,
    deviation: 0,
    match: 0,
    exempt: 0,
    commissionAtRisk: 0,
    openCount: 0,
  };

  for (const row of rows) {
    switch (row.status) {
      case "missing_invoice":
        summary.missingInvoice++;
        summary.commissionAtRisk += row.commissionAtRisk;
        break;
      case "unlinked_invoice":
        summary.unlinkedInvoice++;
        summary.commissionAtRisk += row.commissionAtRisk;
        break;
      case "deviation":
        summary.deviation++;
        break;
      case "match":
        summary.match++;
        break;
      case "exempt":
        summary.exempt++;
        break;
    }
  }

  summary.openCount = summary.missingInvoice + summary.unlinkedInvoice + summary.deviation;
  return summary;
}

export const RECON_STATUS_LABELS: Record<ReconStatus, string> = {
  missing_invoice: "Inkoopfactuur ontbreekt",
  unlinked_invoice: "Factuur niet gekoppeld",
  deviation: "Afwijking",
  match: "Match",
  exempt: "Commissievrij",
};
