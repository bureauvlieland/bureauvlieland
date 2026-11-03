/**
 * Leverdatum op de factuur: de dagen van het programma als één leesbaar
 * bereik. Drie losse datums ("16 okt. 2026 – 17 okt. 2026 – 18 okt. 2026")
 * liepen op de PDF over twee regels; "16 t/m 18 okt. 2026" zegt hetzelfde.
 */
import { format, parseISO, isValid, differenceInCalendarDays } from "date-fns";
import { nl } from "date-fns/locale";

const parse = (value: string): Date | null => {
  const d = parseISO(value);
  return isValid(d) ? d : null;
};

const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const sameYear = (a: Date, b: Date) => a.getFullYear() === b.getFullYear();

const fmtFull = (d: Date) => format(d, "d MMM yyyy", { locale: nl });
const fmtDayMonth = (d: Date) => format(d, "d MMM", { locale: nl });
const fmtMonthYear = (d: Date) => format(d, "MMM yyyy", { locale: nl });

/** Eén aaneengesloten reeks, volledig uitgeschreven: "16 t/m 18 okt. 2026", "30 okt. t/m 1 nov. 2026". */
const fmtRun = (first: Date, last: Date): string => {
  if (first.getTime() === last.getTime()) return fmtFull(first);
  if (sameMonth(first, last)) return `${format(first, "d")} t/m ${fmtFull(last)}`;
  if (sameYear(first, last)) return `${fmtDayMonth(first)} t/m ${fmtFull(last)}`;
  return `${fmtFull(first)} t/m ${fmtFull(last)}`;
};

/** Reeksen van opeenvolgende dagen. */
const splitRuns = (dates: Date[]): Array<[Date, Date]> => {
  const runs: Array<[Date, Date]> = [];
  for (const d of dates) {
    const current = runs[runs.length - 1];
    if (current && differenceInCalendarDays(d, current[1]) === 1) {
      current[1] = d;
    } else {
      runs.push([d, d]);
    }
  }
  return runs;
};

const joinNL = (parts: string[]): string =>
  parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} en ${parts[parts.length - 1]}`;

/**
 * "16 okt. 2026", "16 t/m 18 okt. 2026", "30 okt. t/m 1 nov. 2026",
 * "16, 18 en 20 okt. 2026" of "16 t/m 17 en 20 okt. 2026". Ongeldige
 * waarden worden overgeslagen; zonder datums een lege string.
 */
export function formatEventDates(values: Array<string | null | undefined> | null | undefined): string {
  const dates = Array.from(
    new Map(
      (values ?? [])
        .map((v) => (v ? parse(v) : null))
        .filter((d): d is Date => d !== null)
        .map((d) => [format(d, "yyyy-MM-dd"), d] as const),
    ).values(),
  ).sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return "";

  const runs = splitRuns(dates);
  if (runs.length === 1) return fmtRun(runs[0][0], runs[0][1]);

  const first = dates[0];
  const last = dates[dates.length - 1];
  if (sameMonth(first, last)) {
    const parts = runs.map(([a, b]) => (a.getTime() === b.getTime() ? format(a, "d") : `${format(a, "d")} t/m ${format(b, "d")}`));
    return `${joinNL(parts)} ${fmtMonthYear(last)}`;
  }
  return joinNL(runs.map(([a, b]) => fmtRun(a, b)));
}
