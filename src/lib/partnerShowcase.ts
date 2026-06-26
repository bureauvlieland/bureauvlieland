/**
 * Hardcoded best-practice partners die we tonen als "Zo doen anderen het"
 * in de partnerportal. Match op naam (case-insensitive, partial) via
 * `partners_public`. Geen DB-vlag — bewust simpel.
 */

export const SHOWCASE_PARTNER_NAME_PATTERNS: string[] = [
  "zeezicht",
  "yoga vlieland",
];

export const matchesShowcase = (name: string | null | undefined): boolean => {
  if (!name) return false;
  const lower = name.toLowerCase();
  return SHOWCASE_PARTNER_NAME_PATTERNS.some((p) => lower.includes(p));
};
