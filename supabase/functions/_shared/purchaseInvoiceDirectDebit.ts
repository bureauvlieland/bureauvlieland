/**
 * Wat een leverancier die zelf incasseert werkelijk van de rekening haalt.
 * Houdt hij commissie in op de factuur (verzamelfactuur overtochten Doeksen),
 * dan is dat bruto incl. btw minus de ingehouden commissie. Geen commissie
 * (catering Doeksen): niets, het brutobedrag is dan het incassobedrag.
 *
 * Zelfde regel als src/lib/purchaseInvoiceDirectDebit.ts in de frontend.
 */
export interface DirectDebitAmountInput {
  amount_incl_vat: number | null;
  supplier_commission_excl_vat?: number | null;
  supplier_commission_vat?: number | null;
}

export function directDebitAmount(invoice: DirectDebitAmountInput): number | null {
  const commission = Number(invoice.supplier_commission_excl_vat ?? 0) + Number(invoice.supplier_commission_vat ?? 0);
  if (!(commission > 0)) return null;
  return Number((Number(invoice.amount_incl_vat ?? 0) - commission).toFixed(2));
}
