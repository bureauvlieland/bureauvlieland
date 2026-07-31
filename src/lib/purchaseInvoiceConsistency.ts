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

/**
 * Items met een factuurnummer waarvoor geen enkele inkoopfactuurrij bestaat
 * (niet via allocatie en niet via `item_id` op de header).
 */
export function findOrphanInvoicedItems(
  items: InvoicedItemRef[],
  linkedItemIds: Iterable<string>,
): OrphanInvoicedItem[] {
  const linked = new Set(linkedItemIds);
  return items
    .filter((i) => !!i.invoiced_number && !linked.has(i.id))
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
