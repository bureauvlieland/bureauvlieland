// Overige IBAN's van een partner: vrije invoer (één per regel of gescheiden
// door komma's) naar een genormaliseerde lijst. Dependency-vrij voor vitest.

export function normalizeIban(iban: string): string {
  return iban.replace(/\s/g, "").toUpperCase();
}

/** Grove vormcontrole: landcode, twee controlecijfers, dan 11 tot 30 tekens. */
export function looksLikeIban(iban: string): boolean {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban);
}

/** Splitst invoer op regels en komma's, normaliseert en ontdubbelt. */
export function parseIbanList(input: string): string[] {
  const seen = new Set<string>();
  for (const part of input.split(/[\n,;]+/)) {
    const iban = normalizeIban(part);
    if (iban) seen.add(iban);
  }
  return Array.from(seen);
}

/** De ingevoerde IBAN's die niet op een IBAN lijken, voor een foutmelding. */
export function invalidIbans(ibans: string[]): string[] {
  return ibans.filter((iban) => !looksLikeIban(iban));
}
