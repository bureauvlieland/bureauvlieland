/**
 * Eén waarheid voor de vraag "is er al een inkoopfactuur voor dit onderdeel?".
 *
 * De automatische controle-taak (check-pending-items) keek eerder alleen naar
 * partner_purchase_invoices.item_id. Facturen die via e-mail binnenkomen worden
 * echter vaak op projectniveau gekoppeld (item_id blijft leeg) en/of via het
 * factuurnummer op het onderdeel geregistreerd — waardoor partners onterecht
 * een herinnering kregen voor een al verwerkte (zelfs betaalde) factuur.
 *
 * Deze helper gebruikt dezelfde signalen als de Commissie Werklijst
 * (_shared/commissionReconciliation.ts):
 *  - directe koppeling via partner_purchase_invoices.item_id
 *  - toewijzing via partner_purchase_invoice_allocations
 *  - factuurnummer op het onderdeel dat matcht met een factuur van dezelfde partner
 *  - partner heeft het onderdeel afgesloten met "geen factuur"
 */

export interface InvoicePresenceItem {
  id: string;
  provider_id?: string | null;
  invoiced_number?: string | null;
  partner_dismissed_at?: string | null;
}

export interface InvoicePresenceIndex {
  /** item_ids met een directe factuurkoppeling. */
  invoiceItemIds: Set<string>;
  /** item_ids die via een (verzamel)factuur-allocatie zijn toegewezen. */
  allocatedItemIds: Set<string>;
  /** Genormaliseerde `partner::factuurnummer` sleutels van bestaande facturen. */
  invoiceKeys: Set<string>;
}

/** Genormaliseerde sleutel zodat notatieverschillen (spaties/case) matchen. */
export function invoicePresenceKey(
  partnerId: string | null | undefined,
  invoiceNumber: string | null | undefined,
): string {
  const partner = (partnerId ?? "").trim().toLowerCase();
  const number = (invoiceNumber ?? "").replace(/\s+/g, "").trim().toLowerCase();
  return `${partner}::${number}`;
}

export function buildInvoicePresenceIndex(input: {
  invoices: { item_id?: string | null; partner_id?: string | null; invoice_number?: string | null }[];
  allocations?: { item_id?: string | null }[];
}): InvoicePresenceIndex {
  const invoiceItemIds = new Set<string>();
  const allocatedItemIds = new Set<string>();
  const invoiceKeys = new Set<string>();

  for (const inv of input.invoices ?? []) {
    if (inv.item_id) invoiceItemIds.add(inv.item_id);
    if (inv.invoice_number) invoiceKeys.add(invoicePresenceKey(inv.partner_id, inv.invoice_number));
  }
  for (const alloc of input.allocations ?? []) {
    if (alloc.item_id) allocatedItemIds.add(alloc.item_id);
  }

  return { invoiceItemIds, allocatedItemIds, invoiceKeys };
}

/** True als er op enige manier een factuur bekend is (of de partner heeft afgezien). */
export function hasPartnerInvoiceSignal(
  item: InvoicePresenceItem,
  index: InvoicePresenceIndex,
): boolean {
  if (!item) return false;
  if (item.partner_dismissed_at) return true;
  if (index.invoiceItemIds.has(item.id)) return true;
  if (index.allocatedItemIds.has(item.id)) return true;
  if (item.invoiced_number) {
    const key = invoicePresenceKey(item.provider_id, item.invoiced_number);
    if (index.invoiceKeys.has(key)) return true;
    // Factuurnummer staat op het onderdeel geregistreerd (bijv. via het
    // partnerportaal) maar de PDF/factuurrij is nog niet aangemaakt: ook dan
    // is de factuur "binnen" en hoeft er geen herinnering te gaan.
    return true;
  }
  return false;
}
