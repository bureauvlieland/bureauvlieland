/**
 * Aantalwijziging bij een gekozen logiesofferte.
 *
 * Deno-kopie van src/lib/accommodationHeadcount.ts (dat bestand is de bron
 * van waarheid). Puur, geen I/O, zodat edge functions en interface dezelfde
 * regels gebruiken.
 *
 * De kern: `priced_for_guests` zegt voor hoeveel gasten `price_total` geldt.
 * Wijkt dat af van het aantal gasten van de aanvraag, dan moet de partner het
 * nieuwe aantal bevestigen (eventueel met een nieuw totaal). Zijn voorstel
 * staat in `headcount_proposal` tot het bureau het goedkeurt; pas dan
 * verandert de prijs op de offerte.
 */

export interface HeadcountProposal {
  /** Het nieuwe totaal, inclusief btw zoals de rest van de offerte. */
  price_total: number;
  /** Het aantal gasten dat de partner bevestigt. */
  guests: number;
  /** De prijs en het aantal waarvoor de offerte tot nu toe gold. */
  previous_price_total: number;
  previous_guests: number | null;
  /** Optioneel: nieuwe kamerindeling en toelichting van de partner. */
  room_configuration?: unknown[] | null;
  note?: string | null;
  proposed_at: string;
}

export interface HeadcountQuoteLike {
  status?: string | null;
  price_total?: number | string | null;
  price_per_person_per_night?: number | string | null;
  priced_for_guests?: number | null;
  headcount_proposal?: unknown;
  headcount_change_requested_at?: string | null;
}

const toNumber = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Aantal nachten tussen twee datums (yyyy-mm-dd), minimaal 1. */
export function nightsBetween(arrival: string | null | undefined, departure: string | null | undefined): number {
  if (!arrival || !departure) return 1;
  const a = Date.parse(`${arrival}T00:00:00Z`);
  const d = Date.parse(`${departure}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(d)) return 1;
  return Math.max(1, Math.round((d - a) / 86_400_000));
}

/**
 * Voor hoeveel gasten gold de prijs toen hij werd ingediend? Bij indienen is
 * price_per_person_per_night = price_total / gasten / nachten, dus dat is
 * exact terug te rekenen. Levert dat geen rond getal op, dan `fallback`.
 */
export function inferPricedForGuests(
  quote: Pick<HeadcountQuoteLike, "price_total" | "price_per_person_per_night">,
  nights: number,
  fallback: number | null,
): number | null {
  const total = toNumber(quote.price_total);
  const pppn = toNumber(quote.price_per_person_per_night);
  if (!total || !pppn || total <= 0 || pppn <= 0) return fallback;
  const raw = total / (pppn * Math.max(1, nights));
  const rounded = Math.round(raw);
  if (rounded < 1 || Math.abs(raw - rounded) >= 0.05) return fallback;
  return rounded;
}

/** Ligt er een voorstel van de partner dat op het bureau wacht? */
export function parseHeadcountProposal(raw: unknown): HeadcountProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const priceTotal = toNumber(p.price_total as number | string | null | undefined);
  const guests = toNumber(p.guests as number | string | null | undefined);
  if (priceTotal === null || guests === null) return null;
  return {
    price_total: priceTotal,
    guests,
    previous_price_total: toNumber(p.previous_price_total as number | string | null | undefined) ?? 0,
    previous_guests: toNumber(p.previous_guests as number | string | null | undefined),
    room_configuration: Array.isArray(p.room_configuration) ? (p.room_configuration as unknown[]) : null,
    note: typeof p.note === "string" && p.note.trim() ? p.note : null,
    proposed_at: typeof p.proposed_at === "string" ? p.proposed_at : "",
  };
}

export function hasPendingHeadcountProposal(quote: Pick<HeadcountQuoteLike, "headcount_proposal">): boolean {
  return parseHeadcountProposal(quote.headcount_proposal) !== null;
}

/**
 * Moet de partner het nieuwe aantal nog bevestigen? Alleen bij een gekozen
 * offerte waarvan de prijs voor een ander aantal gasten geldt dan de aanvraag
 * nu zegt, en zolang er geen voorstel ligt.
 */
export function needsHeadcountConfirmation(quote: HeadcountQuoteLike, requestGuests: number | null | undefined): boolean {
  if (quote.status !== "selected") return false;
  if (!requestGuests || requestGuests < 1) return false;
  if (quote.priced_for_guests === null || quote.priced_for_guests === undefined) return false;
  if (quote.priced_for_guests === requestGuests) return false;
  return !hasPendingHeadcountProposal(quote);
}

/** Dezelfde formule als bij indienen: totaal gedeeld door gasten en nachten. */
export function recalculatePricePerPersonPerNight(priceTotal: number, guests: number, nights: number): number | null {
  if (!Number.isFinite(priceTotal) || priceTotal <= 0 || !guests || guests < 1) return null;
  return priceTotal / guests / Math.max(1, nights);
}

/**
 * Dezelfde formule als select-accommodation-quote: commissie over het totaal
 * van kamers plus extra's, afgerond op centen.
 */
export function recalculateLodgingCommission(priceTotal: number, extrasTotal: number, percentage: number | null | undefined): number {
  const pct = percentage ?? 10;
  return Math.round((priceTotal + extrasTotal) * pct) / 100;
}

/** Korte omschrijving van de wijziging voor historie, taken en mails. */
export function describeHeadcountChange(oldGuests: number | null | undefined, newGuests: number): string {
  return oldGuests ? `van ${oldGuests} naar ${newGuests} gasten` : `naar ${newGuests} gasten`;
}
