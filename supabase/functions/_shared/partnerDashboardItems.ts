// Welke onderdelen krijgt een partner in zijn portaal te zien? Eén plek voor
// de regels van get-partner-dashboard, zodat werkbank, projectenlijst en
// Facturatie dezelfde set onderdelen krijgen.
//
// - Door de partner gesloten onderdelen ("er volgt geen factuur"): nooit.
// - Concept-onderdelen (nog niet vrijgegeven) met een verstreken datum: nooit.
// - Gefactureerde onderdelen: altijd. Ze vormen de facturatiehistorie van de
//   partner (tab Gefactureerd, jaarcijfers, maandgrafiek). Voorheen vielen ze
//   weg zodra het bureau het project afrondde, waardoor Facturatie "Nog geen
//   facturen" toonde bij partners met tientallen geregistreerde facturen.
// - Geannuleerde onderdelen, of onderdelen van een geannuleerde aanvraag:
//   twaalf maanden, zodat de partner ze via archief en zoeken terugvindt.
// - Lopende statussen: altijd. Andere statussen: drie maanden na de laatste
//   wijziging.

export const PARTNER_ACTIVE_ITEM_STATUSES = [
  "pending",
  "confirmed",
  "alternative",
  "counter_proposed",
  "accepted",
  "executed",
] as const;

export interface DashboardRequestLike {
  status?: string | null;
  cancelled_at?: string | null;
  selected_dates?: unknown;
}

export interface DashboardItemLike {
  status: string;
  updated_at: string;
  invoiced_number?: string | null;
  partner_dismissed_at?: string | null;
  skip_partner_notification?: boolean | null;
  program_requests?: DashboardRequestLike | null;
}


/** Laatste geselecteerde datum van de aanvraag (ISO-dag), of null. */
export function lastRequestDate(req: DashboardRequestLike | null | undefined): string | null {
  const dates: unknown = req?.selected_dates;
  if (!Array.isArray(dates) || dates.length === 0) return null;
  const parsed = dates
    .map((d) => (typeof d === "string" ? d.slice(0, 10) : null))
    .filter((d): d is string => !!d)
    .sort();
  return parsed.length ? parsed[parsed.length - 1] : null;
}

function monthsAgo(now: Date, months: number): Date {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d;
}

/** Hoort dit onderdeel in het portaal van de partner (werkbank, projecten, Facturatie)? */
export function isPartnerDashboardItemVisible(item: DashboardItemLike, now: Date = new Date()): boolean {
  if (item.partner_dismissed_at) return false;

  const req = item.program_requests;
  const isConcept = !!item.skip_partner_notification && item.status === "pending";
  if (isConcept) {
    const endDate = lastRequestDate(req);
    if (endDate && endDate < now.toISOString().slice(0, 10)) return false;
  }

  // Facturatiehistorie: een geregistreerde factuur blijft zichtbaar, ook als
  // het bureau het project daarna afrondt.
  if (item.invoiced_number) return true;

  const reqCancelled = req?.status === "cancelled" || !!req?.cancelled_at;
  const itemCancelled = item.status === "cancelled" || item.status === "unavailable";
  if (reqCancelled || itemCancelled) {
    const ref = item.updated_at || req?.cancelled_at;
    return ref ? new Date(ref) > monthsAgo(now, 12) : false;
  }

  if ((PARTNER_ACTIVE_ITEM_STATUSES as readonly string[]).includes(item.status)) return true;
  return new Date(item.updated_at) > monthsAgo(now, 3);
}
