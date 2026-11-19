import { formatTimeHHmm } from "@/lib/timeUtils";

/**
 * Wat er aan een onderdeel is gewijzigd nádat de partner reageerde. Het
 * dashboard (get-partner-dashboard) verzamelt deze uit de klanthistorie
 * (program_request_history) en de door het bureau gepubliceerde wijzigingen
 * (program_change_log) en hangt ze als `changes_since_response` aan het
 * onderdeel. Hier staat alleen de vertaling naar Nederlandse regels, zodat
 * kaart en mail hetzelfde zeggen.
 */
export type PartnerItemChangeField = "time" | "day" | "people" | "notes" | "dates" | "other";

export interface PartnerItemChange {
  field: PartnerItemChangeField;
  old_value: unknown;
  new_value: unknown;
  changed_at: string;
  /** customer | bureau */
  actor: "customer" | "bureau";
}

/** Eerdere reactie van de partner: wat ook alweer het voorstel was. */
export interface PartnerPreviousResponse {
  status: string | null;
  proposed_time: string | null;
  confirmed_time: string | null;
  quoted_price: number | null;
  status_updated_at: string | null;
  quoted_at: string | null;
}

const fieldFromHistoryAction: Record<string, PartnerItemChangeField> = {
  time_changed: "time",
  day_changed: "day",
  people_changed: "people",
  notes_changed: "notes",
  dates_changed: "dates",
};

/** Actie uit program_request_history → veld; onbekende acties zijn geen wijziging. */
export const changeFieldFromHistoryAction = (action: string): PartnerItemChangeField | null => fieldFromHistoryAction[action] ?? null;

const changeLogFields = new Set<PartnerItemChangeField>(["time", "day", "people", "notes"]);

/** Veld uit program_change_log → veld; velden die de partner niet aangaan vallen af. */
export const changeFieldFromChangeLog = (field: string): PartnerItemChangeField | null =>
  changeLogFields.has(field as PartnerItemChangeField) ? (field as PartnerItemChangeField) : null;

/** Het moment van de laatste partnerreactie, of null als de partner nog nooit reageerde. */
export const partnerRespondedAt = (item: Pick<PartnerPreviousResponse, "status_updated_at" | "quoted_at">): string | null => {
  const stamps = [item.status_updated_at, item.quoted_at].filter((s): s is string => !!s);
  if (stamps.length === 0) return null;
  return stamps.sort().at(-1) ?? null;
};

const unwrap = (v: unknown): unknown => {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if ("value" in o) return o.value;
    if ("dates" in o) return o.dates;
    if ("people" in o) return o.people;
  }
  return v;
};

const formatValue = (field: PartnerItemChangeField, raw: unknown): string => {
  const v = unwrap(raw);
  if (v == null || v === "") return field === "time" ? "flexibel" : field === "notes" ? "geen" : "onbekend";
  if (Array.isArray(v)) return v.map((d) => String(d)).join(", ");
  const s = String(v);
  if (field === "time") return s.toLowerCase() === "flexibel" ? "flexibel" : (formatTimeHHmm(s) ?? s);
  if (field === "day") return /^\d+$/.test(s) ? `dag ${Number(s) + 1}` : s.toLowerCase();
  if (field === "people") return `${s} pers.`;
  return s;
};

/** Eén regel per wijziging, bijvoorbeeld "Tijd: 14:45 → 16:00". */
export const describePartnerItemChange = (change: PartnerItemChange): string => {
  const from = formatValue(change.field, change.old_value);
  const to = formatValue(change.field, change.new_value);
  switch (change.field) {
    case "time":
      return `Tijd: ${from} → ${to}`;
    case "day":
      return `Dag: ${from} → ${to}`;
    case "people":
      return `Aantal personen: ${from} → ${to}`;
    case "notes":
      return `Wens van de klant aangepast: "${to}"`;
    case "dates":
      return `Data van het programma: ${from} → ${to}`;
    default:
      return "Onderdeel aangepast";
  }
};

/** "Uw eerdere voorstel: 14:45, € 750,00" of null als er niets eerder was. */
export const describePreviousResponse = (prev: PartnerPreviousResponse, formatEuro: (n: number) => string): string | null => {
  const parts: string[] = [];
  const time = prev.confirmed_time ?? prev.proposed_time;
  if (time) parts.push(formatTimeHHmm(time) ?? time);
  if (prev.quoted_price != null) parts.push(formatEuro(prev.quoted_price));
  if (parts.length === 0) return null;
  return `Uw eerdere voorstel: ${parts.join(", ")}`;
};

/**
 * Wijzigingen die ná de partnerreactie kwamen, nieuwste eerst. Alleen zinvol
 * als het onderdeel weer open staat; die check doet de kaart.
 */
export const changesSinceResponse = (changes: PartnerItemChange[] | null | undefined, respondedAt: string | null): PartnerItemChange[] => {
  if (!changes || !respondedAt) return [];
  return changes.filter((c) => c.changed_at > respondedAt).sort((a, b) => b.changed_at.localeCompare(a.changed_at));
};
