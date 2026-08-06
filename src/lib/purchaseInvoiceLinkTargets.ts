/**
 * Hulpfuncties voor het koppelen van een losse inkoopfactuur aan een
 * programma-onderdeel of logies-offerte. Pure functies zodat de match- en
 * sorteerlogica in Vitest gedekt is zonder Supabase-mocks.
 */

export interface LinkTarget {
  id: string;
  /** Naam van het onderdeel of de accommodatie. */
  label: string;
  /** Projectreferentie (BV-xxxx-xxxx) of logies-referentie. */
  projectReference: string | null;
  /** Klantnaam of bedrijf. */
  projectLabel: string | null;
  /** Verwacht bedrag incl. btw, indien bekend. */
  amountIncl: number | null;
}

export type AmountMatch = "exact" | "close" | null;

/** Hoe goed past het factuurbedrag bij het verwachte bedrag van dit doel? */
export function amountMatchFor(
  target: Pick<LinkTarget, "amountIncl">,
  invoiceAmountIncl: number | null | undefined,
): AmountMatch {
  const expected = target.amountIncl;
  const actual = Number(invoiceAmountIncl ?? NaN);
  if (expected === null || expected === undefined) return null;
  if (!Number.isFinite(actual) || !Number.isFinite(Number(expected))) return null;
  const diff = Math.abs(Number(expected) - actual);
  if (diff <= 0.02) return "exact";
  const base = Math.max(Math.abs(Number(expected)), 1);
  if (diff / base <= 0.05) return "close";
  return null;
}

const MATCH_RANK: Record<"exact" | "close" | "none", number> = { exact: 0, close: 1, none: 2 };

/** Vrij zoeken op naam, referentie of klant. */
export function matchesSearch(target: LinkTarget, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return [target.label, target.projectReference, target.projectLabel]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

/**
 * Filtert op zoekterm en zet de best passende bedragen bovenaan.
 * Binnen dezelfde matchklasse blijft de oorspronkelijke volgorde behouden.
 */
export function sortLinkTargets<T extends LinkTarget>(
  targets: T[],
  invoiceAmountIncl: number | null | undefined,
  term = "",
): T[] {
  return targets
    .filter((t) => matchesSearch(t, term))
    .map((t, index) => ({ t, index, match: amountMatchFor(t, invoiceAmountIncl) }))
    .sort((a, b) => {
      const rankA = MATCH_RANK[a.match ?? "none"];
      const rankB = MATCH_RANK[b.match ?? "none"];
      if (rankA !== rankB) return rankA - rankB;
      return a.index - b.index;
    })
    .map((entry) => entry.t);
}
