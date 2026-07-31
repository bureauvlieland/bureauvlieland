import type { ProgramRequestItem } from "@/types/programRequest";

/** Canonical block_ids that are considered "ticket" items (ferries + bike rentals). */
export const FERRY_BLOCK_IDS = [
  "boot-enkel-heen",
  "boot-enkel-terug",
  "boot-retour",
  "bootretour-doeksen-groep",
] as const;

export const BIKE_BLOCK_IDS = [
  "fiets-huur",
  "fietshuur-weekend",
  // E-bike verhuur (gepubliceerde kopie van fietshuur)
  "fiets-huur-kopie-2",
] as const;

export const TICKET_BLOCK_IDS: readonly string[] = [
  ...FERRY_BLOCK_IDS,
  ...BIKE_BLOCK_IDS,
];

export type TicketKind = "ferry" | "bike";

export function isTicketItem(item: { block_id?: string | null }): boolean {
  return !!item.block_id && TICKET_BLOCK_IDS.includes(item.block_id);
}

export function getTicketKind(item: { block_id?: string | null }): TicketKind | null {
  if (!item.block_id) return null;
  if ((FERRY_BLOCK_IDS as readonly string[]).includes(item.block_id)) return "ferry";
  if ((BIKE_BLOCK_IDS as readonly string[]).includes(item.block_id)) return "bike";
  return null;
}

export function getTicketKindLabel(kind: TicketKind | null): string {
  if (kind === "ferry") return "Overtocht";
  if (kind === "bike") return "Fietshuur";
  return "Ticket";
}

/**
 * Resolve the human-relevant date for a ticket item, based on the project's
 * selected_dates and the item's day_index. Falls back to the first date.
 * Pinned ferry "terug" items use day_index = last day; "heen" / bike use day 0.
 */
export function getTicketDate(
  item: Pick<ProgramRequestItem, "day_index" | "block_id">,
  selectedDates: string[] | null | undefined,
): string | null {
  if (!selectedDates || selectedDates.length === 0) return null;
  const idx = item.day_index;
  if (idx == null || idx < 0 || idx >= selectedDates.length) {
    return selectedDates[0] ?? null;
  }
  return selectedDates[idx] ?? selectedDates[0] ?? null;
}

export type TicketStatus = "open" | "booked";

export function getTicketStatus(item: Pick<ProgramRequestItem, "booking_reference" | "booking_document_path">): TicketStatus {
  return item.booking_reference || item.booking_document_path ? "booked" : "open";
}

/**
 * Project statuses whose ticket items must never be counted or shown:
 * the project itself is dead.
 */
export const TICKET_EXCLUDED_REQUEST_STATUSES = ["cancelled", "deleted"] as const;

/**
 * Single source of truth for "open ticket" (= actionable, must be booked):
 * - ticket block (ferry/bike)
 * - item not cancelled
 * - no booking_reference and no booking_document_path yet
 * - customer already approved the item (before approval we may not book)
 * - parent project not cancelled/deleted
 *
 * Both the sidebar badge and the tickets page use this so the counts can never
 * drift apart again.
 */
export function isOpenTicketRow(row: {
  block_id?: string | null;
  status?: string | null;
  booking_reference?: string | null;
  booking_document_path?: string | null;
  customer_approved_at?: string | null;
  request_status?: string | null;
}): boolean {
  if (!isTicketItem(row)) return false;
  if (row.status === "cancelled") return false;
  if (row.booking_reference || row.booking_document_path) return false;
  if (!row.customer_approved_at) return false;
  if (
    row.request_status &&
    (TICKET_EXCLUDED_REQUEST_STATUSES as readonly string[]).includes(row.request_status)
  ) {
    return false;
  }
  return true;
}
