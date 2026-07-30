/**
 * Consistentiebewaking tussen SEO-landingspagina's en `activityContent`.
 *
 * Doel: voorkomen dat een landingspagina (FAQ-array of het KeyFacts-blok)
 * feiten claimt — duur, prijs, groepsgrootte — die niet terugkomen in de
 * centrale bron `src/content/activityContent.ts`. Zo kan een correctie in
 * de content nooit stilzwijgend naast een verouderde landingspagina blijven
 * bestaan.
 *
 * Deze module bevat alleen pure functies zodat zowel het prebuild-script
 * (`scripts/validate-activity-facts.ts`) als de vitest-suite hem gebruikt.
 */

/** Landingspagina → slug in `activityContent`. */
export const ACTIVITY_PAGE_MAP: { file: string; slug: string }[] = [
  { file: "src/pages/ZeehondentochtenVlieland.tsx", slug: "zeehondentocht" },
  { file: "src/pages/WadlopenVlieland.tsx", slug: "wadloopexcursie" },
];

export type FactKind = "duur" | "prijs" | "groepsgrootte";

export type FactViolation = {
  file: string;
  slug: string;
  kind: FactKind;
  value: string;
  allowed: string[];
};

const num = (raw: string) => Number(raw.replace(/\./g, "").replace(",", "."));

const round = (n: number) => Math.round(n * 100) / 100;

/** Minuten-tokens uit vrije tekst ("45 minuten", "1,5 uur", "2 tot 3 uur"). */
export const extractDurations = (text: string): number[] => {
  const out: number[] = [];
  const range =
    /(\d+(?:[.,]\d+)?)\s*(?:tot|t\/m|–|—|-)\s*(\d+(?:[.,]\d+)?)\s*(uur|minuten|min\b)/gi;
  const seen: [number, number][] = [];
  for (const m of text.matchAll(range)) {
    const factor = m[3].toLowerCase().startsWith("uur") ? 60 : 1;
    out.push(round(num(m[1]) * factor), round(num(m[2]) * factor));
    seen.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  }
  const single = /(\d+(?:[.,]\d+)?)\s*(uur|minuten|min\b)/gi;
  for (const m of text.matchAll(single)) {
    const start = m.index ?? 0;
    if (seen.some(([a, b]) => start >= a && start < b)) continue;
    const factor = m[2].toLowerCase().startsWith("uur") ? 60 : 1;
    out.push(round(num(m[1]) * factor));
  }
  return out;
};

/** Bedragen in euro's uit vrije tekst ("€32,50", "€425"). */
export const extractPrices = (text: string): number[] =>
  [...text.matchAll(/€\s?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/g)].map((m) => round(num(m[1])));

/** Aantallen personen ("vanaf 10 personen", "maximaal 40 deelnemers", "10 tot 40 personen"). */
export const extractGroupSizes = (text: string): number[] => {
  const out: number[] = [];
  const range = /(\d+)\s*(?:tot|t\/m|–|—|-)\s*(\d+)\s*(?:personen|deelnemers|pers)/gi;
  const seen: [number, number][] = [];
  for (const m of text.matchAll(range)) {
    out.push(Number(m[1]), Number(m[2]));
    seen.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  }
  const single = /(\d+)\s*(?:personen|deelnemers|pers\b)/gi;
  for (const m of text.matchAll(single)) {
    const start = m.index ?? 0;
    if (seen.some(([a, b]) => start >= a && start < b)) continue;
    out.push(Number(m[1]));
  }
  return out;
};

const EXTRACTORS: Record<FactKind, (t: string) => number[]> = {
  duur: extractDurations,
  prijs: extractPrices,
  groepsgrootte: extractGroupSizes,
};

const LABELS: Record<FactKind, (n: number) => string> = {
  duur: (n) => (n >= 60 ? `${round(n / 60)} uur` : `${n} minuten`),
  prijs: (n) => `€${n.toFixed(2).replace(".", ",")}`,
  groepsgrootte: (n) => `${n} personen`,
};

/**
 * Haalt de te controleren tekst uit een pagina-bronbestand:
 * de `const FAQ = [...]`-array en het `<KeyFacts ... />`-blok.
 */
export const extractPageFactText = (source: string): string => {
  const parts: string[] = [];

  const faqStart = source.indexOf("const FAQ");
  if (faqStart !== -1) {
    const open = source.indexOf("[", faqStart);
    if (open !== -1) parts.push(source.slice(open, matchBracket(source, open, "[", "]")));
  }

  let idx = source.indexOf("<KeyFacts");
  while (idx !== -1) {
    const end = source.indexOf("/>", idx);
    parts.push(source.slice(idx, end === -1 ? source.length : end));
    idx = source.indexOf("<KeyFacts", idx + 1);
  }

  return parts.join("\n");
};

const matchBracket = (s: string, from: number, open: string, close: string) => {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    if (s[i] === open) depth++;
    else if (s[i] === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return s.length;
};

/** Alle tekst uit een activityContent-entry waaruit feiten mogen komen. */
export const canonicalTextFor = (entry: {
  summary: string;
  practical: { label: string; value: string }[];
  goodToKnow?: string[];
  faq: { question: string; answer: string }[];
}): string =>
  [
    entry.summary,
    ...entry.practical.map((p) => `${p.label}: ${p.value}`),
    ...(entry.goodToKnow ?? []),
    ...entry.faq.flatMap((f) => [f.question, f.answer]),
  ].join("\n");

/**
 * Vergelijkt de feiten op een pagina met de canonieke content.
 * Elke waarde die de pagina noemt moet ook in activityContent staan.
 */
export const findFactViolations = (
  file: string,
  slug: string,
  pageSource: string,
  canonicalText: string,
): FactViolation[] => {
  const pageText = extractPageFactText(pageSource);
  const violations: FactViolation[] = [];

  (Object.keys(EXTRACTORS) as FactKind[]).forEach((kind) => {
    const allowed = new Set(EXTRACTORS[kind](canonicalText));
    const found = new Set(EXTRACTORS[kind](pageText));
    found.forEach((value) => {
      if (!allowed.has(value)) {
        violations.push({
          file,
          slug,
          kind,
          value: LABELS[kind](value),
          allowed: [...allowed].sort((a, b) => a - b).map(LABELS[kind]),
        });
      }
    });
  });

  return violations;
};

export const formatViolations = (violations: FactViolation[]): string =>
  violations
    .map(
      (v) =>
        `${v.file}: ${v.kind} "${v.value}" staat niet in activityContent["${v.slug}"]. ` +
        `Toegestaan: ${v.allowed.length ? v.allowed.join(", ") : "(geen enkele waarde van dit type)"}.`,
    )
    .join("\n");
