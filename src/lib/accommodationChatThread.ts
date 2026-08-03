/**
 * Eén gespreks-thread per (logies-partner, logies-aanvraag).
 *
 * Voorheen zocht de admin-sheet op `quote_id` en het partnerpaneel op
 * `accommodation_id`. Daardoor konden twee losse threads ontstaan over
 * dezelfde aanvraag. De sleutel hieronder is de enige waarheid: partner +
 * logies-aanvraag. `quote_id` gaat alleen mee bij het aanmaken, als context.
 */

export interface AccommodationThreadKey {
  source: "partner_portal";
  source_partner_id: string;
  accommodation_id: string;
}

export interface ThreadCandidate {
  id: string;
  status?: string | null;
  created_at?: string | null;
}

/** Bouwt de lookup-sleutel voor een logies-thread. */
export function buildAccommodationThreadKey(args: {
  partnerId: string;
  accommodationId: string;
}): AccommodationThreadKey {
  return {
    source: "partner_portal",
    source_partner_id: args.partnerId,
    accommodation_id: args.accommodationId,
  };
}

/**
 * Kiest uit de kandidaten de thread die hergebruikt moet worden: de nieuwste
 * niet-gesloten thread. Geeft null als er geen bruikbare thread is.
 */
export function pickAccommodationThread(
  candidates: ThreadCandidate[] | null | undefined,
): string | null {
  if (!candidates?.length) return null;
  const open = candidates.filter((c) => c.status !== "closed");
  if (!open.length) return null;
  const sorted = [...open].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
  return sorted[0].id;
}

/** Payload voor een nieuwe logies-thread (quote_id is optionele context). */
export function buildAccommodationThreadInsert(args: {
  partnerId: string;
  accommodationId: string;
  partnerName: string;
  partnerEmail: string;
  quoteId?: string | null;
}) {
  return {
    ...buildAccommodationThreadKey(args),
    quote_id: args.quoteId ?? null,
    visitor_name: args.partnerName,
    visitor_email: args.partnerEmail,
    status: "active",
    last_message_at: new Date().toISOString(),
  };
}
