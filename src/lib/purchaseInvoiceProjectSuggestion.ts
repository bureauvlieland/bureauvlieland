/**
 * Projectsuggestie bij een inkoopfactuur.
 *
 * Partners zetten er vaak bij voor wie het werk was — "Groep: Timmerfabriek de
 * Houtmolen" onderaan een Doeksen-factuur, of ons eigen referentienummer. Die
 * aanwijzing staat al in de gescande tekst; hij werd alleen niet gebruikt.
 *
 * Een treffer op ons eigen referentienummer is zeker genoeg om het project vast
 * voor te kiezen: dat nummer staat alleen op facturen die bij dat project horen,
 * en je bevestigt het nog met opslaan. Een treffer op bedrijfs- of klantnaam
 * blijft een suggestie die je zelf aanklikt, want een verkeerd gekoppelde factuur
 * belandt op de verkeerde klantfactuur én op de verkeerde commissiegrondslag.
 * Daarom staat er ook bij wáárom een project wordt voorgesteld, zodat je het in
 * één oogopslag kunt beoordelen.
 */

export interface SuggestableProject {
  id: string;
  reference_number: string | null;
  customer_name: string | null;
  customer_company: string | null;
}

export type ProjectMatchReason = "reference" | "company" | "customer" | "surname";

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
  surname: 30,
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
 * Aanhef en titels zoals wij ze bij de klant opslaan ("Mevrouw. M. Swagerman",
 * "Dhr. en mw. Jansen"). Een partner schrijft de gast zelden precies zo op zijn
 * factuur, dus ze mogen niet meetellen in wat er gevonden moet worden.
 */
const SALUTATION = "(?:mevrouw|mevr|mw|mej|mejuffrouw|de heer|dhr|hr|meneer|mr|mrs|ms|fam|familie|dr|drs|ir|ing|prof)";
const LEADING_SALUTATIONS = new RegExp(`^(?:${SALUTATION}(?:\\s+en\\s+${SALUTATION})?\\s+)+`);

/** Voorvoegsels die bij de achternaam horen: "de Boer", "van der Berg". */
const SURNAME_PREFIXES = new Set(["de", "den", "der", "het", "t", "van", "von", "ten", "ter", "te", "op", "in", "aan", "la", "le", "du", "da"]);

/** Haalt de aanhef van een klantnaam af: "mevrouw m swagerman" → "m swagerman". */
export function stripSalutation(value: string): string {
  return value.replace(LEADING_SALUTATIONS, "").trim();
}

/**
 * De achternaam uit een klantnaam zonder aanhef: het laatste woord plus de
 * voorvoegsels ervoor. "karin de boer" → "de boer", "m swagerman" → "swagerman".
 * Eén enkel woord is al de achternaam; die geeft niets extra's terug.
 */
export function surnameOf(value: string): string | null {
  const words = value.split(" ").filter(Boolean);
  if (words.length < 2) return null;
  let start = words.length - 1;
  while (start > 0 && SURNAME_PREFIXES.has(words[start - 1])) start -= 1;
  if (start === 0) return null;
  return words.slice(start).join(" ");
}

/**
 * Staat `needle` als hele woorden in `haystack`? Beide zijn al genormaliseerd,
 * dus een spatie is de enige woordgrens. Zonder deze grens vindt "de boer" ook
 * "op de boerderij".
 */
const containsWords = (haystack: string, needle: string) =>
  ` ${haystack} `.includes(` ${needle} `);

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
    needle: string | null,
    matchedOn: string,
    { requireDistinctive = true }: { requireDistinctive?: boolean } = {},
  ) => {
    if (!needle) return;
    if (requireDistinctive && !isDistinctive(needle)) return;
    if (!containsWords(haystack, needle)) return;

    const score = SCORES[reason];
    // Bij gelijke score wint het project dat als eerste langskomt; de aanroeper
    // levert ze op datum aan, dus dat is het meest recente.
    if (best && best.score >= score) return;
    best = { projectId, reason, matchedOn, score };
  };

  for (const project of projects) {
    // Ons eigen referentienummer op hun factuur is het sterkste signaal dat er is.
    if (project.reference_number) {
      consider(project.id, "reference", normalizeForMatch(project.reference_number), project.reference_number, {
        requireDistinctive: false,
      });
    }
    if (project.customer_company) {
      consider(project.id, "company", stripLegalForm(normalizeForMatch(project.customer_company)), project.customer_company);
    }
    // Een particuliere klant staat bij ons met aanhef en voorletters ("Mevrouw.
    // M. Swagerman"); de partner schrijft meestal "Mw. Swagerman" of alleen
    // "Swagerman" op de factuur. Daarom telt de aanhef niet mee en wordt ook op
    // de achternaam alleen gezocht — met minder gewicht, want die is minder uniek.
    if (project.customer_name) {
      const customer = stripSalutation(normalizeForMatch(project.customer_name));
      consider(project.id, "customer", customer, project.customer_name);
      const surname = surnameOf(customer);
      if (surname) consider(project.id, "surname", surname, surname);
    }
  }

  if (!best) return null;
  const { projectId, reason, matchedOn } = best;
  return { projectId, reason, matchedOn };
}

/** Alleen ons referentienummer op de factuur is zeker genoeg om vast voor te kiezen. */
export function shouldPreselectProject(suggestion: ProjectSuggestion | null): boolean {
  return suggestion?.reason === "reference";
}

export const PROJECT_MATCH_LABELS: Record<ProjectMatchReason, string> = {
  reference: "referentienummer op de factuur",
  company: "bedrijfsnaam op de factuur",
  customer: "klantnaam op de factuur",
  surname: "achternaam van de klant op de factuur",
};
