/**
 * Matchregels van de bankafschriften (match-bank-lines): welke facturen of
 * batches bij een bankregel passen en hoe zeker dat is. Pure functies, los
 * van de database, zodat ze te testen zijn.
 *
 * Inkomend: verkoopfacturen aan klanten en commissiefacturen aan partners.
 * Uitgaand: betaalbatches en inkoopfacturen van partners.
 */

export type MatchType = "sales" | "purchase" | "batch" | "commission";

export interface MatchCandidate {
  type: MatchType;
  id: string;
  /** Factuurnummer of batchreferentie, zoals die in de omschrijving kan staan. */
  reference: string | null;
  amount: number | null;
}

export interface MatchSuggestion {
  type: MatchType;
  id: string;
  label: string | null;
  amount: number | null;
  confidence: number;
}

export interface BankLineInput {
  direction: "in" | "out";
  amount: number;
  description?: string | null;
  end_to_end_id?: string | null;
  remittance_info?: string | null;
}

export interface MatchCandidates {
  sales: MatchCandidate[];
  commission: MatchCandidate[];
  purchase: MatchCandidate[];
  batch: MatchCandidate[];
}

/** Zekerheid per type: referentie + bedrag, alleen referentie, alleen bedrag. */
const SCORES: Record<MatchType, [number, number, number | null]> = {
  sales: [0.98, 0.7, 0.5],
  commission: [0.98, 0.7, 0.5],
  purchase: [0.95, 0.6, 0.4],
  // Een batch zonder referentie in de omschrijving is geen match.
  batch: [0.98, 0.7, null],
};

export function lineSearchText(line: BankLineInput): string {
  return `${line.description ?? ""} ${line.end_to_end_id ?? ""} ${line.remittance_info ?? ""}`.toUpperCase();
}

function score(candidate: MatchCandidate, text: string, amount: number): number | null {
  const [both, refOnly, amountOnly] = SCORES[candidate.type];
  const ref = (candidate.reference ?? "").toUpperCase();
  const refMatch = !!ref && text.includes(ref);
  const amountMatch = Math.abs(Number(candidate.amount ?? 0) - amount) < 0.01;
  if (refMatch && amountMatch) return both;
  if (refMatch) return refOnly;
  if (amountMatch) return amountOnly;
  return null;
}

/** Alle passende kandidaten voor een bankregel, zekerste eerst. */
export function suggestionsForLine(line: BankLineInput, candidates: MatchCandidates): MatchSuggestion[] {
  const text = lineSearchText(line);
  const amount = Math.abs(Number(line.amount));
  const pool =
    line.direction === "in"
      ? [...candidates.sales, ...candidates.commission]
      : [...candidates.batch, ...candidates.purchase];

  const suggestions: MatchSuggestion[] = [];
  for (const candidate of pool) {
    const confidence = score(candidate, text, amount);
    if (confidence === null) continue;
    suggestions.push({
      type: candidate.type,
      id: candidate.id,
      label: candidate.reference,
      amount: candidate.amount,
      confidence,
    });
  }
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

export interface MatchDecision {
  status: "unmatched" | "suggested" | "ambiguous";
  matchedType: MatchType | null;
  matchedId: string | null;
  confidence: number | null;
  /** Telt mee als automatisch gematcht (één zekere kandidaat). */
  automatic: boolean;
}

/**
 * Eén zekere kandidaat (≥ 0,95) wint; meerdere kandidaten zonder zo'n winnaar
 * zijn "meerdere"; één onzekere kandidaat is een voorstel.
 */
export function decideMatch(suggestions: MatchSuggestion[]): MatchDecision {
  const top = suggestions[0];
  const sure = suggestions.filter((s) => s.confidence >= 0.95);
  if (top && top.confidence >= 0.95 && sure.length === 1) {
    return { status: "suggested", matchedType: top.type, matchedId: top.id, confidence: top.confidence, automatic: true };
  }
  if (suggestions.length > 1) {
    return { status: "ambiguous", matchedType: null, matchedId: null, confidence: null, automatic: false };
  }
  if (top) {
    return { status: "suggested", matchedType: top.type, matchedId: top.id, confidence: top.confidence, automatic: false };
  }
  return { status: "unmatched", matchedType: null, matchedId: null, confidence: null, automatic: false };
}
