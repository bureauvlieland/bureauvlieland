/**
 * De nulmeting van het klantreisplan als vaste weergave (fase 5): per
 * herkomst aanvragen, geannuleerd, gewonnen, getekend en omzet, plus hoe
 * vaak er vóór de eerste programmadag getekend is. Puur, zodat de tabel in
 * de admin en de query in het plan hetzelfde tellen.
 */

export interface RequestMetricRow {
  origin: string | null;
  status: string | null;
  cancelled_at?: string | null;
  quote_status?: string | null;
  completed_at?: string | null;
  invoice_spec_total_incl_vat?: number | null;
  terms_accepted_at?: string | null;
  number_of_people?: number | null;
  selected_dates?: unknown;
  attribution?: Record<string, unknown> | null;
}

export const ORIGIN_LABELS: Record<string, string> = {
  self_service: "Zelfbediening (programma-bouwer)",
  maatwerk_zakelijk: "Aanvraagformulier, zakelijk",
  maatwerk_prive: "Aanvraagformulier, privé",
  quote: "Offerte (admin of oud formulier)",
  sales_inbox: "Sales-inbox en chat",
  catering_only: "Alleen catering",
};

export function originLabel(origin: string | null): string {
  if (!origin) return "(onbekend)";
  return ORIGIN_LABELS[origin] ?? origin;
}

export const isCancelled = (r: RequestMetricRow): boolean => r.status === "cancelled" || !!r.cancelled_at;

/** Gewonnen: actief en uitgevoerd, gefactureerd of akkoord ontvangen. Dezelfde definitie als in het plan. */
export const isWon = (r: RequestMetricRow): boolean =>
  r.status === "active" &&
  (!!r.completed_at ||
    (r.invoice_spec_total_incl_vat ?? 0) > 0 ||
    r.quote_status === "akkoord_ontvangen" ||
    r.quote_status === "definitief_bevestigd");

export const isSigned = (r: RequestMetricRow): boolean => !!r.terms_accepted_at;

export function firstDay(selectedDates: unknown): string | null {
  if (!Array.isArray(selectedDates)) return null;
  const days = (selectedDates as unknown[])
    .map((d) => String(d).slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  return days[0] ?? null;
}

/** Getekend vóór de eerste programmadag (de dag zelf telt mee als "vooraf"). */
export function isSignedBeforeFirstDay(r: RequestMetricRow): boolean {
  if (!r.terms_accepted_at) return false;
  const first = firstDay(r.selected_dates);
  if (!first) return false;
  return r.terms_accepted_at.slice(0, 10) <= first;
}

export function median(values: number[]): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export interface OriginMetrics {
  origin: string;
  label: string;
  requests: number;
  cancelled: number;
  won: number;
  signed: number;
  signedBeforeEvent: number;
  /** Omzet van actieve projecten, incl. btw, afgerond op hele euro's. */
  revenue: number;
  medianPeople: number | null;
}

export function metricsByOrigin(rows: RequestMetricRow[]): OriginMetrics[] {
  const groups = new Map<string, RequestMetricRow[]>();
  for (const r of rows) {
    if (r.status === "deleted") continue;
    const key = r.origin ?? "(onbekend)";
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([origin, list]) => ({
      origin,
      label: originLabel(origin === "(onbekend)" ? null : origin),
      requests: list.length,
      cancelled: list.filter(isCancelled).length,
      won: list.filter(isWon).length,
      signed: list.filter(isSigned).length,
      signedBeforeEvent: list.filter((r) => isWon(r) && isSignedBeforeFirstDay(r)).length,
      revenue: Math.round(
        list.filter((r) => r.status === "active").reduce((s, r) => s + (r.invoice_spec_total_incl_vat ?? 0), 0),
      ),
      medianPeople: median(list.map((r) => r.number_of_people ?? NaN)),
    }))
    .sort((a, b) => b.requests - a.requests);
}

export interface SigningSummary {
  won: number;
  signedBeforeEvent: number;
  signedAfterEvent: number;
  unsigned: number;
}

/** Van de gewonnen projecten: vóór de eerste dag getekend, erna, of nog niet. */
export function signingSummary(rows: RequestMetricRow[]): SigningSummary {
  const won = rows.filter((r) => r.status !== "deleted" && isWon(r));
  const before = won.filter(isSignedBeforeFirstDay).length;
  const signed = won.filter(isSigned).length;
  return { won: won.length, signedBeforeEvent: before, signedAfterEvent: signed - before, unsigned: won.length - signed };
}

/** Via welke weg het formulier geopend is (`attribution.form_source`, sinds fase 5). */
export function countByFormSource(rows: RequestMetricRow[]): [string, number][] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.status === "deleted") continue;
    const v = r.attribution?.form_source;
    if (typeof v !== "string" || !v) continue;
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Via welke weg het aanvraagformulier geopend werd, voor GA4 en `attribution`.
 * Volgorde: een voorbeeld of een vinkje in de URL zegt het meest; anders de
 * instappagina van het bezoek.
 */
export function formSourceFor(input: {
  templateSlug?: string | null;
  needsParam?: string | null;
  eventTypeParam?: string | null;
  entryPath?: string | null;
}): string {
  if (input.templateSlug) return "voorbeeldprogramma";
  if (input.needsParam) return `vinkje:${input.needsParam.split(",")[0].trim().toLowerCase()}`;
  if (input.eventTypeParam) return "soort";
  const path = (input.entryPath ?? "").split("?")[0];
  if (!path || path === "direct") return "direct";
  if (path === "/") return "homepage";
  if (path === "/programma-op-maat" || path === "/aanvraag") return "formulier-direct";
  if (path.startsWith("/voorbeeldprogrammas")) return "voorbeeldprogramma";
  if (/-vlieland(-2)?$/.test(path) || path.startsWith("/bedrijfsuitje")) return `landingspagina:${path.replace(/^\//, "")}`;
  return `overig:${path.replace(/^\//, "")}`;
}
