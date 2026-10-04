/**
 * Regels rond doorverwezen bruiloftsaanvragen
 * (docs/plan-bruiloftsdoorverwijzingen.md, fase 1).
 *
 * Pure functies: statusovergangen, vervallen, seizoen, samenvatting per
 * partner per seizoen, controlelijst met CSV en anonimiseren. De pagina en
 * het formulier roepen deze aan; de database bewaakt dezelfde regels als
 * vangnet (checks en de dagelijkse expire-functie).
 */
import { addMonths, addYears, endOfMonth, format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { calculateReferralFee, pickFeeSchedule, type FeeCalculation, type FeeScheduleLike } from "@/lib/weddingReferralFee";
import { addWorkingDays, claimDeadline, PARTNER_RESPONSE_WORKING_DAYS } from "../../supabase/functions/_shared/weddingReferralDates";

// De termijn voor "al bekend" wordt op één plek uitgerekend (de edge functions gebruiken dezelfde module).
export { addWorkingDays, PARTNER_RESPONSE_WORKING_DAYS };

export type ReferralStatus = "referred" | "booked" | "not_proceeded" | "expired";
export type InvoiceStatus = "not_applicable" | "to_invoice" | "invoiced" | "paid";

export const REFERRAL_STATUSES: ReferralStatus[] = ["referred", "booked", "not_proceeded", "expired"];
export const INVOICE_STATUSES: InvoiceStatus[] = ["not_applicable", "to_invoice", "invoiced", "paid"];

export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  referred: "Doorverwezen",
  booked: "Geboekt",
  not_proceeded: "Niet doorgegaan",
  expired: "Vervallen",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  not_applicable: "N.v.t.",
  to_invoice: "Te factureren",
  invoiced: "Gefactureerd",
  paid: "Betaald",
};

/** Melding van de partner over het bruidspaar: geen, of "was al bij ons bekend". */
export type PartnerClaim = "none" | "already_known";
export const PARTNER_CLAIMS: PartnerClaim[] = ["none", "already_known"];
export const PARTNER_CLAIM_LABEL: Record<PartnerClaim, string> = {
  none: "Geen melding",
  already_known: "Al bekend bij partner",
};

/**
 * Aanhef voor de mail aan het bruidspaar: de voornamen, niet de volledige namen.
 * "Anna & Bram de Vries" wordt "Anna en Bram", "Ilona Norbart" wordt "Ilona".
 */
export function couplePrenames(coupleNames: string): string {
  const voornamen = coupleNames
    .split(/\s*(?:&|\+|,|\ben\b)\s*/i)
    .map((deel) => deel.trim().split(/\s+/)[0])
    .filter(Boolean);
  if (voornamen.length <= 1) return voornamen[0] ?? "";
  return `${voornamen.slice(0, -1).join(", ")} en ${voornamen[voornamen.length - 1]}`;
}

/** Zonder boeking vervalt een doorverwijzing 18 maanden na de datum doorverwezen. */
export const REFERRAL_EXPIRY_MONTHS = 18;
/** Persoonsgegevens komen 2 jaar na afronding in aanmerking voor anonimisering. */
export const ANONYMIZE_AFTER_YEARS = 2;
export const ANONYMIZED_NAME = "Geanonimiseerd";

/** De velden van een doorverwijzing waar deze regels op rekenen (subset van de tabelrij). */
export interface ReferralLike {
  id: string;
  partner_id: string;
  couple_names: string;
  couple_email: string | null;
  couple_phone: string | null;
  requested_at: string;
  referred_at: string;
  expires_at: string;
  expected_wedding_date: string | null;
  expected_wedding_precision: string;
  estimated_guests: number | null;
  notes: string;
  status: string;
  status_changed_at: string;
  final_wedding_date: string | null;
  final_day_guests: number | null;
  is_multi_day: boolean;
  fee_schedule_id: string | null;
  fee_calculated_amount: number | null;
  fee_amount: number | null;
  fee_override_note: string;
  invoice_status: string;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_paid_at: string | null;
  anonymized_at: string | null;
  prior_contact_note: string;
  partner_claim: string;
  partner_claim_reported_at: string | null;
  partner_claim_first_contact_at: string | null;
  partner_claim_note: string;
  /** Tijdstip van de melding via de link in de partnermail; leeg bij een handmatige invoer. */
  partner_claim_submitted_at: string | null;
  /** "link" = door de partner via de mail, "admin" = handmatig vastgelegd. */
  partner_claim_source: string | null;
}

const ISO = "yyyy-MM-dd";
export const toIsoDate = (d: Date) => format(d, ISO);

/** Vervaldatum: 18 maanden na de datum doorverwezen. */
export function expiryDateFor(referredAt: string): string {
  return toIsoDate(addMonths(parseISO(referredAt), REFERRAL_EXPIRY_MONTHS));
}

/** Alleen "doorverwezen" vervalt, en pas als de vervaldatum voorbij is. */
export function shouldExpire(r: Pick<ReferralLike, "status" | "expires_at">, today: string): boolean {
  return r.status === "referred" && r.expires_at < today;
}

/** De ids die vandaag op "vervallen" horen te staan. */
export function referralsToExpire<T extends Pick<ReferralLike, "id" | "status" | "expires_at">>(rows: T[], today: string): string[] {
  return rows.filter((r) => shouldExpire(r, today)).map((r) => r.id);
}

/**
 * De trouwdatum waar we op sturen: de definitieve als die er is, anders de
 * verwachte. Bij alleen maand/jaar telt de laatste dag van die maand, zodat
 * de datum pas "verstreken" is als de hele maand voorbij is.
 */
export function effectiveWeddingDate(
  r: Pick<ReferralLike, "final_wedding_date" | "expected_wedding_date" | "expected_wedding_precision">,
): string | null {
  if (r.final_wedding_date) return r.final_wedding_date;
  if (!r.expected_wedding_date) return null;
  if (r.expected_wedding_precision === "month") return toIsoDate(endOfMonth(parseISO(r.expected_wedding_date)));
  return r.expected_wedding_date;
}

export function weddingDateHasPassed(
  r: Pick<ReferralLike, "final_wedding_date" | "expected_wedding_date" | "expected_wedding_precision">,
  today: string,
): boolean {
  const d = effectiveWeddingDate(r);
  return d !== null && d < today;
}

/** Seizoen = jaar van de (verwachte) trouwdatum; zonder trouwdatum het jaar van doorverwijzen. */
export function seasonOf(
  r: Pick<ReferralLike, "final_wedding_date" | "expected_wedding_date" | "expected_wedding_precision" | "referred_at">,
): number {
  const d = effectiveWeddingDate(r) ?? r.referred_at;
  return Number(d.slice(0, 4));
}

/** "12 jun 2027", "juni 2027" (alleen maand bekend) of "–". */
export function formatWeddingDate(
  r: Pick<ReferralLike, "final_wedding_date" | "expected_wedding_date" | "expected_wedding_precision">,
): string {
  if (r.final_wedding_date) return format(parseISO(r.final_wedding_date), "d MMM yyyy", { locale: nl });
  if (!r.expected_wedding_date) return "–";
  if (r.expected_wedding_precision === "month") return format(parseISO(r.expected_wedding_date), "MMMM yyyy", { locale: nl });
  return format(parseISO(r.expected_wedding_date), "d MMM yyyy", { locale: nl });
}

export type PartnerConfirmation = "already_known" | "awaiting" | "confirmed_new";
export const PARTNER_CONFIRMATION_LABEL: Record<PartnerConfirmation, string> = {
  already_known: "Al bekend bij partner",
  awaiting: "Wacht op partner",
  confirmed_new: "Bevestigd nieuw",
};

/**
 * Wie het eerst aantoonbaar contact had, heeft de klant. De partner staat in
 * cc en meldt binnen vijf werkdagen als het bruidspaar al bekend was. Blijft
 * die melding uit, dan is de doorverwijzing "bevestigd nieuw".
 */
export function partnerConfirmation(
  r: Pick<ReferralLike, "partner_claim" | "referred_at">,
  today: string,
): { state: PartnerConfirmation; deadline: string } {
  const deadline = claimDeadline(r.referred_at);
  if (r.partner_claim === "already_known") return { state: "already_known", deadline };
  return { state: today <= deadline ? "awaiting" : "confirmed_new", deadline };
}

/** De reden die bij een boeking zonder vergoeding wordt vastgelegd. */
export function alreadyKnownFeeNote(r: Pick<ReferralLike, "partner_claim_first_contact_at" | "partner_claim_reported_at">): string {
  const sinds = r.partner_claim_first_contact_at ? `, eerste contact ${format(parseISO(r.partner_claim_first_contact_at), "d MMM yyyy", { locale: nl })}` : "";
  const gemeld = r.partner_claim_reported_at ? ` (gemeld ${format(parseISO(r.partner_claim_reported_at), "d MMM yyyy", { locale: nl })})` : "";
  return `Al bekend bij partner${sinds}${gemeld}: geen vergoeding`;
}

export type FeeResult = { ok: true; schedule: FeeScheduleLike; calculation: FeeCalculation } | { ok: false; error: string };

/**
 * De vergoeding volgens de staffel die gold op de datum doorverwezen, voor
 * het definitieve aantal daggasten en meerdaags ja/nee. Met `lockedScheduleId`
 * (de staffel die bij "geboekt" is vastgelegd) blijft die staffel gelden.
 */
export function computeReferralFee(
  r: Pick<ReferralLike, "referred_at" | "final_day_guests" | "is_multi_day">,
  schedules: FeeScheduleLike[],
  lockedScheduleId?: string | null,
): FeeResult {
  // Een al vastgelegde boeking blijft aan haar eigen staffel hangen.
  const schedule = (lockedScheduleId && schedules.find((s) => s.id === lockedScheduleId)) || pickFeeSchedule(schedules, r.referred_at);
  if (!schedule) {
    return { ok: false, error: `Er is geen staffel met een ingangsdatum op of vóór ${format(parseISO(r.referred_at), "d MMM yyyy", { locale: nl })}.` };
  }
  if (r.final_day_guests === null || r.final_day_guests === undefined) {
    return { ok: false, error: "Vul het definitieve aantal daggasten in." };
  }
  const calculation = calculateReferralFee({ dayGuests: r.final_day_guests, multiDay: r.is_multi_day }, schedule);
  if (!calculation) return { ok: false, error: "De staffel heeft geen trede voor dit aantal gasten." };
  return { ok: true, schedule, calculation };
}

/** Handmatig overschrijven mag, maar alleen met een opmerking. */
export function validateFeeOverride(feeAmount: number | null, calculated: number | null, note: string): string | null {
  if (feeAmount === null || calculated === null) return null;
  if (Math.abs(feeAmount - calculated) < 0.005) return null;
  return note.trim() ? null : "Geef een opmerking bij een afwijkende vergoeding.";
}

/**
 * Factuurstatus bij een boeking: "te factureren" zodra er een vergoeding is,
 * "n.v.t." bij een vergoeding van nul (bijvoorbeeld een bruidspaar dat al bij
 * de partner bekend was). Wat al gefactureerd of betaald is, blijft zo.
 */
export function nextInvoiceStatus(current: InvoiceStatus, feeAmount: number): InvoiceStatus {
  if (current === "invoiced" || current === "paid") return current;
  return feeAmount > 0 ? "to_invoice" : "not_applicable";
}

export interface ReferralPatch {
  status?: ReferralStatus;
  fee_schedule_id?: string | null;
  fee_calculated_amount?: number | null;
  fee_amount?: number | null;
  fee_override_note?: string;
  invoice_status?: InvoiceStatus;
}

export type StatusChangeResult = { ok: true; patch: ReferralPatch } | { ok: false; error: string };

/**
 * Statusovergang met de bijbehorende gevolgen:
 * - naar "geboekt": vergoeding uit de staffel vastleggen en factuurstatus
 *   "te factureren" (tenzij al verder);
 * - weg van "geboekt": kan niet meer als er al gefactureerd is; anders
 *   vergoeding en factuurstatus leegmaken.
 */
export function applyStatusChange(
  r: Pick<
    ReferralLike,
    | "status"
    | "invoice_status"
    | "referred_at"
    | "final_day_guests"
    | "is_multi_day"
    | "fee_amount"
    | "fee_calculated_amount"
    | "fee_override_note"
    | "partner_claim"
    | "partner_claim_first_contact_at"
    | "partner_claim_reported_at"
  >,
  next: ReferralStatus,
  schedules: FeeScheduleLike[],
): StatusChangeResult {
  if (next === r.status) return { ok: true, patch: {} };

  if (r.status === "booked" && (r.invoice_status === "invoiced" || r.invoice_status === "paid")) {
    return { ok: false, error: "Deze boeking is al gefactureerd. Zet eerst de factuurstatus terug voordat je de status wijzigt." };
  }

  if (next === "booked") {
    const fee = computeReferralFee(r, schedules);
    if (fee.ok === false) return { ok: false, error: fee.error };
    const overridden = r.fee_amount !== null && r.fee_override_note.trim() !== "";
    // Al bekend bij de partner: de boeking telt, maar de vergoeding is nul.
    const alreadyKnown = r.partner_claim === "already_known";
    return {
      ok: true,
      patch: {
        status: "booked",
        fee_schedule_id: fee.schedule.id,
        fee_calculated_amount: fee.calculation.total,
        fee_amount: overridden ? r.fee_amount : alreadyKnown ? 0 : fee.calculation.total,
        fee_override_note: overridden ? r.fee_override_note : alreadyKnown ? alreadyKnownFeeNote(r) : "",
        invoice_status: nextInvoiceStatus(r.invoice_status as InvoiceStatus, overridden ? (r.fee_amount ?? 0) : alreadyKnown ? 0 : fee.calculation.total),
      },
    };
  }

  return {
    ok: true,
    patch: {
      status: next,
      fee_schedule_id: null,
      fee_calculated_amount: null,
      fee_amount: null,
      fee_override_note: "",
      invoice_status: "not_applicable",
    },
  };
}

export interface SeasonSummaryRow {
  partnerId: string;
  partnerName: string;
  season: number;
  referred: number;
  booked: number;
  notProceeded: number;
  expired: number;
  toInvoice: number;
  invoiced: number;
  paid: number;
}

/** Aantallen en bedragen (excl. btw) per partner per seizoen, nieuwste seizoen eerst. */
export function summarizeBySeason(rows: ReferralLike[], partnerNames: Record<string, string>): SeasonSummaryRow[] {
  const map = new Map<string, SeasonSummaryRow>();
  for (const r of rows) {
    const season = seasonOf(r);
    const key = `${r.partner_id}|${season}`;
    let row = map.get(key);
    if (!row) {
      row = {
        partnerId: r.partner_id,
        partnerName: partnerNames[r.partner_id] ?? r.partner_id,
        season,
        referred: 0,
        booked: 0,
        notProceeded: 0,
        expired: 0,
        toInvoice: 0,
        invoiced: 0,
        paid: 0,
      };
      map.set(key, row);
    }
    if (r.status === "referred") row.referred += 1;
    else if (r.status === "booked") row.booked += 1;
    else if (r.status === "not_proceeded") row.notProceeded += 1;
    else if (r.status === "expired") row.expired += 1;
    if (r.status === "booked" && r.fee_amount !== null) {
      if (r.invoice_status === "to_invoice") row.toInvoice += r.fee_amount;
      else if (r.invoice_status === "invoiced") row.invoiced += r.fee_amount;
      else if (r.invoice_status === "paid") row.paid += r.fee_amount;
    }
  }
  return [...map.values()].sort((a, b) => b.season - a.season || a.partnerName.localeCompare(b.partnerName, "nl"));
}

/**
 * Controlelijst: nog "doorverwezen" terwijl de (verwachte) trouwdatum al
 * voorbij is. Na het seizoen ter bevestiging naar de partner.
 */
export function buildControlList<T extends ReferralLike>(rows: T[], today: string, partnerId?: string): T[] {
  return rows
    .filter((r) => r.status === "referred" && (!partnerId || r.partner_id === partnerId) && weddingDateHasPassed(r, today))
    .sort((a, b) => a.partner_id.localeCompare(b.partner_id) || (effectiveWeddingDate(a) ?? "").localeCompare(effectiveWeddingDate(b) ?? ""));
}

const csvCel = (v: string | number | null | undefined): string => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV (puntkomma, opent in Excel) van de controlelijst voor één partner. */
export function controlListCsv(rows: ReferralLike[], partnerName: string): string {
  const kop = ["Partner", "Bruidspaar", "E-mail", "Telefoon", "Datum aanvraag", "Datum doorverwezen", "Verwachte trouwdatum", "Geschat aantal gasten", "Vervaldatum", "Melding partner", "Notities"];
  const regels = rows.map((r) =>
    [
      partnerName,
      r.couple_names,
      r.couple_email,
      r.couple_phone,
      r.requested_at,
      r.referred_at,
      formatWeddingDate(r),
      r.estimated_guests,
      r.expires_at,
      PARTNER_CLAIM_LABEL[r.partner_claim as PartnerClaim] ?? r.partner_claim,
      r.notes,
    ]
      .map(csvCel)
      .join(";"),
  );
  return [kop.map(csvCel).join(";"), ...regels].join("\n");
}

/** Afgerond: niet doorgegaan, vervallen, of geboekt én betaald. */
export function isClosed(r: Pick<ReferralLike, "status" | "invoice_status">): boolean {
  if (r.status === "not_proceeded" || r.status === "expired") return true;
  return r.status === "booked" && r.invoice_status === "paid";
}

/**
 * Twee jaar na afronding (betaald, of niet doorgegaan/vervallen) komen de
 * persoonsgegevens in aanmerking voor anonimisering.
 */
export function isDueForAnonymization(
  r: Pick<ReferralLike, "status" | "invoice_status" | "invoice_paid_at" | "status_changed_at" | "anonymized_at">,
  today: string,
): boolean {
  if (r.anonymized_at || !isClosed(r)) return false;
  const basis = r.status === "booked" ? (r.invoice_paid_at ?? r.status_changed_at) : r.status_changed_at;
  if (!basis) return false;
  return toIsoDate(addYears(parseISO(basis.slice(0, 10)), ANONYMIZE_AFTER_YEARS)) <= today;
}

/** Wat er overblijft na anonimiseren: partner, data, aantallen en bedragen blijven staan. */
export function anonymizePatch(now: Date) {
  return {
    couple_names: ANONYMIZED_NAME,
    couple_email: null,
    couple_phone: null,
    notes: "",
    prior_contact_note: "",
    partner_claim_note: "",
    anonymized_at: now.toISOString(),
  };
}

export const formatEuro = (n: number | null | undefined): string =>
  n === null || n === undefined ? "–" : n.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
