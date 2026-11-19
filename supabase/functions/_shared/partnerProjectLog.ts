/**
 * Welke regels uit program_request_history de partner ziet in het verloop van
 * een project (partnerportaal, blok "Verloop"). Gedeeld door
 * get-partner-project-log en het portaal (src/lib/partnerProjectLog.ts), zodat
 * de filter en de labels dezelfde lijst gebruiken.
 *
 * Uitgangspunt: alles over de eigen onderdelen, plus projectbrede zaken die de
 * partner raken. Niet: onderdelen van andere aanbieders, logies, facturatie-
 * en gastgegevens van de klant, bureauinterne zaken (snooze, link opnieuw
 * verstuurd, klant heeft portaal bekeken, bureaufacturen aan de klant) en
 * wijzigingen die het bureau heeft klaargezet maar nog niet gepubliceerd.
 */

export const PARTNER_LOG_LIMIT = 300;

/** Acties op een onderdeel van de partner (item_id is van hem). */
export const PARTNER_ITEM_ACTIONS = [
  "status_changed",
  "price_change_acknowledged",
  "customer_accepted",
  "item_approved",
  "counter_proposed",
  "time_changed",
  "day_changed",
  "notes_changed",
  "people_changed",
  "removed",
  "cancelled",
  "added",
  "item_added",
  "admin_changed_price",
  "purchase_invoice_registered",
  "purchase_invoice_deleted",
  "price_recalculated",
  "partner_dismissed",
] as const;

/** Projectbrede acties (zonder item_id) die de partner raken. */
export const PARTNER_PROJECT_ACTIONS = [
  "created",
  "dates_changed",
  "people_changed",
  "cancelled",
  "customer_cancelled",
  "terms_accepted",
  "quote_accepted",
  "admin_sent_to_partners",
  "admin_sent_to_partners_without_terms",
  "reopened",
] as const;

/**
 * Een paar functies schrijven een zin als actie in plaats van een sleutel
 * (override-item-status, auto-close-past-execution, set-project-ready-for-
 * invoice). Die herkennen we aan het begin van de zin.
 */
export const PARTNER_LOG_SENTENCE_PREFIXES = [
  "Admin override:",
  "Onderdeel \"",
  "Project handmatig op facturatie gezet",
] as const;

export interface HistoryRowLike {
  item_id: string | null;
  action: string;
}

const itemActions: ReadonlySet<string> = new Set(PARTNER_ITEM_ACTIONS);
const projectActions: ReadonlySet<string> = new Set(PARTNER_PROJECT_ACTIONS);

export const isSentenceAction = (action: string): boolean => PARTNER_LOG_SENTENCE_PREFIXES.some((p) => action.startsWith(p));

/** Ziet de partner deze regel? `ownItemIds` zijn zijn zichtbare onderdelen in het project. */
export function isPartnerVisibleHistoryRow(row: HistoryRowLike, ownItemIds: ReadonlySet<string>): boolean {
  if (row.item_id) {
    if (!ownItemIds.has(row.item_id)) return false;
    return itemActions.has(row.action) || isSentenceAction(row.action);
  }
  return projectActions.has(row.action) || row.action.startsWith("Project handmatig op facturatie gezet");
}
