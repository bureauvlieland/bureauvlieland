/**
 * Eén bedragformatter voor de portalen: "€ 1.234,56" (nl-NL, altijd twee
 * decimalen). Gebruik dit in plaats van `€{x.toLocaleString(...)}` en
 * `€{x.toFixed(2)}` naast elkaar (klantportaal fase 0 had hetzelfde probleem).
 * Een ontbrekend bedrag wordt een streepje.
 */
export function formatEuro(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "–";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

/** Zonder decimalen, voor jaarcijfers en grafieken: "€ 12.345". */
export function formatEuroRounded(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "–";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}
