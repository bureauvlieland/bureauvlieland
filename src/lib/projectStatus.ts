import { differenceInDays, startOfDay, endOfWeek, endOfMonth } from "date-fns";

export type DerivedStatus =
  | "concept"
  | "offerte_verstuurd"
  | "akkoord_ontvangen"
  | "av_getekend"
  | "facturatie"
  | "afgerond"
  | "geannuleerd";

export const DERIVED_STATUS_LABEL: Record<DerivedStatus, string> = {
  concept: "Concept",
  offerte_verstuurd: "Offerte verstuurd",
  akkoord_ontvangen: "Akkoord ontvangen",
  av_getekend: "AV getekend",
  facturatie: "Facturatie",
  afgerond: "Afgerond",
  geannuleerd: "Geannuleerd",
};

export const DERIVED_STATUS_TONE: Record<DerivedStatus, string> = {
  concept: "bg-slate-100 text-slate-700",
  offerte_verstuurd: "bg-blue-100 text-blue-800",
  akkoord_ontvangen: "bg-amber-100 text-amber-800",
  av_getekend: "bg-green-100 text-green-800",
  facturatie: "bg-purple-100 text-purple-800",
  afgerond: "bg-emerald-100 text-emerald-800",
  geannuleerd: "bg-red-100 text-red-800",
};

export interface DerivedStatusInput {
  program_status: string | null;
  accommodation_status: string | null;
  completion_status: string | null;
  terms_accepted_at: string | null;
  quote_status: string | null;
}

export function getDerivedStatus(p: DerivedStatusInput): DerivedStatus {
  if (p.program_status === "cancelled" || p.accommodation_status === "cancelled") return "geannuleerd";
  if (p.completion_status === "fully_invoiced") return "afgerond";
  if (p.completion_status === "ready_for_invoice" || p.completion_status === "partially_invoiced") return "facturatie";
  if (p.terms_accepted_at) return "av_getekend";
  if (p.quote_status === "akkoord_ontvangen" || p.quote_status === "definitief_bevestigd") return "akkoord_ontvangen";
  if (p.quote_status === "offerte_verstuurd") return "offerte_verstuurd";
  return "concept";
}

export type TimeBucket = "overdue" | "this_week" | "this_month" | "later" | "no_date";

export const TIME_BUCKET_LABEL: Record<TimeBucket, string> = {
  overdue: "Datum verstreken",
  this_week: "Deze week",
  this_month: "Deze maand",
  later: "Later",
  no_date: "Zonder datum",
};

export function getTimeBucket(date: Date | null): TimeBucket {
  if (!date) return "no_date";
  const now = new Date();
  const today = startOfDay(now);
  if (date.getTime() < today.getTime()) return "overdue";
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  if (date.getTime() <= weekEnd.getTime()) return "this_week";
  const monthEnd = endOfMonth(now);
  if (date.getTime() <= monthEnd.getTime()) return "this_month";
  return "later";
}

export function isPastDate(date: Date | null): boolean {
  if (!date) return false;
  return date.getTime() < startOfDay(new Date()).getTime();
}

export function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return differenceInDays(date, startOfDay(new Date()));
}
