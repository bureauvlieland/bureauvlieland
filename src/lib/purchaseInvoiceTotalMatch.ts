/**
 * Helpers voor het valideren dat een geregistreerde inkoopfactuur qua totaalbedrag
 * overeenkomt met wat er daadwerkelijk op de PDF staat.
 *
 * Kernidee: naast het door ons berekende `amount_incl_vat` (som van de line-rows)
 * kennen we ook een `pdf_total_incl_vat` (het door de scanner uitgelezen totaal-
 * bedrag van de originele PDF). Als die niet overeenkomen (buiten een cent-marge),
 * moet de admin ofwel de regels corrigeren, ofwel een expliciete afwijkingsreden
 * opgeven voordat opgeslagen mag worden.
 */

export const AMOUNT_MATCH_TOLERANCE = 0.02;

export interface TotalMatchInput {
  computedInclVat: number;
  pdfInclVat: number | null | undefined;
}

export type TotalMatchStatus = "match" | "mismatch" | "no_pdf_total";

export interface TotalMatchResult {
  status: TotalMatchStatus;
  difference: number; // computed - pdf (positive = we hebben te veel geregistreerd)
  absoluteDifference: number;
  computedInclVat: number;
  pdfInclVat: number | null;
}

export function evaluateTotalMatch(input: TotalMatchInput): TotalMatchResult {
  const computed = round2(input.computedInclVat);
  const pdf = input.pdfInclVat == null ? null : round2(input.pdfInclVat);

  if (pdf == null) {
    return {
      status: "no_pdf_total",
      difference: 0,
      absoluteDifference: 0,
      computedInclVat: computed,
      pdfInclVat: null,
    };
  }

  const diff = round2(computed - pdf);
  const abs = Math.abs(diff);
  return {
    status: abs <= AMOUNT_MATCH_TOLERANCE ? "match" : "mismatch",
    difference: diff,
    absoluteDifference: round2(abs),
    computedInclVat: computed,
    pdfInclVat: pdf,
  };
}

/**
 * Bereken excl-BTW en BTW-bedrag uit een eenheidsprijs die INCLUSIEF BTW is.
 * Bijv. €49,70 incl @ 9% → excl €45,60, btw €4,10.
 */
export function unitPriceInclusiveToBreakdown(
  unitPriceIncl: number,
  quantity: number,
  vatRate: number,
): { amount_excl_vat: number; vat_amount: number; amount_incl_vat: number } {
  const totalIncl = round2(unitPriceIncl * quantity);
  const totalExcl = round2(totalIncl / (1 + vatRate / 100));
  const vat = round2(totalIncl - totalExcl);
  return { amount_excl_vat: totalExcl, vat_amount: vat, amount_incl_vat: totalIncl };
}

/**
 * Bereken totalen uit een eenheidsprijs die EXCLUSIEF BTW is.
 */
export function unitPriceExclusiveToBreakdown(
  unitPriceExcl: number,
  quantity: number,
  vatRate: number,
): { amount_excl_vat: number; vat_amount: number; amount_incl_vat: number } {
  const totalExcl = round2(unitPriceExcl * quantity);
  const vat = round2(totalExcl * (vatRate / 100));
  return { amount_excl_vat: totalExcl, vat_amount: vat, amount_incl_vat: round2(totalExcl + vat) };
}

/**
 * Guard voor het opslaan van een inkoopfactuur.
 * Retourneert een lijst van blocking errors (leeg = mag opslaan).
 */
export interface SaveGuardInput {
  computedInclVat: number;
  pdfInclVat: number | null | undefined;
  mismatchReason: string | null | undefined;
  /** Bij `no_pdf_total`: heeft admin expliciet bevestigd dat het bedrag klopt? */
  manuallyConfirmed?: boolean;
}

export function evaluateSaveGuard(input: SaveGuardInput): { canSave: boolean; blockers: string[]; match: TotalMatchResult } {
  const match = evaluateTotalMatch({
    computedInclVat: input.computedInclVat,
    pdfInclVat: input.pdfInclVat,
  });
  const blockers: string[] = [];

  if (match.status === "mismatch") {
    const hasReason = !!(input.mismatchReason && input.mismatchReason.trim().length >= 3);
    if (!hasReason) {
      blockers.push(
        `Ons totaal (€${match.computedInclVat.toFixed(2)}) wijkt €${match.absoluteDifference.toFixed(2)} af van het PDF-totaal (€${match.pdfInclVat?.toFixed(2)}). Corrigeer de regels of geef een reden op.`,
      );
    }
  }

  if (match.status === "no_pdf_total" && !input.manuallyConfirmed) {
    blockers.push("Kon PDF-totaal niet automatisch verifiëren — bevestig handmatig dat het geregistreerde bedrag klopt.");
  }

  return { canSave: blockers.length === 0, blockers, match };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
