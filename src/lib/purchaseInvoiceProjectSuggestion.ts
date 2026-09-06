/**
 * Projectsuggestie bij een inkoopfactuur.
 *
 * Partners zetten er vaak bij voor wie het werk was — "Groep: Timmerfabriek de
 * Houtmolen" onderaan een Doeksen-factuur, of ons eigen referentienummer. Die
 * aanwijzing staat al in de gescande tekst; hij werd alleen niet gebruikt.
 *
 * De suggestie is nadrukkelijk een suggestie: hij vult niets vanzelf in, want een
 * verkeerd gekoppelde factuur belandt op de verkeerde klantfactuur én op de
 * verkeerde commissiegrondslag. Daarom staat er ook bij wáárom een project wordt
 * voorgesteld, zodat je het in één oogopslag kunt beoordelen.
 */

export interface SuggestableProject {
  id: string;
  reference_number: string | null;
  customer_name: string | null;
  customer_company: string | null;
}

export type ProjectMatchReason = "reference" | "company" | "customer";

export interface ProjectSuggestion {
  projectId: string;
  reason: ProjectMatchReason;
  /** De tekst uit de factuur waarop de match berust. */
  matchedOn: string;
}

/** Hoe zwaar een treffer weegt; hoger wint. */
const SCORES: Record<ProjectMatchReason, number> = {
  reference: 100,
  company: 60,
  customer: 40,
};

/**
 * Maakt tekst vergelijkbaar: kleine letters, accenten weg, leestekens naar
 * spaties, dubbele spaties samengevoegd.
 */
export function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Rechtsvormen zeggen niets over wélk bedrijf het is. */
const LEGAL_SUFFIXES = /\b(bv|b v|nv|n v|vof|v o f|cv|c v|bvba|gmbh|ltd|inc|stichting|vereniging)\b/g;

const stripLegalForm = (value: string) => value.replace(LEGAL_SUFFIXES, " ").trim().replace(/\s+/g, " ");

/**
 * Te korte of te algemene namen leveren toevalstreffers op. "Ad" of "De Zon"
 * komt in willekeurige factuurtekst voor; daar wil je geen suggestie op.
 */
const isDistinctive = (value: string) => value.length >= 6 && value.includes(" ")
  ? true
  : value.length >= 8;

/**
 * Zoekt het project dat het best bij de gescande factuurtekst past.
 *
 * `text` is alles wat we van de factuur hebben: de omschrijving, de regels, en
 * eventueel het onderwerp van de mail waarmee hij binnenkwam.
 */
export function suggestProjectFromText(
  text: string,
  projects: SuggestableProject[],
): ProjectSuggestion | null {
  const haystack = normalizeForMatch(text || "");
  if (!haystack) return null;

  let best: (ProjectSuggestion & { score: number }) | null = null;

  const consider = (
    projectId: string,
    reason: ProjectMatchReason,
    raw: string | null,
    { requireDistinctive = true }: { requireDistinctive?: boolean } = {},
  ) => {
    if (!raw) return;
    const needle = reason === "reference"
      ? normalizeForMatch(raw)
      : stripLegalForm(normalizeForMatch(raw));
    if (!needle) return;
    if (requireDistinctive && !isDistinctive(needle)) return;
    if (!haystack.includes(needle)) return;

    const score = SCORES[reason];
    // Bij gelijke score wint het project dat als eerste langskomt; de aanroeper
    // levert ze op datum aan, dus dat is het meest recente.
    if (best && best.score >= score) return;
    best = { projectId, reason, matchedOn: raw, score };
  };

  for (const project of projects) {
    // Ons eigen referentienummer op hun factuur is het sterkste signaal dat er is.
    consider(project.id, "reference", project.reference_number, { requireDistinctive: false });
    consider(project.id, "company", project.customer_company);
    consider(project.id, "customer", project.customer_name);
  }

  if (!best) return null;
  const { projectId, reason, matchedOn } = best;
  return { projectId, reason, matchedOn };
}

export const PROJECT_MATCH_LABELS: Record<ProjectMatchReason, string> = {
  reference: "referentienummer op de factuur",
  company: "bedrijfsnaam op de factuur",
  customer: "klantnaam op de factuur",
};
