import type { ProgramRequestItem } from "@/types/programRequest";
import { isTicketItem } from "@/lib/ticketItems";

/**
 * Een "bureau-uitvoering" is een onderdeel dat Bureau Vlieland zelf regelt
 * met een eigen begeleider (vuurtorenwachter, gids fietstocht, etc.).
 * Ferries en fietshuur (tickets) vallen hier expliciet NIET onder — die
 * hebben hun eigen TicketBookingInline-flow.
 */
export function isBureauExecutionItem(
  item: Pick<ProgramRequestItem, "provider_id" | "block_id">,
): boolean {
  return item.provider_id === "bureau" && !isTicketItem(item);
}

export type BureauExecutionStatus = "open" | "arranged";

export function getBureauExecutionStatus(
  item: Pick<ProgramRequestItem, "bureau_arranged_at">,
): BureauExecutionStatus {
  return item.bureau_arranged_at ? "arranged" : "open";
}
