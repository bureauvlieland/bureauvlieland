/**
 * Datumlogica voor bruiloftsdoorverwijzingen (docs/plan-bruiloftsdoorverwijzingen.md).
 *
 * De partner heeft na de doorverwijsmail vijf werkdagen om te melden dat het
 * bruidspaar al bij hem bekend was. Deze module is de enige plek waar die
 * termijn wordt uitgerekend: de edge functions (mail met "al bekend"-link, de
 * pagina achter die link) en de admin (src/lib/weddingReferrals.ts) gebruiken
 * hem allemaal, zodat ze nooit uit elkaar lopen. Geen afhankelijkheden, zodat
 * hij zowel in Deno als in de browser draait.
 */

/** Werkdagen (ma t/m vr) die de partner heeft om "al bekend" te melden. Feestdagen tellen niet mee. */
export const PARTNER_RESPONSE_WORKING_DAYS = 5;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Is dit een echte kalenderdatum (yyyy-MM-dd)? "2026-02-30" is dat niet. */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** `n` werkdagen (ma t/m vr) na een datum; het weekend telt niet mee. */
export function addWorkingDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  let left = n;
  while (left > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const dag = date.getUTCDay();
    if (dag !== 0 && dag !== 6) left -= 1;
  }
  return date.toISOString().slice(0, 10);
}

/** De datum (yyyy-MM-dd) van dit moment in Nederland, niet in UTC. */
export function amsterdamDate(now: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Laatste dag waarop de partner "al bekend" kan melden: vijf werkdagen na de doorverwijsmail. */
export function claimDeadline(referredAt: string): string {
  return addWorkingDays(referredAt, PARTNER_RESPONSE_WORKING_DAYS);
}

/** De melding kan tot en met de laatste dag (Nederlandse tijd). */
export function isClaimWindowOpen(referredAt: string, today: string): boolean {
  return today <= claimDeadline(referredAt);
}

/** "12 juni 2027". */
export function formatIsoDateNL(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-NL", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "12 juni 2027", of "juni 2027" als alleen de maand bekend is. */
export function formatWeddingDateNL(iso: string, precision: "day" | "month"): string {
  if (precision === "day") return formatIsoDateNL(iso);
  const [y, m] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-NL", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, 1)));
}
