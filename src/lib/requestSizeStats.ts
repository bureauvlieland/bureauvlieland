import { isValid, parseISO, startOfYear } from "date-fns";

/**
 * Aanvragen per groepsgrootte (docs/plan-grote-groepen.md, "eerst een
 * seizoen draaien"): per klasse hoeveel aanvragen er kwamen, hoeveel er
 * lopen, getekend en geannuleerd zijn, hoe vaak logies erbij zat, hoe vaak
 * het meerdaags was, en via welke instappagina's ze binnenkwamen. Zonder
 * Supabase, zodat het te testen is.
 */
export interface SizeStatsRequest {
  number_of_people: number | null;
  status: string;
  created_at: string;
  selected_dates: unknown;
  attribution: unknown;
  linked_accommodation_id: string | null;
  terms_accepted_at: string | null;
}

export type SizeBucket = "onder_20" | "20_49" | "50_99" | "100_plus";
export type StatsPeriod = "dit_jaar" | "90_dagen" | "alles";

export const SIZE_BUCKETS: Array<{ key: SizeBucket; label: string }> = [
  { key: "onder_20", label: "Onder de 20" },
  { key: "20_49", label: "20 tot 49" },
  { key: "50_99", label: "50 tot 99" },
  { key: "100_plus", label: "100 of meer" },
];

export const PERIODS: Array<{ key: StatsPeriod; label: string }> = [
  { key: "dit_jaar", label: "Dit jaar" },
  { key: "90_dagen", label: "Laatste 90 dagen" },
  { key: "alles", label: "Alles" },
];

export interface SizeStatsRow {
  key: SizeBucket | "totaal";
  label: string;
  aanvragen: number;
  lopend: number;
  getekend: number;
  geannuleerd: number;
  metLogies: number;
  meerdaags: number;
  /** Instappagina's met aantal, meest voorkomende eerst; "" is "onbekend". */
  instappaginas: Array<{ path: string; count: number }>;
}

export const sizeBucket = (n: number | null | undefined): SizeBucket => {
  const people = n ?? 0;
  if (people < 20) return "onder_20";
  if (people < 50) return "20_49";
  if (people < 100) return "50_99";
  return "100_plus";
};

const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
};

export const periodStart = (period: StatsPeriod, now: Date): Date | null => {
  if (period === "dit_jaar") return startOfYear(now);
  if (period === "90_dagen") return new Date(now.getTime() - 90 * 86_400_000);
  return null;
};

const entryPath = (attribution: unknown): string => {
  if (!attribution || typeof attribution !== "object") return "";
  const v = (attribution as Record<string, unknown>).entry_path;
  return typeof v === "string" ? v.split("?")[0].split("#")[0] : "";
};

const isMultiDay = (dates: unknown): boolean => Array.isArray(dates) && dates.length > 1;

const emptyRow = (key: SizeStatsRow["key"], label: string): SizeStatsRow => ({
  key,
  label,
  aanvragen: 0,
  lopend: 0,
  getekend: 0,
  geannuleerd: 0,
  metLogies: 0,
  meerdaags: 0,
  instappaginas: [],
});

/** Verwijderde aanvragen tellen niet mee; de periode gaat op de aanmaakdatum. */
export const buildSizeStats = (requests: SizeStatsRequest[], period: StatsPeriod, now: Date): SizeStatsRow[] => {
  const since = periodStart(period, now);
  const rows = new Map<SizeStatsRow["key"], SizeStatsRow>();
  for (const b of SIZE_BUCKETS) rows.set(b.key, emptyRow(b.key, b.label));
  const totaal = emptyRow("totaal", "Totaal");
  const paths = new Map<SizeStatsRow["key"], Map<string, number>>();

  for (const r of requests) {
    if (r.status === "deleted") continue;
    const created = parse(r.created_at);
    if (!created || (since && created < since)) continue;
    const bucket = sizeBucket(r.number_of_people);
    for (const row of [rows.get(bucket)!, totaal]) {
      row.aanvragen += 1;
      if (r.status === "cancelled") row.geannuleerd += 1;
      else if (r.status === "active") row.lopend += 1;
      if (r.terms_accepted_at) row.getekend += 1;
      if (r.linked_accommodation_id) row.metLogies += 1;
      if (isMultiDay(r.selected_dates)) row.meerdaags += 1;
      const map = paths.get(row.key) ?? new Map<string, number>();
      const path = entryPath(r.attribution);
      map.set(path, (map.get(path) ?? 0) + 1);
      paths.set(row.key, map);
    }
  }

  const finish = (row: SizeStatsRow): SizeStatsRow => ({
    ...row,
    instappaginas: [...(paths.get(row.key) ?? new Map<string, number>()).entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path)),
  });

  return [...SIZE_BUCKETS.map((b) => finish(rows.get(b.key)!)), finish(totaal)];
};

/** "/bedrijfsuitje-vlieland 3 · / 2 · onbekend 1", hooguit `max` paden. */
export const describeEntryPaths = (items: SizeStatsRow["instappaginas"], max = 3): string =>
  items
    .slice(0, max)
    .map((i) => `${i.path || "onbekend"} ${i.count}`)
    .join(" · ");
