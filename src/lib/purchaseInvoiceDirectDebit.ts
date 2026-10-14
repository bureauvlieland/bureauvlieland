// Inkoopfacturen van partners die zelf incasseren (Rederij Doeksen).
// Dependency-vrij zodat dit in node/vitest laadt zonder JSDOM.
// Zelfde rekenregel als supabase/functions/_shared/purchaseInvoiceDirectDebit.ts.

export interface DirectDebitInvoice {
  status?: string | null;
  amount_incl_vat?: number | null;
  supplier_commission_excl_vat?: number | null;
  supplier_commission_vat?: number | null;
  partner?: { pays_by_direct_debit?: boolean | null } | null;
}

/**
 * Wat de partner werkelijk incasseert. Houdt hij commissie in op de factuur
 * (verzamelfactuur overtochten), dan is dat bruto incl. btw minus die
 * commissie. Zonder ingehouden commissie (catering) is het het brutobedrag.
 */
export function directDebitAmount(invoice: DirectDebitInvoice): number {
  const gross = Number(invoice.amount_incl_vat ?? 0);
  const commission =
    Number(invoice.supplier_commission_excl_vat ?? 0) + Number(invoice.supplier_commission_vat ?? 0);
  return Number((commission > 0 ? gross - commission : gross).toFixed(2));
}

/** Houdt de partner commissie in, zodat het incassobedrag van het factuurbedrag afwijkt? */
export function withholdsCommission(invoice: DirectDebitInvoice): boolean {
  return directDebitAmount(invoice) !== Number((Number(invoice.amount_incl_vat ?? 0)).toFixed(2));
}

/**
 * "Doorgestuurd" betekent bij zo'n partner niet "wacht op betaalbatch" maar
 * "wacht op de incasso op het bankafschrift". Die bevestiging zet de factuur
 * op betaald.
 */
export function isAwaitingDirectDebit(invoice: DirectDebitInvoice): boolean {
  return !!invoice.partner?.pays_by_direct_debit && invoice.status === "forwarded";
}
