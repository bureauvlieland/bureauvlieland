/**
 * Eén optelling voor de commissiefactuur.
 *
 * De regel is: **eerst per regel afronden op centen, dan optellen.** Zo is de som
 * van de regels die op de PDF staan gegarandeerd gelijk aan het subtotaal eronder,
 * en is subtotaal + btw gegarandeerd gelijk aan het totaal inclusief.
 *
 * Eerder telde het subtotaal de onafgeronde regelbedragen op en rondde pas daarna
 * af, terwijl de PDF en de database elke regel apart afrondden. Bij vijf regels van
 * 10 % liep dat twee cent uiteen: de regels op de factuur telden op tot € 67,71
 * terwijl het subtotaal € 67,69 vermeldde. Dezelfde afwijking zat tussen de opgeslagen
 * regels en de opgeslagen factuurkop.
 *
 * Iedereen die een bedrag op een commissiefactuur toont of opslaat — het scherm,
 * de PDF en de database — hoort dit via `calculateCommissionInvoiceTotals` te doen.
 */

/** Btw-tarief over commissie: een dienst van het bureau aan de partner. */
export const COMMISSION_VAT_RATE = 21;

export const round2 = (value: number): number => Math.round(value * 100) / 100;

export interface CommissionTotalsLineInput {
  /** Grondslag ex btw waarover commissie wordt gerekend. */
  baseAmountExclVat: number;
  /** Commissiepercentage voor deze regel. */
  commissionPct: number;
}

export interface CommissionTotalsLine extends CommissionTotalsLineInput {
  /** Commissiebedrag voor deze regel, afgerond op centen. Dit bedrag is leidend. */
  commissionAmount: number;
}

export interface CommissionInvoiceTotals {
  /** De regels met hun definitieve, afgeronde commissiebedrag. */
  lines: CommissionTotalsLine[];
  /** Som van de afgeronde regelbedragen. */
  totalExclVat: number;
  vatRate: number;
  totalVat: number;
  totalInclVat: number;
}

/** Commissiebedrag van één regel, afgerond op centen. */
export function commissionAmountForLine(line: CommissionTotalsLineInput): number {
  const base = Number(line.baseAmountExclVat) || 0;
  const pct = Number(line.commissionPct) || 0;
  return round2((base * pct) / 100);
}

/**
 * Berekent de regelbedragen en de voet van de commissiefactuur.
 *
 * Gegarandeerd: `sum(lines[].commissionAmount) === totalExclVat` en
 * `totalExclVat + totalVat === totalInclVat`, beide op de cent.
 */
export function calculateCommissionInvoiceTotals(
  inputLines: CommissionTotalsLineInput[],
  vatRate: number = COMMISSION_VAT_RATE,
): CommissionInvoiceTotals {
  const lines: CommissionTotalsLine[] = inputLines.map((line) => ({
    ...line,
    commissionAmount: commissionAmountForLine(line),
  }));

  // Optellen van al afgeronde centen: round2 vangt hier alleen de drijvende-komma-ruis.
  const totalExclVat = round2(lines.reduce((sum, l) => sum + l.commissionAmount, 0));
  const safeRate = Number(vatRate) || 0;
  const totalVat = round2(totalExclVat * (safeRate / 100));

  return {
    lines,
    totalExclVat,
    vatRate: safeRate,
    totalVat,
    // Uit de twee bedragen die op de factuur staan, niet uit een derde berekening.
    totalInclVat: round2(totalExclVat + totalVat),
  };
}
