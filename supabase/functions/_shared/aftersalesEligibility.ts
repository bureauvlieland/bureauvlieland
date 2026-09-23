// Wanneer krijgt een klant de nazorgmail (customer_aftersales_review)?
// Gebruikt door check-pending-items (automatisch) en de inhaallijst in
// admin (Content → Beoordelingen), zodat beide dezelfde regel hanteren.
//
// Voorheen moest ieder onderdeel door de partner op "uitgevoerd" staan.
// Bureau-onderdelen (boot, fiets, bagage) krijgen dat nooit en partners
// vergeten het vaak, dus de mail ging vrijwel nooit uit. Nu telt de laatste
// programmadatum.

/** Na zoveel dagen sturen we niet meer automatisch; dat gaat via de inhaallijst. */
export const AFTERSALES_AUTO_MAX_DAYS = 30;
/** Vanaf zoveel dagen na afloop krijgt de mail een andere openingszin. */
export const AFTERSALES_LATE_AFTER_DAYS = 30;

export interface AftersalesProgramLike {
  status?: string | null;
  cancelled_at?: string | null;
  selected_dates?: unknown;
  terms_accepted_at?: string | null;
  quote_status?: string | null;
  completion_status?: string | null;
  aftersales_sent_at?: string | null;
  customer_email?: string | null;
}

export interface AftersalesItemLike {
  status?: string | null;
  executed_at?: string | null;
  customer_accepted_at?: string | null;
  customer_approved_at?: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Laatste programmadatum als YYYY-MM-DD, of null. */
export function lastProgramDate(dates: unknown): string | null {
  if (!Array.isArray(dates)) return null;
  const valid = dates
    .map((d) => String(d).slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  return valid.length ? valid[valid.length - 1] : null;
}

/** Hele dagen tussen de laatste programmadatum en `today` (YYYY-MM-DD). */
export function daysSinceProgram(dates: unknown, today: string): number | null {
  const last = lastProgramDate(dates);
  if (!last) return null;
  return Math.round((Date.parse(today) - Date.parse(last)) / DAY_MS);
}

/** Is het programma echt geboekt (en niet alleen een aanvraag of offerte)? */
export function isBookedProgram(p: AftersalesProgramLike, items: AftersalesItemLike[] = []): boolean {
  if (p.terms_accepted_at) return true;
  if (p.quote_status === "akkoord_ontvangen" || p.quote_status === "definitief_bevestigd") return true;
  if (["ready_for_invoice", "partially_invoiced", "fully_invoiced"].includes(p.completion_status ?? "")) return true;
  return items.some(
    (i) => i.status !== "cancelled" && (!!i.executed_at || !!i.customer_accepted_at || !!i.customer_approved_at),
  );
}

/** Afgelopen, geboekt, niet geannuleerd, met e-mailadres en nog geen nazorgmail. */
export function isAftersalesCandidate(
  p: AftersalesProgramLike,
  items: AftersalesItemLike[],
  today: string,
): boolean {
  if (p.cancelled_at || p.status === "cancelled") return false;
  if (p.aftersales_sent_at) return false;
  if (!p.customer_email) return false;
  const days = daysSinceProgram(p.selected_dates, today);
  if (days === null || days < 1) return false;
  return isBookedProgram(p, items);
}

/** Moet de automatische run nu de nazorgmail sturen (of de taak aanmaken)? */
export function isAftersalesDue(
  p: AftersalesProgramLike,
  items: AftersalesItemLike[],
  today: string,
  daysAfter: number,
  maxDays: number = AFTERSALES_AUTO_MAX_DAYS,
): boolean {
  if (!isAftersalesCandidate(p, items, today)) return false;
  const days = daysSinceProgram(p.selected_dates, today)!;
  return days >= daysAfter && days <= maxDays;
}

/** Is het programma zo lang geleden dat de mail een andere openingszin krijgt? */
export function isLateAftersales(dates: unknown, today: string): boolean {
  const days = daysSinceProgram(dates, today);
  return days !== null && days > AFTERSALES_LATE_AFTER_DAYS;
}
