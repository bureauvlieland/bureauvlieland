export interface QuoteLine {
  id?: string;
  sort_order?: number;
  description: string;
  quantity: number;
  unit?: string | null;
  unit_price_incl_vat: number;
  vat_rate: number;
}

export interface QuoteLineTotals {
  incl_vat: number;
  excl_vat: number;
  vat_amount: number;
  by_vat_rate: Record<string, { excl_vat: number; vat: number; incl_vat: number }>;
}

/**
 * Bereken totalen voor een set maatwerk-offerteregels.
 * - unit_price_incl_vat is de per-eenheid prijs **inclusief BTW** (consistent met memory: alle invoer incl. BTW).
 * - Ongeldige/lege waarden tellen als 0 zodat de UI niet crasht tijdens typen.
 */
export function computeQuoteLineTotals(lines: QuoteLine[]): QuoteLineTotals {
  const totals: QuoteLineTotals = {
    incl_vat: 0,
    excl_vat: 0,
    vat_amount: 0,
    by_vat_rate: {},
  };

  for (const line of lines || []) {
    const qty = Number.isFinite(line?.quantity) ? Math.max(0, Number(line.quantity)) : 0;
    const unit = Number.isFinite(line?.unit_price_incl_vat)
      ? Math.max(0, Number(line.unit_price_incl_vat))
      : 0;
    const rate = Number.isFinite(line?.vat_rate) ? Math.max(0, Number(line.vat_rate)) : 0;

    const incl = qty * unit;
    const excl = incl / (1 + rate / 100);
    const vat = incl - excl;

    totals.incl_vat += incl;
    totals.excl_vat += excl;
    totals.vat_amount += vat;

    const key = String(rate);
    const bucket = totals.by_vat_rate[key] || { excl_vat: 0, vat: 0, incl_vat: 0 };
    bucket.excl_vat += excl;
    bucket.vat += vat;
    bucket.incl_vat += incl;
    totals.by_vat_rate[key] = bucket;
  }

  // Round to 2 decimals for stability
  totals.incl_vat = round2(totals.incl_vat);
  totals.excl_vat = round2(totals.excl_vat);
  totals.vat_amount = round2(totals.vat_amount);
  for (const k of Object.keys(totals.by_vat_rate)) {
    totals.by_vat_rate[k] = {
      excl_vat: round2(totals.by_vat_rate[k].excl_vat),
      vat: round2(totals.by_vat_rate[k].vat),
      incl_vat: round2(totals.by_vat_rate[k].incl_vat),
    };
  }
  return totals;
}

/**
 * Bureau Vlieland commissie: 10% over totaal EX BTW.
 */
export function computeCommission(lines: QuoteLine[], percentage = 10): number {
  const { excl_vat } = computeQuoteLineTotals(lines);
  return round2((excl_vat * percentage) / 100);
}

export function isValidLine(line: QuoteLine): boolean {
  return (
    typeof line.description === "string" &&
    line.description.trim().length > 0 &&
    Number.isFinite(line.quantity) &&
    line.quantity > 0 &&
    Number.isFinite(line.unit_price_incl_vat) &&
    line.unit_price_incl_vat >= 0 &&
    Number.isFinite(line.vat_rate) &&
    line.vat_rate >= 0
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
