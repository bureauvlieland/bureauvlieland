/**
 * Geldigheid van een offerte — één centrale rekenregel.
 *
 * Standaard: de offerte is geldig tot één maand vóór aankomst (de eerste
 * programmadatum). Valt die datum te dicht op vandaag omdat de aanvraag laat
 * binnenkomt, dan doen we een haalbaar "korte termijn"-voorstel dat de admin
 * altijd kan overschrijven.
 *
 * Puur (geen I/O) zodat alle admin-schermen dezelfde datum voorstellen en de
 * regel volledig testbaar is.
 */

/** Standaard-voorsprong: één maand (30 dagen) vóór aankomst. */
export const QUOTE_VALIDITY_LEAD_DAYS = 30;

/** Onder deze marge beschouwen we het als een korte-termijn-aanvraag. */
export const SHORT_TERM_THRESHOLD_DAYS = 7;

/** Een korte-termijn-offerte staat minimaal dit aantal dagen open. */
export const MIN_SHORT_TERM_DAYS = 3;

/** Terugval als er nog geen programmadatum bekend is. */
export const FALLBACK_VALIDITY_DAYS = 14;

const DAY_MS = 86_400_000;

export type QuoteValidityMode = "standard" | "short_term" | "fallback";

export interface QuoteValiditySuggestion {
  /** Voorgestelde datum, altijd op middernacht lokale tijd. */
  date: Date;
  mode: QuoteValidityMode;
  /** Dagen tussen vandaag en aankomst; null als er geen aankomstdatum is. */
  daysUntilArrival: number | null;
  /** Dagen dat de offerte vanaf vandaag geldig is. */
  daysValid: number;
  /** Aankomstdatum op middernacht, of null. */
  arrival: Date | null;
}

/** Kapt een datum (of ISO-string) af naar middernacht lokale tijd. */
export function startOfDay(input: Date | string): Date {
  const d =
    typeof input === "string"
      ? new Date(`${input.slice(0, 10)}T00:00:00`)
      : new Date(input.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDaysLocal(date: Date, days: number): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function diffInDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

/** Eerste geldige programmadatum uit selected_dates (kan ongesorteerd zijn). */
export function firstProgramDate(dates: (string | Date)[] | null | undefined): Date | null {
  if (!dates || dates.length === 0) return null;
  const parsed = dates
    .map((d) => startOfDay(d as string))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  return parsed[0] ?? null;
}

/**
 * Berekent de voorgestelde geldigheidsdatum.
 *
 * - standard:   aankomst - 30 dagen, mits dat minstens 7 dagen weg is
 * - short_term: midden tussen vandaag en aankomst, min. vandaag+3, max. aankomst-1
 * - fallback:   vandaag + 14 dagen (geen aankomstdatum bekend)
 *
 * Het voorstel ligt nooit vóór morgen en nooit op/na de aankomstdatum.
 */
export function suggestQuoteValidUntil(input: {
  arrivalDate?: Date | string | null;
  today?: Date;
}): QuoteValiditySuggestion {
  const today = startOfDay(input.today ?? new Date());
  const tomorrow = addDaysLocal(today, 1);

  const arrival =
    input.arrivalDate == null ? null : startOfDay(input.arrivalDate as string | Date);

  if (!arrival || Number.isNaN(arrival.getTime())) {
    const date = addDaysLocal(today, FALLBACK_VALIDITY_DAYS);
    return {
      date,
      mode: "fallback",
      daysUntilArrival: null,
      daysValid: FALLBACK_VALIDITY_DAYS,
      arrival: null,
    };
  }

  const daysUntilArrival = diffInDays(today, arrival);

  // Aankomst is vandaag of al geweest: het beste dat we kunnen doen is morgen.
  if (daysUntilArrival <= 1) {
    return {
      date: tomorrow,
      mode: "short_term",
      daysUntilArrival,
      daysValid: 1,
      arrival,
    };
  }

  const standard = addDaysLocal(arrival, -QUOTE_VALIDITY_LEAD_DAYS);
  if (diffInDays(today, standard) >= SHORT_TERM_THRESHOLD_DAYS) {
    return {
      date: standard,
      mode: "standard",
      daysUntilArrival,
      daysValid: diffInDays(today, standard),
      arrival,
    };
  }

  // Korte termijn: halveren, maar binnen harde grenzen houden.
  const dayBeforeArrival = addDaysLocal(arrival, -1);
  const half = Math.floor(daysUntilArrival / 2);
  let candidate = addDaysLocal(today, Math.max(half, MIN_SHORT_TERM_DAYS));
  if (candidate > dayBeforeArrival) candidate = dayBeforeArrival;
  if (candidate < tomorrow) candidate = tomorrow;

  return {
    date: candidate,
    mode: "short_term",
    daysUntilArrival,
    daysValid: diffInDays(today, candidate),
    arrival,
  };
}

const NL_DATE = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long" });

/** Nederlandse toelichting onder de datumkiezer. */
export function describeQuoteValidity(s: QuoteValiditySuggestion): string {
  switch (s.mode) {
    case "standard":
      return `Standaard: één maand vóór aankomst (${NL_DATE.format(s.date)}).`;
    case "short_term":
      return `Aankomst is over ${s.daysUntilArrival} dag(en) — voorstel: ${s.daysValid} dag(en) geldig. Pas aan indien nodig.`;
    case "fallback":
      return `Nog geen programmadatum bekend — voorstel: ${FALLBACK_VALIDITY_DAYS} dagen geldig (${NL_DATE.format(s.date)}).`;
  }
}

/** Eén consistente verlopen-check: de offerte is geldig t/m de datum zelf. */
export function isQuoteExpired(
  validUntil: string | Date | null | undefined,
  today: Date = new Date(),
): boolean {
  if (!validUntil) return false;
  const end = startOfDay(validUntil as string | Date);
  if (Number.isNaN(end.getTime())) return false;
  return startOfDay(today).getTime() > end.getTime();
}

/**
 * Grenzen voor de datepicker: niet in het verleden, niet op/na de aankomst.
 */
export function isQuoteValidUntilDateDisabled(
  date: Date,
  opts: { arrivalDate?: Date | string | null; today?: Date } = {},
): boolean {
  const today = startOfDay(opts.today ?? new Date());
  const d = startOfDay(date);
  if (d <= today) return true;
  if (opts.arrivalDate) {
    const arrival = startOfDay(opts.arrivalDate as string | Date);
    if (!Number.isNaN(arrival.getTime()) && d >= arrival) {
      // Uitzondering: bij aankomst binnen 1 dag mag morgen wel.
      return d > addDaysLocal(today, 1);
    }
  }
  return false;
}
