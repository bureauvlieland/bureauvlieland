import { format, isValid, parseISO, startOfMonth, subMonths } from "date-fns";
import { nl } from "date-fns/locale";

/**
 * De trechter van het beoordelingsproces (docs/plan-reviews-oogsten.md,
 * fase 4, "Meetpunten"): verstuurd, ingevuld, gepubliceerd, Google-knop
 * geklikt, herinnerd en referentiepagina's online, voor de laatste periode
 * en in totaal. Plus het aantal Google-reviews per maand uit de cache.
 * Zonder Supabase, zodat het te testen is.
 */
export interface FunnelReview {
  created_at: string;
  status: string;
  source: string;
  google_clicked_at: string | null;
  reminder_sent_at: string | null;
}

export interface FunnelInput {
  reviews: FunnelReview[];
  /** Tijdstippen van verstuurde nazorgmails. */
  aftersalesSentAt: string[];
  /** Tijdstippen waarop referentiepagina's online gingen. */
  referencesPublishedAt: string[];
  now: Date;
  /** Lengte van de recente periode in dagen; standaard 90. */
  days?: number;
}

export interface FunnelRow {
  key: "verstuurd" | "ingevuld" | "gepubliceerd" | "google" | "herinnerd" | "referenties";
  label: string;
  recent: number;
  total: number;
}

const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
};

const count = (moments: Array<string | null | undefined>, since: Date | null): number =>
  moments.reduce((n, iso) => {
    const d = parse(iso);
    if (!d) return n;
    return since === null || d >= since ? n + 1 : n;
  }, 0);

export const buildFunnel = (input: FunnelInput): FunnelRow[] => {
  const days = input.days ?? 90;
  const since = new Date(input.now.getTime() - days * 86_400_000);
  const eigen = input.reviews.filter((r) => r.source === "portal");
  const rows: Array<{ key: FunnelRow["key"]; label: string; moments: Array<string | null> }> = [
    { key: "verstuurd", label: "Nazorgmail verstuurd", moments: input.aftersalesSentAt },
    { key: "ingevuld", label: "Beoordeling ingevuld", moments: eigen.map((r) => r.created_at) },
    { key: "gepubliceerd", label: "Op de site gepubliceerd", moments: eigen.filter((r) => r.status === "published").map((r) => r.created_at) },
    { key: "google", label: "Google-knop geklikt", moments: eigen.map((r) => r.google_clicked_at) },
    { key: "herinnerd", label: "Google-herinnering verstuurd", moments: eigen.map((r) => r.reminder_sent_at) },
    { key: "referenties", label: "Referentiepagina's online", moments: input.referencesPublishedAt },
  ];
  return rows.map((r) => ({ key: r.key, label: r.label, recent: count(r.moments, since), total: count(r.moments, null) }));
};

/** Percentage ingevuld ten opzichte van verstuurd; null zonder verstuurde mails. */
export const responsePercentage = (rows: FunnelRow[], field: "recent" | "total"): number | null => {
  const verstuurd = rows.find((r) => r.key === "verstuurd")?.[field] ?? 0;
  const ingevuld = rows.find((r) => r.key === "ingevuld")?.[field] ?? 0;
  return verstuurd > 0 ? Math.round((ingevuld / verstuurd) * 100) : null;
};

export interface MonthCount {
  /** "2026-09" */
  month: string;
  /** "september 2026" */
  label: string;
  count: number;
}

/** Google-reviews per maand uit de cache, de laatste `months` maanden (oudste eerst, lege maanden op nul). */
export const googleReviewsPerMonth = (reviews: Array<{ publish_time?: string | null }>, now: Date, months = 6): MonthCount[] => {
  const out: MonthCount[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i));
    out.push({ month: format(start, "yyyy-MM"), label: format(start, "MMMM yyyy", { locale: nl }), count: 0 });
  }
  const index = new Map(out.map((m) => [m.month, m]));
  for (const r of reviews) {
    const d = parse(r.publish_time);
    if (!d) continue;
    const m = index.get(format(d, "yyyy-MM"));
    if (m) m.count += 1;
  }
  return out;
};
