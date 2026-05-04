import type { ProgramRequestItem } from "@/types/programRequest";

/**
 * Een onderdeel staat klaar voor klant-akkoord op het programma-voorstel als:
 *  - het niet geannuleerd is,
 *  - de klant het nog niet eerder akkoord heeft gegeven,
 *  - het géén self-arranged item is (klant regelt dat zelf).
 *
 * Het klant-akkoord op het voorstel is bewust laagdrempelig en niet-bindend:
 * pas ná dit akkoord vragen we partners om beschikbaarheid. Definitief
 * wordt het pas bij ondertekening van de algemene voorwaarden.
 */
export const isQuoteItemAwaitingCustomerApproval = (
  item: Pick<
    ProgramRequestItem,
    "status" | "customer_approved_at" | "block_type"
  >,
) => {
  if (item.status === "cancelled") return false;
  if (item.customer_approved_at) return false;
  if (item.block_type === "self_arranged") return false;
  return true;
};

export const hasQuoteItemsAwaitingCustomerApproval = (items: ProgramRequestItem[]) =>
  items.some(isQuoteItemAwaitingCustomerApproval);
