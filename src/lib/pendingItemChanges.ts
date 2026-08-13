/**
 * Eén bron van waarheid voor "klaargezette" (nog niet gepubliceerde) wijzigingen
 * op een program_request_item. Gebruikt door de admin-activiteitentabel en de
 * publiceer-dialoog zodat beide dezelfde velden en labels tonen.
 */

export interface PendingAwareItem {
  status?: string | null;
  preferred_time?: string | null;
  day_index?: number | null;
  pending_preferred_time?: string | null;
  pending_day_index?: number | null;
  pending_customer_notes?: string | null;
  pending_override_people?: number | null;
  pending_marked_for_removal?: boolean | null;
  pending_added?: boolean | null;
  pending_block_name?: string | null;
  pending_admin_price_override?: number | null;
  pending_price_type?: string | null;
  pending_admin_price_notes?: string | null;
  pending_partner_instructions?: string | null;
  pending_location_lat?: number | null;
  pending_location_lng?: number | null;
  pending_location_address?: string | null;
  pending_provider_id?: string | null;
  pending_provider_name?: string | null;
  pending_provider_email?: string | null;
  pending_block_type?: string | null;
  pending_changed_at?: string | null;
}

export type PendingChangeKind = "added" | "removed" | "changed";

/** Onderdeel is geannuleerd en hoort niet meer in de actieve dagweergave. */
export const isCancelledItem = (item: { status?: string | null }): boolean =>
  item.status === "cancelled";

/** Tijd zoals de admin die nu bedoelt: pending-tijd gaat voor de live tijd. */
export const effectivePreferredTime = (item: PendingAwareItem): string | null =>
  item.pending_preferred_time ?? item.preferred_time ?? null;

/** Dag zoals de admin die nu bedoelt. */
export const effectiveDayIndex = (item: PendingAwareItem): number =>
  item.pending_day_index ?? item.day_index ?? 0;

const timeToMinutes = (time: string | null): number | null => {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

/**
 * Sorteert onderdelen binnen een dag op de effectieve starttijd, zodat een
 * klaargezette tijdwijziging de regel direct op de juiste plek zet.
 * Onderdelen zonder tijd staan onderaan (stabiel in oorspronkelijke volgorde).
 */
export const sortByEffectiveTime = <T extends PendingAwareItem>(itemsList: T[]): T[] =>
  itemsList
    .map((item, index) => ({ item, index, minutes: timeToMinutes(effectivePreferredTime(item)) }))
    .sort((a, b) => {
      if (a.minutes === null && b.minutes === null) return a.index - b.index;
      if (a.minutes === null) return 1;
      if (b.minutes === null) return -1;
      if (a.minutes !== b.minutes) return a.minutes - b.minutes;
      return a.index - b.index;
    })
    .map((row) => row.item);

const FIELD_LABELS: Array<[keyof PendingAwareItem, string]> = [
  ["pending_block_name", "naam"],
  ["pending_preferred_time", "tijd"],
  ["pending_day_index", "dag"],
  ["pending_customer_notes", "opmerking"],
  ["pending_override_people", "personen"],
  ["pending_admin_price_override", "prijs"],
  ["pending_price_type", "prijstype"],
  ["pending_admin_price_notes", "beschrijving"],
  ["pending_partner_instructions", "instructie"],
  ["pending_location_address", "locatie"],
  ["pending_location_lat", "locatie"],
  ["pending_location_lng", "locatie"],
  ["pending_provider_id", "partner"],
  ["pending_provider_name", "partner"],
  ["pending_provider_email", "partner"],
  ["pending_block_type", "type"],
];

/** Welke velden staan klaar om gepubliceerd te worden (unieke, leesbare labels). */
export const pendingChangeLabels = (item: PendingAwareItem): string[] => {
  const labels: string[] = [];
  for (const [key, label] of FIELD_LABELS) {
    if (item[key] !== null && item[key] !== undefined && !labels.includes(label)) {
      labels.push(label);
    }
  }
  return labels;
};

/** Aard van de klaargezette wijziging, of null als er niets klaarstaat. */
export const pendingChangeKind = (item: PendingAwareItem): PendingChangeKind | null => {
  if (item.pending_added === true) return "added";
  if (item.pending_marked_for_removal === true) return "removed";
  if (pendingChangeLabels(item).length > 0 || item.pending_changed_at != null) return "changed";
  return null;
};

/** Korte chip-tekst voor de regel in de admin-tabel. */
export const pendingChangeChipLabel = (item: PendingAwareItem): string | null => {
  const kind = pendingChangeKind(item);
  if (kind === null) return null;
  if (kind === "added") return "Nieuw — nog niet gepubliceerd";
  if (kind === "removed") return "Wordt verwijderd";
  const labels = pendingChangeLabels(item);
  return labels.length > 0 ? `Gewijzigd: ${labels.join(", ")}` : "Gewijzigd";
};
