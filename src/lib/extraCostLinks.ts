/**
 * Overige kosten op een project gekoppeld aan inkoopfacturen. Pure functies
 * voor de kostenkaart, het kostensheet en de kaart Inkoopfacturen op de
 * projectpagina, zodat de reken- en sorteerlogica in Vitest gedekt is.
 *
 * Een kostenregel (bureau-onderdeel met `day_index` -1) wijst met
 * `purchase_invoice_id` naar hoogstens één inkoopfactuur; één inkoopfactuur
 * kan meerdere kostenregels dekken (een kampeerfactuur met staplaats,
 * kampeerterrein en reserveringskosten). Koppelen is optioneel: de bestaande
 * werkwijze met losse kosten en losse facturen blijft werken.
 */
import { amountMatchFor } from "@/lib/purchaseInvoiceLinkTargets";

export interface ExtraCostLike {
  id: string;
  block_name: string;
  admin_price_override: number | null;
  purchase_invoice_id?: string | null;
}

export interface CostInvoiceLike {
  id: string;
  invoice_number: string;
  invoice_date?: string | null;
  amount_excl_vat: number | null;
  vat_amount?: number | null;
  amount_incl_vat: number | null;
  vat_rate?: number | null;
  description?: string | null;
  refund_pending_at?: string | null;
  partner?: { name: string } | null;
}

export interface CostPrefill {
  description: string;
  amount: number;
  vatRate: number;
  notes: string;
  providerName: string;
  purchaseInvoiceId: string;
}

export interface InvoiceCoverage<I extends CostInvoiceLike = CostInvoiceLike> {
  invoice: I;
  costs: ExtraCostLike[];
  /** Som van de gekoppelde kostenregels (verkoop, incl. btw). */
  sale: number;
  /** Factuurbedrag incl. btw. */
  purchase: number;
  /** Hoeveel de kostenregels tekortkomen om de factuur te dekken (0 als gedekt). */
  shortfall: number;
}

export interface ExtraCostSummary {
  /** Alle kostenregels samen. */
  sale: number;
  /** Kostenregels met een gekoppelde inkoopfactuur. */
  linkedSale: number;
  /** Gekoppelde inkoopfacturen, elke factuur één keer. */
  purchase: number;
  /** linkedSale min purchase. */
  margin: number;
  linkedCostCount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Factuurbedrag incl. btw, ook als alleen excl. en btw zijn vastgelegd. */
export function invoiceAmountIncl(invoice: Pick<CostInvoiceLike, "amount_incl_vat" | "amount_excl_vat" | "vat_amount">): number {
  const incl = Number(invoice.amount_incl_vat);
  if (Number.isFinite(incl) && invoice.amount_incl_vat !== null) return round2(incl);
  return round2((Number(invoice.amount_excl_vat) || 0) + (Number(invoice.vat_amount) || 0));
}

export const COST_VAT_RATES = [21, 9, 0] as const;

/** Het btw-tarief van de factuur, teruggebracht tot de keuzes in het kostensheet. */
export function costVatRateFor(invoice: Pick<CostInvoiceLike, "vat_rate">): number {
  if (invoice.vat_rate === null || invoice.vat_rate === undefined) return 21;
  const rate = Number(invoice.vat_rate);
  return (COST_VAT_RATES as readonly number[]).includes(rate) ? rate : 21;
}

export function invoicePartnerName(invoice: Pick<CostInvoiceLike, "partner">): string {
  return invoice.partner?.name?.trim() || "Leverancier";
}

/** Voorinvulling van het kostensheet vanuit een inkoopfactuur ("Als kosten opvoeren"). */
export function costPrefillFromInvoice(invoice: CostInvoiceLike): CostPrefill {
  const partner = invoicePartnerName(invoice);
  const description = invoice.description?.trim();
  return {
    description: description ? `${partner}: ${description}` : partner,
    amount: invoiceAmountIncl(invoice),
    vatRate: costVatRateFor(invoice),
    notes: `Inkoopfactuur ${invoice.invoice_number} van ${partner}`,
    providerName: partner,
    purchaseInvoiceId: invoice.id,
  };
}

/** Per gekoppelde factuur: welke kostenregels erop wijzen en of ze de inkoop dekken. */
export function invoiceCoverage<I extends CostInvoiceLike>(costs: ExtraCostLike[], invoices: I[]): Map<string, InvoiceCoverage<I>> {
  const byId = new Map(invoices.map((inv) => [inv.id, inv]));
  const result = new Map<string, InvoiceCoverage<I>>();
  for (const cost of costs) {
    const invoiceId = cost.purchase_invoice_id;
    if (!invoiceId) continue;
    const invoice = byId.get(invoiceId);
    if (!invoice) continue;
    const entry = result.get(invoiceId) ?? { invoice, costs: [], sale: 0, purchase: invoiceAmountIncl(invoice), shortfall: 0 };
    entry.costs.push(cost);
    entry.sale = round2(entry.sale + (Number(cost.admin_price_override) || 0));
    entry.shortfall = Math.max(0, round2(entry.purchase - entry.sale));
    result.set(invoiceId, entry);
  }
  return result;
}

/** Verkoop, inkoop en marge van de kostenkaart. */
export function summarizeExtraCosts(costs: ExtraCostLike[], invoices: CostInvoiceLike[]): ExtraCostSummary {
  const coverage = invoiceCoverage(costs, invoices);
  const sale = round2(costs.reduce((sum, c) => sum + (Number(c.admin_price_override) || 0), 0));
  let linkedSale = 0;
  let purchase = 0;
  let linkedCostCount = 0;
  for (const entry of coverage.values()) {
    linkedSale += entry.sale;
    purchase += entry.purchase;
    linkedCostCount += entry.costs.length;
  }
  linkedSale = round2(linkedSale);
  purchase = round2(purchase);
  return { sale, linkedSale, purchase, margin: round2(linkedSale - purchase), linkedCostCount };
}

/** Inkoopfacturen zonder kostenregel (de knop "Als kosten opvoeren"); facturen in creditering tellen niet. */
export function unlinkedInvoices<I extends CostInvoiceLike>(invoices: I[], costs: ExtraCostLike[]): I[] {
  const linked = new Set(costs.map((c) => c.purchase_invoice_id).filter(Boolean));
  return invoices.filter((inv) => !linked.has(inv.id) && !inv.refund_pending_at);
}

/**
 * Keuzelijst in het kostensheet: een factuur waarvan het bedrag precies past
 * bij het ingevulde bedrag bovenaan, dan bijna passend, dan de rest op datum
 * (nieuwste eerst).
 */
export function sortInvoicesForCost<I extends CostInvoiceLike>(invoices: I[], amountIncl: number | null): I[] {
  const rank = (inv: I) => {
    const match = amountMatchFor({ amountIncl: invoiceAmountIncl(inv) }, amountIncl);
    return match === "exact" ? 0 : match === "close" ? 1 : 2;
  };
  return [...invoices].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return (b.invoice_date ?? "").localeCompare(a.invoice_date ?? "");
  });
}
