// Pure hulpfunctie voor het onderwerp van de chatantwoord-mail, los van
// Deno.serve zodat de test hem kan importeren. De template chat_reply_visitor
// bouwt het onderwerp zelf uit {{reference_number}}; dit is de terugval als de
// template ontbreekt.

export type ReplyRecipientKind = "accommodation_partner" | "customer";

export function buildReplyFallbackSubject(kind: ReplyRecipientKind, referenceNumber: string): string {
  if (kind === "accommodation_partner") {
    return referenceNumber
      ? `Nieuw bericht over logiesaanvraag ${referenceNumber}`
      : "Nieuw bericht over een logiesaanvraag";
  }
  return referenceNumber
    ? `Nieuw bericht van Bureau Vlieland (${referenceNumber})`
    : "Nieuw bericht van Bureau Vlieland";
}
