/**
 * Boekingslogica voor de MAP-boekingen op de eigen site.
 * Bewust vrij van React zodat het los te testen is.
 * Validatiepatronen zijn identiek aan de edge function `map-book`.
 */

export const MAP_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
export const MAP_PHONE_RE = /^[+0-9][0-9\s\-()]{6,19}$/;

export interface BookingFormValues {
  name: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  couponCode?: string;
}

export type BookingFormErrors = Partial<Record<keyof BookingFormValues | "persons", string>>;

/** Indicatieprijs; MAP rekent altijd zelf het definitieve bedrag. */
export function estimateBookingPrice(
  pricePerPerson: number,
  pricePerChild: number | null,
  adults: number,
  children: number,
): number {
  const adultTotal = (Number.isFinite(adults) ? Math.max(0, adults) : 0) * (pricePerPerson || 0);
  const childRate = pricePerChild ?? pricePerPerson ?? 0;
  const childTotal = (Number.isFinite(children) ? Math.max(0, children) : 0) * childRate;
  return Math.round((adultTotal + childTotal) * 100) / 100;
}

export function formatEuro(amount: number): string {
  return `€ ${amount.toFixed(2).replace(".", ",")}`;
}

export function validateBookingForm(
  values: BookingFormValues,
  options: { slotsLeft?: number } = {},
): BookingFormErrors {
  const errors: BookingFormErrors = {};

  const name = values.name?.trim() ?? "";
  if (name.length < 2 || name.length > 120) {
    errors.name = "Vul een geldige naam in.";
  }
  if (!MAP_EMAIL_RE.test((values.email ?? "").trim())) {
    errors.email = "Vul een geldig e-mailadres in.";
  }
  if (!MAP_PHONE_RE.test((values.phone ?? "").trim())) {
    errors.phone = "Vul een geldig telefoonnummer in.";
  }

  const validCount = (n: number) => Number.isInteger(n) && n >= 0 && n <= 50;
  if (!validCount(values.adults) || !validCount(values.children)) {
    errors.persons = "Het aantal personen moet tussen 0 en 50 liggen.";
  } else {
    const total = values.adults + values.children;
    if (total < 1) {
      errors.persons = "Geef minimaal één deelnemer op.";
    } else if (
      typeof options.slotsLeft === "number" &&
      options.slotsLeft > 0 &&
      total > options.slotsLeft
    ) {
      errors.persons = `Er zijn nog ${options.slotsLeft} plekken beschikbaar.`;
    }
  }

  if (values.couponCode && values.couponCode.length > 60) {
    errors.couponCode = "Deze kortingscode is te lang.";
  }

  return errors;
}

export function hasBookingErrors(errors: BookingFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

const PENDING_KEY = "bv_map_booking_pending";

export interface PendingBooking {
  bookingId: number;
  paymentId: string | null;
  tenantSlug: string;
  activityName: string;
  departure: string;
}

/** Bewaart de gestarte boeking zodat de retourpagina de betaling kan uitvragen. */
export function storePendingBooking(entry: PendingBooking) {
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage kan geblokkeerd zijn; de retourpagina valt terug op de URL.
  }
}

export function readPendingBooking(bookingId?: number | null): PendingBooking | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingBooking;
    if (bookingId && parsed.bookingId !== bookingId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingBooking() {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // noop
  }
}

/** Retour-URL voor de betaalpagina; map-book voegt `b` en `t` toe. */
export function bookingReturnUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/boeking-status`;
}

/**
 * MAP levert de duur in minuten. Toon minuten onder het uur, daarboven uren
 * (met een half uur als "1,5 uur").
 */
export function formatMapDuration(minutes: number | null | undefined): string {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value < 60) return `${Math.round(value)} min`;
  const hours = value / 60;
  const label = Number.isInteger(hours)
    ? String(hours)
    : hours.toFixed(1).replace(".", ",");
  return `${label} uur`;
}
