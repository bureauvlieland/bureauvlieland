// Parser voor door mensen ingevoerde datums (sales inbox → project).
// Ondersteunt:
//   - ISO: 2026-10-22
//   - DD-MM-YYYY / DD/MM/YYYY
//   - NL maandnamen: "22 oktober 2026", "22 okt 2026"
//   - Ranges: "22 t/m 25 oktober 2026", "22 tot en met 25 oktober 2026",
//             "22 - 25 oktober 2026", "22 – 25 oktober 2026",
//             "22 oktober - 25 oktober 2026", "22 oktober 2026 - 25 oktober 2026"
//   - Meerdere tokens gescheiden door komma of puntkomma.
//
// Retourneert een gesorteerde, gededupliceerde array met ISO-strings (YYYY-MM-DD),
// of een lijst van niet-parsebare fragmenten.

const MONTHS: Record<string, number> = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mrt: 3, maart: 3, mar: 3,
  apr: 4, april: 4,
  mei: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  aug: 8, augustus: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

export interface ParsedDatesResult {
  dates: string[]; // ISO YYYY-MM-DD, gesorteerd + uniek
  invalid: string[]; // fragmenten die niet begrepen konden worden
}

function toIso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

function normalizeMonth(word: string): number | null {
  const k = word.toLowerCase().replace(/\./g, "");
  return MONTHS[k] ?? null;
}

interface Parts {
  day: number;
  month?: number;
  year?: number;
}

function parseSingle(input: string): Parts | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;

  // ISO 2026-10-22
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return { year: +iso[1], month: +iso[2], day: +iso[3] };

  // DD-MM-YYYY of DD/MM/YYYY of DD.MM.YYYY
  const numeric = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (numeric) {
    let y = +numeric[3];
    if (y < 100) y += 2000;
    return { day: +numeric[1], month: +numeric[2], year: y };
  }

  // DD MMM YYYY / DD MMM / DD (met optionele maand en jaar)
  //   "22 oktober 2026" | "22 oktober" | "22"
  const m = s.match(/^(\d{1,2})(?:\s+([a-zë.]+))?(?:\s+(\d{4}))?$/i);
  if (m) {
    const day = +m[1];
    const monthWord = m[2];
    const yearStr = m[3];
    let month: number | undefined;
    if (monthWord) {
      const mm = normalizeMonth(monthWord);
      if (mm == null) return null;
      month = mm;
    }
    return { day, month, year: yearStr ? +yearStr : undefined };
  }

  return null;
}

function fillFromRight(left: Parts, right: Parts): { left: Parts; right: Parts } | null {
  // Right must have day; may inherit month/year from left if right lacks them,
  // or left may inherit from right if left lacks them.
  const l: Parts = { ...left };
  const r: Parts = { ...right };
  if (l.month == null) l.month = r.month;
  if (l.year == null) l.year = r.year;
  if (r.month == null) r.month = l.month;
  if (r.year == null) r.year = l.year;
  if (l.month == null || l.year == null || r.month == null || r.year == null) return null;
  return { left: l, right: r };
}

function expandRange(left: Parts, right: Parts): string[] | null {
  const filled = fillFromRight(left, right);
  if (!filled) return null;
  const startIso = toIso(filled.left.year!, filled.left.month!, filled.left.day);
  const endIso = toIso(filled.right.year!, filled.right.month!, filled.right.day);
  if (!startIso || !endIso) return null;
  const start = new Date(startIso + "T00:00:00Z");
  const end = new Date(endIso + "T00:00:00Z");
  if (end < start) return null;
  const out: string[] = [];
  const cur = new Date(start);
  // Cap op 60 dagen om per ongeluk enorme reeksen te voorkomen
  let guard = 0;
  while (cur <= end && guard < 60) {
    const y = cur.getUTCFullYear();
    const mo = cur.getUTCMonth() + 1;
    const d = cur.getUTCDate();
    const iso = toIso(y, mo, d);
    if (iso) out.push(iso);
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard++;
  }
  return out;
}

const RANGE_SPLIT = /\s*(?:tot en met|t\/m|t\.?m\.?|tm|-|–|—|tot)\s*/i;

function parseToken(token: string): { dates: string[]; ok: boolean } {
  const t = token.trim();
  if (!t) return { dates: [], ok: true };

  // Split op range-scheidingsteken (maar niet als het een streepje in een numerieke datum is:
  // "22-10-2026" moet als geheel blijven). Als na split de linker- of rechterhelft zelf al
  // een volledige numerieke datum is, gebruiken we die.
  const numericFull = /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/;
  const isoFull = /^\d{4}-\d{1,2}-\d{1,2}$/;
  if (numericFull.test(t) || isoFull.test(t)) {
    const p = parseSingle(t);
    if (!p || p.month == null || p.year == null) return { dates: [], ok: false };
    const iso = toIso(p.year, p.month, p.day);
    return iso ? { dates: [iso], ok: true } : { dates: [], ok: false };
  }

  const parts = t.split(RANGE_SPLIT).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 2) {
    const left = parseSingle(parts[0]);
    const right = parseSingle(parts[1]);
    if (left && right) {
      const range = expandRange(left, right);
      if (range && range.length) return { dates: range, ok: true };
    }
    return { dates: [], ok: false };
  }

  // Single date
  const single = parseSingle(t);
  if (!single) return { dates: [], ok: false };
  if (single.month == null || single.year == null) return { dates: [], ok: false };
  const iso = toIso(single.year, single.month, single.day);
  return iso ? { dates: [iso], ok: true } : { dates: [], ok: false };
}

export function parseDutchDates(input: string | string[] | null | undefined): ParsedDatesResult {
  const raw = Array.isArray(input) ? input.join(", ") : (input || "");
  if (!raw.trim()) return { dates: [], invalid: [] };

  // Splits op komma of puntkomma op top-level. Range-scheiders blijven binnen tokens.
  const tokens = raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const all = new Set<string>();
  const invalid: string[] = [];
  for (const token of tokens) {
    const { dates, ok } = parseToken(token);
    if (!ok) invalid.push(token);
    for (const d of dates) all.add(d);
  }
  return {
    dates: Array.from(all).sort(),
    invalid,
  };
}

export function formatDatesPreview(dates: string[]): string {
  if (!dates.length) return "";
  const fmt = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  if (dates.length === 1) return fmt.format(new Date(dates[0] + "T00:00:00Z"));
  const first = fmt.format(new Date(dates[0] + "T00:00:00Z"));
  const last = fmt.format(new Date(dates[dates.length - 1] + "T00:00:00Z"));
  return `${first} t/m ${last} (${dates.length} dagen)`;
}
