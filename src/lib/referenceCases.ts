import { format, isValid, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

/**
 * Referentiepagina's (docs/plan-reviews-oogsten.md, fase 3). Hier staat
 * alles wat zonder database kan: de momentopname van een programma die in
 * `reference_cases` komt (dagen, onderdelen, foto's, feiten), de
 * standaardteksten waar de AI-voorzet en Erwin op verder werken, het pad
 * naar de programma-bouwer met dezelfde bouwstenen ("Zoiets ook?") en het
 * opschonen van wat de publieke view teruggeeft.
 */

export interface ReferenceFact {
  label: string;
  value: string;
}

export interface ReferenceProgramItem {
  /** "09:30", of null zonder tijd. */
  time: string | null;
  name: string;
  category: string;
  block_id: string | null;
  image_url: string | null;
  provider: string;
}

export interface ReferenceProgramDay {
  day_index: number;
  /** "Dag 1" */
  label: string;
  /** ISO-datum (jjjj-mm-dd) of null als de dag geen datum heeft. */
  date: string | null;
  items: ReferenceProgramItem[];
}

export interface ReferencePhoto {
  url: string;
  alt: string;
  block_id: string | null;
}

/** De inhoud van een referentiepagina, zoals de tabel en de publieke view hem geven. */
export interface ReferenceCaseContent {
  slug: string;
  title: string;
  intro: string;
  /** Alinea's, gescheiden door een lege regel. */
  body: string;
  quote: string;
  quote_author: string;
  quote_role: string;
  company: string;
  group_size: number | null;
  /** Eerste dag van het programma, ISO-datum. */
  program_date: string | null;
  days: number;
  facts: ReferenceFact[];
  program: ReferenceProgramDay[];
  photos: ReferencePhoto[];
  block_ids: string[];
  landing_path: string;
}

export interface PublishedReferenceCase extends ReferenceCaseContent {
  id: string;
  published_at: string | null;
  updated_at: string;
}

// ── Momentopname uit een programma ──────────────────────────────────────────

export interface SnapshotRequest {
  reference_number: string | null;
  customer_name: string;
  customer_company: string | null;
  number_of_people: number;
  /** jsonb: lijst ISO-datums. */
  selected_dates: unknown;
  /** jsonb met onder meer `entry_path`. */
  attribution: unknown;
}

export interface SnapshotItem {
  day_index: number;
  preferred_time: string | null;
  confirmed_time: string | null;
  block_name: string;
  block_category: string;
  block_id: string | null;
  provider_name: string;
  status: string;
}

export interface SnapshotBlock {
  id: string;
  name: string;
  /** Al opgeloste foto-URL (via getBlockImage), of null zonder foto. */
  image: string | null;
}

export interface SnapshotReview {
  quote: string | null;
  text_positive: string;
  author_name: string;
  author_role: string;
  company: string;
}

export interface SnapshotInput {
  request: SnapshotRequest;
  items: SnapshotItem[];
  blocks: SnapshotBlock[];
  review?: SnapshotReview | null;
  /** Naam van het gekozen logies, als dat er is. */
  accommodation?: string | null;
  /** Soort programma volgens de instappagina, bijvoorbeeld "Bedrijfsuitje". */
  kind?: string | null;
  /** Slugs die al bestaan; de voorgestelde slug wijkt daarvan af. */
  existingSlugs?: string[];
}

export const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value || typeof value !== "string") return null;
  const d = parseISO(value.slice(0, 10));
  return isValid(d) ? d : null;
};

/** "mei 2026" */
export const periodLabel = (iso: string | null): string => {
  const d = parseDate(iso);
  return d ? format(d, "MMMM yyyy", { locale: nl }) : "";
};

/** "12 mei" */
export const dayDateLabel = (iso: string | null): string => {
  const d = parseDate(iso);
  return d ? format(d, "d MMMM", { locale: nl }) : "";
};

export const daysLabel = (n: number): string => `${n} ${n === 1 ? "dag" : "dagen"}`;

const DAY_WORDS: Record<number, string> = { 1: "eendaags", 2: "tweedaags", 3: "driedaags", 4: "vierdaags", 5: "vijfdaags" };
export const daysAdjective = (n: number): string => DAY_WORDS[n] ?? `${n}-daags`;

/** Gesorteerde ISO-datums uit `selected_dates`; wat geen datum is, valt weg. */
export const sortedDates = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === "string" ? v.slice(0, 10) : ""))
    .filter((v) => parseDate(v) !== null)
    .sort();
};

/** De instappagina uit de attributie van een aanvraag ("/bedrijfsuitje-vlieland"). */
export const entryPath = (attribution: unknown): string => {
  if (!attribution || typeof attribution !== "object") return "";
  const v = (attribution as Record<string, unknown>).entry_path;
  return typeof v === "string" ? v.split("?")[0].split("#")[0] : "";
};

/** "Bedrijfsuitje op Vlieland" → "Bedrijfsuitje". */
export const kindFromTitle = (title: string): string => title.replace(/\s+(op|voor)\s+Vlieland\s*$/i, "").replace(/\s+Vlieland\s*$/i, "").trim();

const timeOf = (item: SnapshotItem): string | null => {
  const t = (item.confirmed_time || item.preferred_time || "").slice(0, 5);
  return /^\d{2}:\d{2}$/.test(t) ? t : null;
};

/** Dagen met onderdelen op tijd; geannuleerde onderdelen doen niet mee. */
export const buildProgramDays = (items: SnapshotItem[], dates: string[], blocks: SnapshotBlock[]): ReferenceProgramDay[] => {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const perDay = new Map<number, SnapshotItem[]>();
  for (const item of items) {
    if (item.status === "cancelled") continue;
    const day = Math.max(0, Math.floor(item.day_index || 0));
    const list = perDay.get(day) ?? [];
    list.push(item);
    perDay.set(day, list);
  }
  return [...perDay.keys()]
    .sort((a, b) => a - b)
    .map((dayIndex) => ({
      day_index: dayIndex,
      label: `Dag ${dayIndex + 1}`,
      date: dates[dayIndex] ?? null,
      items: (perDay.get(dayIndex) ?? [])
        .map((item, index) => ({ item, index, time: timeOf(item) }))
        .sort((a, b) => {
          if (a.time && b.time) return a.time.localeCompare(b.time) || a.index - b.index;
          if (a.time) return -1;
          if (b.time) return 1;
          return a.index - b.index;
        })
        .map(({ item, time }) => {
          const block = item.block_id ? byId.get(item.block_id) : undefined;
          return {
            time,
            name: item.block_name || block?.name || "Onderdeel",
            category: item.block_category,
            block_id: item.block_id,
            image_url: block?.image ?? null,
            provider: item.provider_name,
          };
        }),
    }));
};

/** Unieke foto's van de bouwstenen, in programmavolgorde. */
export const buildPhotos = (program: ReferenceProgramDay[], max = 4): ReferencePhoto[] => {
  const photos: ReferencePhoto[] = [];
  const seen = new Set<string>();
  for (const day of program) {
    for (const item of day.items) {
      if (!item.image_url || seen.has(item.image_url)) continue;
      seen.add(item.image_url);
      photos.push({ url: item.image_url, alt: item.name, block_id: item.block_id });
      if (photos.length >= max) return photos;
    }
  }
  return photos;
};

/** Unieke bouwsteen-id's, in programmavolgorde. */
export const collectBlockIds = (program: ReferenceProgramDay[]): string[] => {
  const ids: string[] = [];
  for (const day of program) {
    for (const item of day.items) {
      if (item.block_id && !ids.includes(item.block_id)) ids.push(item.block_id);
    }
  }
  return ids;
};

export const buildFacts = (input: {
  kind: string | null;
  group_size: number | null;
  program_date: string | null;
  days: number;
  accommodation: string | null;
}): ReferenceFact[] => {
  const facts: ReferenceFact[] = [];
  if (input.kind) facts.push({ label: "Soort", value: input.kind });
  if (input.group_size) facts.push({ label: "Groepsgrootte", value: `${input.group_size} personen` });
  const periode = periodLabel(input.program_date);
  if (periode) facts.push({ label: "Periode", value: periode });
  facts.push({ label: "Duur", value: daysLabel(input.days) });
  if (input.accommodation) facts.push({ label: "Overnachting", value: input.accommodation });
  return facts;
};

/** "acme-mei-2026", en "-2", "-3" zolang de slug al bestaat. */
export const suggestSlug = (company: string, programDate: string | null, existing: string[] = []): string => {
  const base = [slugify(company) || "groep", slugify(periodLabel(programDate))].filter(Boolean).join("-");
  const taken = new Set(existing);
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
};

/** Standaardtekst per dag: feitelijk, zodat de voorvertoning ook zonder AI-voorzet klopt. */
export const defaultBody = (program: ReferenceProgramDay[]): string =>
  program
    .filter((day) => day.items.length > 0)
    .map((day) => {
      const datum = dayDateLabel(day.date);
      const namen = day.items.map((i) => i.name);
      return `${day.label}${datum ? ` (${datum})` : ""}: ${namen.join(", ")}.`;
    })
    .join("\n\n");

/** De momentopname van een programma als startpunt voor een referentiepagina. */
export const buildReferenceSnapshot = (input: SnapshotInput): ReferenceCaseContent => {
  const dates = sortedDates(input.request.selected_dates);
  const program = buildProgramDays(input.items, dates, input.blocks);
  const lastDay = program.length ? program[program.length - 1].day_index + 1 : 0;
  const days = Math.max(1, dates.length, lastDay);
  const company = (input.review?.company || input.request.customer_company || "").trim();
  const program_date = dates[0] ?? null;
  const group_size = input.request.number_of_people > 0 ? input.request.number_of_people : null;
  const kind = input.kind?.trim() || null;
  const soort = kind ?? "Groepsprogramma";
  const periode = periodLabel(program_date);
  const quote = (input.review?.quote || input.review?.text_positive || "").trim();

  return {
    slug: suggestSlug(company, program_date, input.existingSlugs ?? []),
    title: company ? `${soort} van ${company}` : `${soort} op Vlieland`,
    intro: `Een ${daysAdjective(days)} ${soort.toLowerCase()}${group_size ? ` voor ${group_size} personen` : ""}${periode ? ` in ${periode}` : ""}.`,
    body: defaultBody(program),
    quote,
    quote_author: quote ? (input.review?.author_name ?? "").trim() : "",
    quote_role: quote ? (input.review?.author_role ?? "").trim() : "",
    company,
    group_size,
    program_date,
    days,
    facts: buildFacts({ kind, group_size, program_date, days, accommodation: input.accommodation?.trim() || null }),
    program,
    photos: buildPhotos(program),
    block_ids: collectBlockIds(program),
    landing_path: entryPath(input.request.attribution),
  };
};

// ── "Zoiets ook?": dezelfde bouwstenen in de programma-bouwer ───────────────

export const WIZARD_PATH = "/programma-samenstellen";
const BLOCK_ID = /^[A-Za-z0-9_-]+$/;
const MAX_PREFILL = 40;
const MAX_DAY_INDEX = 13;

export interface BlockPrefill {
  blockId: string;
  dayIndex: number;
}

/** `/programma-samenstellen?blocks=zeehondentocht:0,strand-bbq:1` */
export const wizardUrlForProgram = (program: ReferenceProgramDay[]): string => {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const day of program) {
    for (const item of day.items) {
      if (!item.block_id || seen.has(item.block_id) || !BLOCK_ID.test(item.block_id)) continue;
      seen.add(item.block_id);
      parts.push(`${item.block_id}:${day.day_index}`);
    }
  }
  return parts.length ? `${WIZARD_PATH}?blocks=${parts.join(",")}` : WIZARD_PATH;
};

/** De `blocks`-parameter terug naar bouwstenen per dag; rommel valt weg. */
export const parseBlocksParam = (raw: string | null): BlockPrefill[] => {
  if (!raw) return [];
  const out: BlockPrefill[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const [idRaw, dayRaw = "0"] = part.trim().split(":");
    const blockId = (idRaw ?? "").trim();
    if (!blockId || !BLOCK_ID.test(blockId) || seen.has(blockId)) continue;
    seen.add(blockId);
    const parsed = Number.parseInt(dayRaw, 10);
    const dayIndex = Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, MAX_DAY_INDEX) : 0;
    out.push({ blockId, dayIndex });
    if (out.length >= MAX_PREFILL) break;
  }
  return out;
};

// ── Opschonen van wat de view teruggeeft ────────────────────────────────────

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asNullableString = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const asRecord = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export const normalizeFacts = (v: unknown): ReferenceFact[] =>
  asList(v)
    .map(asRecord)
    .filter((f): f is Record<string, unknown> => f !== null)
    .map((f) => ({ label: asString(f.label), value: asString(f.value) }))
    .filter((f) => f.label && f.value);

export const normalizePhotos = (v: unknown): ReferencePhoto[] =>
  asList(v)
    .map(asRecord)
    .filter((p): p is Record<string, unknown> => p !== null)
    .map((p) => ({ url: asString(p.url), alt: asString(p.alt), block_id: asNullableString(p.block_id) }))
    .filter((p) => p.url);

export const normalizeProgram = (v: unknown): ReferenceProgramDay[] =>
  asList(v)
    .map(asRecord)
    .filter((d): d is Record<string, unknown> => d !== null)
    .map((d, index) => {
      const dayIndex = typeof d.day_index === "number" && d.day_index >= 0 ? Math.floor(d.day_index) : index;
      return {
        day_index: dayIndex,
        label: asString(d.label) || `Dag ${dayIndex + 1}`,
        date: asNullableString(d.date),
        items: asList(d.items)
          .map(asRecord)
          .filter((i): i is Record<string, unknown> => i !== null)
          .map((i) => ({
            time: asNullableString(i.time),
            name: asString(i.name),
            category: asString(i.category),
            block_id: asNullableString(i.block_id),
            image_url: asNullableString(i.image_url),
            provider: asString(i.provider),
          }))
          .filter((i) => i.name),
      };
    });

export const normalizeCase = (row: Record<string, unknown>): PublishedReferenceCase => ({
  id: asString(row.id),
  slug: asString(row.slug),
  title: asString(row.title),
  intro: asString(row.intro),
  body: asString(row.body),
  quote: asString(row.quote),
  quote_author: asString(row.quote_author),
  quote_role: asString(row.quote_role),
  company: asString(row.company),
  group_size: typeof row.group_size === "number" ? row.group_size : null,
  program_date: asNullableString(row.program_date),
  days: typeof row.days === "number" && row.days > 0 ? row.days : 1,
  facts: normalizeFacts(row.facts),
  program: normalizeProgram(row.program),
  photos: normalizePhotos(row.photos),
  block_ids: asList(row.block_ids).filter((b): b is string => typeof b === "string"),
  landing_path: asString(row.landing_path),
  published_at: asNullableString(row.published_at),
  updated_at: asString(row.updated_at),
});

/** Alinea's uit de tekst (lege regel ertussen). */
export const paragraphsOf = (body: string): string[] =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** "24 personen · 2 dagen · mei 2026" */
export const caseMeta = (c: Pick<ReferenceCaseContent, "group_size" | "days" | "program_date">): string =>
  [c.group_size ? `${c.group_size} personen` : "", daysLabel(c.days), periodLabel(c.program_date)].filter(Boolean).join(" · ");

/** Het "Soort"-feit, als dat er is ("Bedrijfsuitje"). */
export const caseKind = (c: Pick<ReferenceCaseContent, "facts">): string | null => c.facts.find((f) => f.label === "Soort")?.value ?? null;
