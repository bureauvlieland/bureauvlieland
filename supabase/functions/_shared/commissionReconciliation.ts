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

import { getCommissionRate, type CommissionPartner } from "./commissionRates.ts";
import type { LodgingCommissionComponent } from "./lodgingCommission.ts";

export type ReconStatus =
  | "missing_invoice"
  | "unlinked_invoice"
  | "deviation"
  | "match"
  | "exempt";

/** Soort regel in de werklijst. */
export type ReconItemType = "activity" | "accommodation" | "purchase_invoice";

/** Is de regel al factureerbaar (uitgevoerd) of nog een verwachte commissie? */
export type ReconReadiness = "expected" | "billable";

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
  /** Admin heeft deze regel definitief commissievrij (gearchiveerd) gemarkeerd. */
  commission_exempt?: boolean | null;
  commission_exempt_reason?: string | null;
  commission_exempt_at?: string | null;
  /**
   * Per component uitgesplitste commissie (logies: kamer + extra's), elk met het
   * btw-tarief en percentage dat bij dat component hoort. Is dit gezet, dan is het
   * leidend boven `quoted_price × commission_percentage`.
   */
  commission_components?: LodgingCommissionComponent[] | null;
  /**
   * De eindfactuur van de partner is al 1-op-1 op deze offerte toegepast
   * (`accommodation_quotes.purchase_invoice_id`). De offerte ís dan de factuur,
   * minus de toeristenbelasting die er bewust uit gelaten is.
   */
  purchase_invoice_applied?: boolean | null;
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
  commission_exempt_reason?: string | null;
  commission_exempt_at?: string | null;
  created_at?: string | null;
  /** Gezet zodra deze inkoopfactuur op een commissiefactuur is meegenomen. */
  commission_invoiced_at?: string | null;
  /** item_ids uit partner_purchase_invoice_allocations. */
  allocated_item_ids?: string[];
  /**
   * Bedrag ex btw per gealloceerd item (item_id → bedrag). Als deze gezet is en
   * minstens één allocatie bevat, telt alleen het gealloceerde bedrag mee voor
   * een item (niet het volledige factuurbedrag) — voorkomt dubbeltelling bij
   * verzamelfacturen die over meerdere onderdelen zijn verdeeld.
   */
  allocation_amounts?: Record<string, number> | null;
}

export interface ReconProjectInput {
  id: string;
  reference_number: string | null;
  customer_name: string | null;
  customer_company: string | null;
  selected_dates?: unknown;
  /** Afrondingsfase van het project (ready_for_invoice, fully_invoiced, …). */
  completion_status?: string | null;
  completed_at?: string | null;
}


export interface ReconPartnerInput extends CommissionPartner {
  id: string;
  name: string | null;
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
  /** True als deze regel commissievrij is (partner, factuur of admin-archivering). */
  commissionExempt: boolean;
  /** Reden die de admin gaf bij het commissievrij markeren. */
  exemptReason: string | null;
  /** Moment van commissievrij markeren. */
  exemptAt: string | null;
  /** Factureerbaar (uitgevoerd) of nog verwacht. */
  readiness: ReconReadiness;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  executionDate: string | null;
  commissionStatus: string | null;
  commissionBasis: string | null;
  /** Aantal dagen sinds uitvoering (missing) of registratie (unlinked). */
  ageDays: number | null;
  /**
   * Uitsplitsing van de commissie over kamer en extra's, elk met eigen btw-tarief
   * en percentage. Gevuld bij logies; leeg bij programma-onderdelen. Is dit gevuld,
   * dan is `commissionAtRisk`/`salesCommission` de som van deze componenten en is
   * `commissionPercentage` slechts het effectieve percentage om te tonen.
   */
  commissionComponents: LodgingCommissionComponent[] | null;
  /** True als niet alle componenten hetzelfde percentage hebben. */
  hasMixedRates: boolean;
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

/**
 * Statussen waarbij de commissie al is afgehandeld en de regel dus uit de werklijst mag.
 *
 * LET OP: `not_applicable` staat hier bewust NIET bij. Dat is de databasedefault van
 * `program_request_items.commission_status` en betekent "nog niet in de commissieflow
 * opgepakt", niet "commissievrij". Vrijstelling loopt via `commissionExempt`
 * (commissievrije partner of `commission_exempt` op de inkoopfactuur) of 0% commissie.
 */
export const COMMISSION_SETTLED_STATUSES = ["invoiced", "paid"];

/**
 * Itemstatussen waarbij het werk daadwerkelijk is uitgevoerd. Pas dan mag de regel
 * in "Te factureren" staan; daarvoor is het een verwachte commissie.
 */
export const EXECUTED_ITEM_STATUSES = ["executed", "invoiced", "completed"];

/** Projectafronding-statussen waarbij het project de facturatiefase in is. */
export const COMPLETED_PROJECT_STATUSES = [
  "ready_for_invoice",
  "partially_invoiced",
  "fully_invoiced",
  "completed",
];

/**
 * Is dit onderdeel/logies al uitgevoerd (en dus factureerbaar), of nog verwacht?
 *
 * Bewust niet op datum: een project dat nog moet plaatsvinden levert een verwachte
 * commissie op, ook als de datum inmiddels verstreken is maar niets is afgerond.
 */
export function readinessForItem(input: {
  status?: string | null;
  projectCompleted?: boolean | null;
  hasPurchaseInvoice?: boolean | null;
}): ReconReadiness {
  if (input.status && EXECUTED_ITEM_STATUSES.includes(input.status)) return "billable";
  if (input.projectCompleted) return "billable";
  return "expected";
}

/** Regels die nog gefactureerd moeten worden: uitgevoerd, niet commissievrij en niet afgehandeld. */
export function isBillableRow(row: ReconRow): boolean {
  if (row.readiness !== "billable") return false;
  if (row.commissionExempt) return false;
  if (row.commissionStatus && COMMISSION_SETTLED_STATUSES.includes(row.commissionStatus)) return false;
  return row.commissionPercentage > 0;
}

/** Regels die nog moeten plaatsvinden: verwachte commissie, nog niet factureerbaar. */
export function isExpectedRow(row: ReconRow): boolean {
  if (row.readiness !== "expected") return false;
  if (row.commissionExempt) return false;
  if (row.commissionStatus && COMMISSION_SETTLED_STATUSES.includes(row.commissionStatus)) return false;
  return row.commissionPercentage > 0;
}

/** Regels die de admin definitief buiten de commissieflow heeft gezet. */
export function isArchivedRow(row: ReconRow): boolean {
  return row.commissionExempt === true;
}



/** Partners waarvoor commissie principieel niet van toepassing is. */
export const COMMISSION_FREE_PARTNER_IDS = new Set<string>([
  "rederij",
  "bureau",
]);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const round2 = (value: number): number => Math.round(value * 100) / 100;

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
  // Per koppeling bewaren we het bedrag dat voor díT item meetelt: bij
  // verzamelfacturen met allocaties is dat het gealloceerde deelbedrag.
  const invoicesByItem = new Map<string, { inv: ReconInvoiceInput; amount: number | null }[]>();
  const amountForItem = (itemId: string, inv: ReconInvoiceInput): number | null => {
    const allocs = inv.allocation_amounts;
    if (allocs && Object.keys(allocs).length > 0) {
      const allocAmount = allocs[itemId];
      return allocAmount === undefined ? 0 : toNumber(allocAmount);
    }
    return toNumber(inv.amount_excl_vat);
  };
  const pushInvoice = (itemId: string, inv: ReconInvoiceInput) => {
    const arr = invoicesByItem.get(itemId) ?? [];
    if (!arr.some((e) => e.inv.id === inv.id)) arr.push({ inv, amount: amountForItem(itemId, inv) });
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
    // Logies valt terug op het logiespercentage van de partner, niet op het
    // activiteitenpercentage. Beide staan in `partners`; eerder werd alleen het
    // activiteitenpercentage geraadpleegd.
    const components = item.commission_components ?? null;
    const hasComponents = !!components && components.length > 0;
    const componentCommission = hasComponents
      ? round2(components!.reduce((sum, c) => sum + c.commissionAmount, 0))
      : null;
    const componentBase = hasComponents
      ? round2(components!.reduce((sum, c) => sum + c.baseExclVat, 0))
      : null;

    // Bij logies met componenten is het rijpercentage alleen ter weergave: het is
    // het percentage dat de som van de componenten oplevert over de som van de
    // grondslagen. Reken ermee via `salesCommission`, niet via dit getal.
    const commissionPct = hasComponents
      ? (componentBase === 0 ? 0 : round2((componentCommission! / componentBase!) * 100))
      : (toNumber(item.commission_percentage)
        ?? getCommissionRate(partner, item.item_type === "accommodation" ? "lodging" : "activity"));

    const activeInvoices = (invoicesByItem.get(item.id) ?? []).filter((e) => e.inv.commission_exempt !== true);
    const purchaseExcl = activeInvoices.length > 0
      ? activeInvoices.reduce((sum, e) => sum + (e.amount ?? 0), 0)
      : (toNumber(item.invoiced_amount) !== null && item.invoiced_number ? toNumber(item.invoiced_amount) : null);

    // Logies waarvan de eindfactuur al 1-op-1 op de offerte staat: de offerte ís
    // de factuur, mét de juiste tarieven per component en zónder de
    // toeristenbelasting die er bewust uit is gelaten. Het ruwe factuurbedrag
    // gebruiken zou die belasting weer meetellen én de percentages platslaan.
    const invoiceApplied = item.purchase_invoice_applied === true;
    const salesBase = componentBase ?? salesExcl;

    const executionDate = item.execution_date ?? firstSelectedDate(project?.selected_dates);

    const archived = item.commission_exempt === true;

    let status: ReconStatus;
    if (archived || COMMISSION_FREE_PARTNER_IDS.has(partnerId) || commissionPct <= 0) {
      status = "exempt";
    } else if (purchaseExcl === null) {
      status = "missing_invoice";
    } else if (invoiceApplied) {
      // De offerte is overschreven mét deze factuur; een afwijking is per definitie
      // uitgesloten. Het verschil dat overblijft is de toeristenbelasting.
      status = "match";
    } else if (salesBase === null || isWithinTolerance(salesBase, purchaseExcl, settings)) {
      status = "match";
    } else {
      status = "deviation";
    }

    const basisAmount = purchaseExcl ?? salesBase ?? 0;
    const exemptItem = status === "exempt";
    // Is de factuur al op de offerte toegepast, dan is de verkoopkant de
    // authoritatieve grondslag — niet het ruwe factuurbedrag.
    const commissionBasis = invoiceApplied ? "sales" : (item.commission_basis ?? "purchase");
    const projectCompleted = Boolean(
      project?.completed_at ||
        (project?.completion_status &&
          COMPLETED_PROJECT_STATUSES.includes(project.completion_status)),
    );
    const readiness = readinessForItem({ status: item.status, projectCompleted });


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
      invoiceId: activeInvoices[0]?.inv.id ?? null,
      itemType: item.item_type ?? "activity",
      label: item.block_name ?? "Onbekend onderdeel",
      salesExclVat: salesBase,
      purchaseExclVat: purchaseExcl,
      differenceExclVat: salesBase !== null && purchaseExcl !== null ? purchaseExcl - salesBase : null,
      commissionPercentage: commissionPct,
      commissionAtRisk: exemptItem
        ? 0
        : (componentCommission ?? basisAmount * (commissionPct / 100)),
      // Bij logies met componenten is de som van de componenten de verkoopcommissie:
      // elk component tegen zijn eigen tarief en percentage.
      salesCommission: exemptItem
        ? 0
        : componentCommission ?? (salesExcl === null ? null : salesExcl * (commissionPct / 100)),

      purchaseCommission: exemptItem || purchaseExcl === null
        ? (exemptItem ? 0 : null)
        : purchaseExcl * (commissionPct / 100),
      defaultBasis: defaultBasisForRow({ purchaseExclVat: purchaseExcl, commissionBasis }),
      commissionExempt: exemptItem,
      exemptReason: item.commission_exempt_reason ?? null,
      exemptAt: item.commission_exempt_at ?? null,
      readiness,
      invoiceNumber: activeInvoices[0]?.inv.invoice_number ?? item.invoiced_number,
      invoiceDate: activeInvoices[0]?.inv.invoice_date ?? null,

      executionDate,
      commissionStatus: item.commission_status,
      commissionBasis,
      ageDays: daysSince(executionDate, now),
      commissionComponents: components,
      hasMixedRates: components
        ? new Set(components.map((c) => c.commissionPct)).size > 1
        : false,
    });
  }

  // ── 2. Regels vanuit de inkoopkant (facturen zonder koppeling) ──────────
  for (const inv of input.invoices) {
    if (invoiceIsLinked(inv, linkedInvoiceNumbers)) continue;

    const partnerId = inv.partner_id ?? "";
    const partner = partnerMap.get(partnerId);
    const project = inv.request_id ? projectMap.get(inv.request_id) : undefined;
    const purchaseExcl = toNumber(inv.amount_excl_vat);
    // Een losse inkoopfactuur hangt aan geen onderdeel, dus geldt het
    // activiteitenpercentage van de partner.
    const commissionPct = getCommissionRate(partner, "activity");
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
      exemptReason: inv.commission_exempt_reason ?? null,
      exemptAt: inv.commission_exempt_at ?? null,
      // Losse inkoopfacturen zijn per definitie geleverd werk: altijd factureerbaar.
      readiness: "billable",
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date,

      executionDate: null,
      commissionStatus: inv.commission_invoiced_at ? "invoiced" : null,
      commissionBasis: null,
      ageDays: daysSince(inv.invoice_date ?? inv.created_at ?? null, now),
      commissionComponents: null,
      hasMixedRates: false,
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
