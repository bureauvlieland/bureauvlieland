/**
 * Het ene aanvraagformulier (`/programma-op-maat`, plan klantreis en
 * ondertekening, fase 2): de vinkjes "wat heeft u nodig", de soorten uitje,
 * de voorinvulling vanuit een voorbeeldprogramma en de samenvatting die in
 * `program_description` en de bevestigingsmail terechtkomt. Puur, zodat het
 * getest kan worden zonder React of database.
 */
import type { ProgramTemplate } from "@/types/programTemplate";

export type NeedKey = "activiteiten" | "eten" | "overnachting" | "vervoer";

export const NEEDS: ReadonlyArray<{ key: NeedKey; label: string; hint: string }> = [
  { key: "activiteiten", label: "Activiteiten", hint: "Excursies, sport, entertainment, locaties" },
  { key: "eten", label: "Eten en drinken", hint: "Lunch, borrel, BBQ of diner" },
  { key: "overnachting", label: "Overnachting", hint: "Hotel, groepsaccommodatie of camping" },
  { key: "vervoer", label: "Boot en fietsen", hint: "Overtocht en fietsen op het eiland" },
];

const NEED_KEYS = new Set<string>(NEEDS.map((n) => n.key));

/** Oude paden en hun vinkje: `/catering-aanvragen` werd `?nodig=eten`. */
const NEED_ALIASES: Record<string, NeedKey> = {
  catering: "eten",
  logies: "overnachting",
  boot: "vervoer",
  fietsen: "vervoer",
};

export const EVENT_TYPES: ReadonlyArray<{ value: string; label: string; programType: "zakelijk" | "prive" }> = [
  { value: "bedrijfsuitje", label: "Bedrijfsuitje", programType: "zakelijk" },
  { value: "teamuitje", label: "Teamuitje / teambuilding", programType: "zakelijk" },
  { value: "heisessie", label: "Heisessie / MT-dag", programType: "zakelijk" },
  { value: "incentive", label: "Incentive reis", programType: "zakelijk" },
  { value: "zakelijk_evenement", label: "Zakelijk evenement", programType: "zakelijk" },
  { value: "familieweekend", label: "Familieweekend", programType: "prive" },
  { value: "groepsweekend", label: "Groepsweekend", programType: "prive" },
  { value: "jubileum", label: "Jubileum", programType: "prive" },
  { value: "bruiloft", label: "Bruiloft", programType: "prive" },
  { value: "anders", label: "Anders", programType: "zakelijk" },
];

/** `?nodig=eten,overnachting` (of een alias zoals `catering`) naar vinkjes, zonder dubbelen. */
export function parseNeedsParam(value: string | null | undefined): NeedKey[] {
  if (!value) return [];
  const out: NeedKey[] = [];
  for (const raw of value.split(",")) {
    const key = raw.trim().toLowerCase();
    const resolved = NEED_KEYS.has(key) ? (key as NeedKey) : NEED_ALIASES[key];
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

/** `?soort=heisessie` naar een geldige soort, anders null. */
export function parseEventTypeParam(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return EVENT_TYPES.some((t) => t.value === key) ? key : null;
}

/** Welke vinkjes passen bij een voorbeeldprogramma, afgeleid van zijn onderdelen. */
export function needsFromTemplate(template: Pick<ProgramTemplate, "duration_days" | "items">): NeedKey[] {
  const needs = new Set<NeedKey>();
  for (const item of template.items ?? []) {
    const category = item.block?.category;
    if (!category) continue;
    if (category === "catering") needs.add("eten");
    else if (category === "vervoer") needs.add("vervoer");
    else if (category === "services" || category === "overig") continue;
    else needs.add("activiteiten");
  }
  if ((template.duration_days ?? 1) > 1) needs.add("overnachting");
  return NEEDS.map((n) => n.key).filter((k) => needs.has(k));
}

/** De tekst voor "Uw wensen" als de bezoeker vanuit een voorbeeldprogramma komt. */
export function wishesFromTemplate(template: Pick<ProgramTemplate, "name" | "duration_days" | "items">): string {
  const days = template.duration_days === 1 ? "1 dag" : `${template.duration_days} dagen`;
  const lines = [`Voorbeeldprogramma als startpunt: ${template.name} (${days}).`];
  const items = [...(template.items ?? [])]
    .filter((i) => i.block?.name)
    .sort((a, b) => a.day_index - b.day_index || a.sort_order - b.sort_order);
  if (items.length > 0) {
    const multiDay = (template.duration_days ?? 1) > 1;
    const byDay = new Map<number, string[]>();
    for (const item of items) {
      const list = byDay.get(item.day_index) ?? [];
      list.push(item.block!.name);
      byDay.set(item.day_index, list);
    }
    for (const [day, names] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
      lines.push(multiDay ? `Dag ${day + 1}: ${names.join(", ")}` : names.join(", "));
    }
  }
  lines.push("Graag aanpassen aan onze groep:");
  return lines.join("\n");
}

export interface RequestSummaryInput {
  programType: "zakelijk" | "prive";
  eventType: string | null;
  needs: NeedKey[];
  periodText?: string | null;
  templateName?: string | null;
}

export function eventTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? null;
}

export function needsLabels(needs: NeedKey[]): string[] {
  return NEEDS.filter((n) => needs.includes(n.key)).map((n) => n.label.toLowerCase());
}

/**
 * Eén regel voor `program_description`, zichtbaar bovenaan het project in de
 * admin: "Maatwerk zakelijk · Heisessie · activiteiten, eten en drinken ·
 * periode: voorjaar 2027 · voorbeeld: Eilanddag compleet".
 */
export function describeRequest(input: RequestSummaryInput): string {
  const parts = [`Maatwerk ${input.programType}`];
  const type = eventTypeLabel(input.eventType);
  if (type) parts.push(type);
  const needs = needsLabels(input.needs);
  if (needs.length > 0) parts.push(needs.join(", "));
  if (input.periodText?.trim()) parts.push(`periode: ${input.periodText.trim()}`);
  if (input.templateName) parts.push(`voorbeeld: ${input.templateName}`);
  return parts.join(" · ");
}

/** Dezelfde samenvatting als eerste alinea van de notities, voor de mail en het dossier. */
export function summaryForNotes(input: RequestSummaryInput): string {
  const lines: string[] = [];
  const type = eventTypeLabel(input.eventType);
  if (type) lines.push(`Soort: ${type}`);
  const needs = needsLabels(input.needs);
  if (needs.length > 0) lines.push(`Gewenst: ${needs.join(", ")}`);
  if (input.periodText?.trim()) lines.push(`Periode: ${input.periodText.trim()}`);
  return lines.join("\n");
}
