/**
 * Bepaalt welke commissie (en welke status) de Commissie-kolom in het
 * Inkoopfacturen-overzicht toont voor één inkoopfactuur.
 *
 * Bronnen, in volgorde:
 * 1. Snapshot op de factuurkop (supplier_commission_excl_vat).
 * 2. Het direct gekoppelde programma-onderdeel (item_id).
 * 3. De onderdelen die via allocaties aan de factuur hangen (verzamelfactuur).
 * 4. Een gekoppelde logies-offerte.
 */

export type CommissionStatus = "pending" | "invoiced" | "paid" | string;

interface CommissionCarrier {
  commission_amount?: number | null;
  commission_status?: string | null;
}

export interface CommissionSourceInvoice {
  supplier_commission_excl_vat?: number | null;
  program_request_item?: CommissionCarrier | null;
  allocations?: Array<{ program_request_item?: CommissionCarrier | null }> | null;
  accommodation_quote?: CommissionCarrier | null;
}

export interface ResolvedCommission {
  amount: number;
  status: CommissionStatus;
}

const num = (v: unknown) => Number(v || 0);

/**
 * Vat de statussen van meerdere onderdelen samen tot één status voor de kolom.
 * Zolang één onderdeel nog open staat is het geheel "Openstaand".
 */
export function aggregateCommissionStatus(statuses: Array<string | null | undefined>): CommissionStatus {
  const known = statuses.filter((s): s is string => !!s);
  if (known.length === 0) return "pending";
  if (known.some((s) => s === "pending")) return "pending";
  if (known.every((s) => s === "paid")) return "paid";
  if (known.some((s) => s === "invoiced")) return "invoiced";
  return known[0];
}

export function resolveInvoiceCommission(invoice: CommissionSourceInvoice): ResolvedCommission | null {
  const stamped = num(invoice.supplier_commission_excl_vat);
  const item = invoice.program_request_item;
  const allocationItems = (invoice.allocations || [])
    .map((a) => a.program_request_item)
    .filter((i): i is CommissionCarrier => !!i);
  const quote = invoice.accommodation_quote;

  const itemComm = num(item?.commission_amount);
  const allocComm = allocationItems.reduce((s, i) => s + num(i.commission_amount), 0);
  const quoteComm = num(quote?.commission_amount);

  const amount = Number((stamped || itemComm || allocComm || quoteComm).toFixed(2));
  if (!amount) return null;

  let status: CommissionStatus;
  if (item?.commission_status) {
    status = item.commission_status;
  } else if (allocationItems.length > 0) {
    status = aggregateCommissionStatus(allocationItems.map((i) => i.commission_status));
  } else if (quote?.commission_status) {
    status = quote.commission_status;
  } else {
    status = "pending";
  }

  return { amount, status };
}
