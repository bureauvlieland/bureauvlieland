// Pure logica van send-terms-request: mag dit project een ondertekenverzoek
// krijgen, en welke fase hoort erbij? Los van Deno.serve zodat het getest kan
// worden zonder database.
import type { TermsStage } from "../_shared/customerTermsReminder.ts";

export interface TermsRequestTarget {
  status?: string | null;
  cancelled_at?: string | null;
  terms_accepted_at?: string | null;
  signature_id?: string | null;
  customer_email?: string | null;
  customer_token?: string | null;
  quote_status?: string | null;
  selected_dates?: unknown;
}

export type TermsRequestGuard =
  | { ok: true; stage: TermsStage; daysUntil: number | null; firstDate: string | null }
  | { ok: false; reason: string };

/** Hele dagen tussen vandaag (YYYY-MM-DD) en de eerste programmadag. */
export function daysUntilFirstDate(selectedDates: unknown, todayStr: string): { firstDate: string | null; daysUntil: number | null } {
  const dates = Array.isArray(selectedDates)
    ? (selectedDates as unknown[]).map((d) => String(d).slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
    : [];
  if (dates.length === 0) return { firstDate: null, daysUntil: null };
  const firstDate = dates[0];
  const daysUntil = Math.round((Date.parse(firstDate) - Date.parse(todayStr)) / (1000 * 60 * 60 * 24));
  return { firstDate, daysUntil };
}

/**
 * Een handmatig verzoek mag ongeacht de offertefase: ook een telefonisch
 * gesloten project (quote_status "concept") moet getekend kunnen worden. Alleen
 * geannuleerde, verwijderde of al getekende projecten en projecten zonder
 * e-mailadres of portaal-token vallen af.
 */
export function guardTermsRequest(target: TermsRequestTarget, todayStr: string): TermsRequestGuard {
  if (target.status === "cancelled" || target.cancelled_at) return { ok: false, reason: "Dit project is geannuleerd." };
  if (target.status === "deleted") return { ok: false, reason: "Dit project is verwijderd." };
  if (target.terms_accepted_at || target.signature_id) return { ok: false, reason: "De voorwaarden zijn al ondertekend." };
  if (!target.customer_email) return { ok: false, reason: "Er is geen e-mailadres van de klant bekend." };
  if (!target.customer_token) return { ok: false, reason: "Dit project heeft geen portaal-link." };
  const stage: TermsStage = target.quote_status === "offerte_verstuurd" ? "offerte" : "akkoord";
  const { firstDate, daysUntil } = daysUntilFirstDate(target.selected_dates, todayStr);
  return { ok: true, stage, daysUntil, firstDate };
}
