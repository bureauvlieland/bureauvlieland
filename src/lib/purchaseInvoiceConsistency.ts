/**
 * Consistentiecheck tussen `program_request_items.invoiced_number` en de
 * werkelijke inkoopfacturen (`partner_purchase_invoices` + allocaties).
 *
 * Sinds de database-trigger `sync_item_invoice_from_allocation` is de factuurtabel
 * de enige bron van waarheid: elk item met een gekoppelde factuur krijgt automatisch
 * factuurnummer, bedrag en commissie. Wat overblijft zijn historische registraties
 * waarbij wél een factuurnummer op het item staat, maar geen factuurrij bestaat.
 * Die tonen we in de admin zodat ze handmatig opgelost kunnen worden.
 */

export interface InvoicedItemRef {
  id: string;
  request_id: string | null;
  block_name: string | null;
  invoiced_number: string | null;
  invoiced_amount: number | null;
  invoiced_date: string | null;
  provider_id: string | null;
  reference_number?: string | null;
}

export interface OrphanInvoicedItem extends InvoicedItemRef {
  reason: "no_purchase_invoice";
}

/** Factuurrij zoals we die gebruiken om dekking op nummer + leverancier vast te stellen. */
export interface PurchaseInvoiceRef {
  partner_id: string | null;
  invoice_number: string | null;
  invoice_number_normalized?: string | null;
}

/** Placeholders die gebruikers als "geen factuur" invullen. */
const PLACEHOLDER_INVOICE_NUMBERS = new Set([
  "nvt",
  "nvt.",
  "nvt-",
  "nva",
  "na",
  "n/a",
  "n.a.",
  "geen",
  "geenfactuur",
  "x",
  "xx",
  "xxx",
  "-",
  "--",
  "?",
  "0",
]);

/**
 * Normaliseert een ingevoerd factuurnummer: trim + lowercase, strip scheidingstekens.
 * Retourneert `null` voor lege waarden en placeholders zoals "nvt" of "-".
 */
export function normalizeInvoiceNumberInput(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase().replace(/[\s._]/g, "");
  if (PLACEHOLDER_INVOICE_NUMBERS.has(key)) return null;
  return trimmed;
}

/** True als de waarde bruikbaar is als factuurnummer (geen placeholder, bevat een cijfer). */
export function isValidInvoiceNumberInput(raw: string | null | undefined): boolean {
  const normalized = normalizeInvoiceNumberInput(raw);
  return !!normalized && /\d/.test(normalized);
}

/** Matchsleutel voor nummer + leverancier. */
function matchKey(partnerId: string | null | undefined, number: string | null | undefined): string | null {
  const normalized = normalizeInvoiceNumberInput(number);
  if (!normalized || !partnerId) return null;
  return `${String(partnerId).trim().toLowerCase()}::${normalized.toLowerCase().replace(/[\s._-]/g, "")}`;
}

/**
 * Items met een factuurnummer waarvoor geen enkele inkoopfactuur bestaat:
 * niet via allocatie, niet via `item_id` op de header, en ook niet als
 * factuurrij met hetzelfde nummer bij dezelfde leverancier (projectniveau
 * of verzamelfactuur). Placeholder-nummers worden genegeerd.
 */
export function findOrphanInvoicedItems(
  items: InvoicedItemRef[],
  linkedItemIds: Iterable<string>,
  invoices: PurchaseInvoiceRef[] = [],
): OrphanInvoicedItem[] {
  const linked = new Set(linkedItemIds);
  const invoiceKeys = new Set<string>();
  for (const inv of invoices) {
    const key = matchKey(inv.partner_id, inv.invoice_number_normalized ?? inv.invoice_number);
    if (key) invoiceKeys.add(key);
  }
  return items
    .filter((i) => {
      if (!normalizeInvoiceNumberInput(i.invoiced_number)) return false;
      if (linked.has(i.id)) return false;
      const key = matchKey(i.provider_id, i.invoiced_number);
      if (key && invoiceKeys.has(key)) return false;
      return true;
    })
    .map((i) => ({ ...i, reason: "no_purchase_invoice" as const }));
}


/** Verwachte commissie op basis van grondslag en percentage, afgerond op centen. */
export function expectedCommission(
  baseExclVat: number | null | undefined,
  pct: number | null | undefined,
): number {
  const base = Number(baseExclVat ?? 0);
  const p = Number(pct ?? 0);
  if (!Number.isFinite(base) || !Number.isFinite(p)) return 0;
  return Math.round((base * p) / 100 * 100) / 100;
}

/** True als het gedenormaliseerde commissiebedrag afwijkt van de verwachting. */
export function hasCommissionDrift(item: {
  invoiced_amount: number | null;
  commission_percentage: number | null;
  commission_amount: number | null;
}): boolean {
  if (item.invoiced_amount === null || item.invoiced_amount === undefined) return false;
  const expected = expectedCommission(item.invoiced_amount, item.commission_percentage);
  return Math.abs(expected - Number(item.commission_amount ?? 0)) > 0.02;
}
