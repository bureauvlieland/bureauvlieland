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
  r: Pick<ReferralLike, "status" | "invoice_status" | "referred_at" | "final_day_guests" | "is_multi_day" | "fee_amount" | "fee_calculated_amount" | "fee_override_note">,
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
    return {
      ok: true,
      patch: {
        status: "booked",
        fee_schedule_id: fee.schedule.id,
        fee_calculated_amount: fee.calculation.total,
        fee_amount: overridden ? r.fee_amount : fee.calculation.total,
        fee_override_note: overridden ? r.fee_override_note : "",
        invoice_status: r.invoice_status === "not_applicable" ? "to_invoice" : (r.invoice_status as InvoiceStatus),
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
  const kop = ["Partner", "Bruidspaar", "E-mail", "Telefoon", "Datum aanvraag", "Datum doorverwezen", "Verwachte trouwdatum", "Geschat aantal gasten", "Vervaldatum", "Notities"];
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
    anonymized_at: now.toISOString(),
  };
}

export const formatEuro = (n: number | null | undefined): string =>
  n === null || n === undefined ? "–" : n.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
