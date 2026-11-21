// Wie krijgt een annuleringsmail? (docs/plan-notificaties.md §5 fase 3)
//
// Alleen partners met een onderdeel dat ze hadden bevestigd of dat de klant
// had geaccepteerd (confirmed / accepted / executed). Een partner die alleen
// een aanvraag kreeg en nog niet reageerde (pending, counter_proposed) hoort
// niets: voor hem verdwijnt de aanvraag gewoon uit het portaal.
//
// Via cancel-program-request komen de onderdelen hier al als `cancelled`
// binnen (skip_item_cancel); de status van vóór de annulering staat dan niet
// meer op de rij. Daarvoor kijken we in program_request_history (de
// statuswissels van update-partner-item-status) en, als noodrem, naar de
// tijdstempels die alleen bij een bevestigd onderdeel gevuld zijn.

export const COMMITTED_ITEM_STATUSES: readonly string[] = ["confirmed", "accepted", "executed"];

export interface CancellationItemLike {
  id: string;
  status: string | null;
  customer_accepted_at?: string | null;
  executed_at?: string | null;
}

export interface HistoryStatusRow {
  item_id: string | null;
  old_value?: { status?: unknown } | null;
  new_value?: { status?: unknown } | null;
}

function isCommitted(status: unknown): boolean {
  return typeof status === "string" && COMMITTED_ITEM_STATUSES.includes(status);
}

/** Had de partner dit onderdeel bevestigd (of de klant het geaccepteerd) vóór de annulering? */
export function itemHadPartnerCommitment(item: CancellationItemLike, history: HistoryStatusRow[] = []): boolean {
  if (isCommitted(item.status)) return true;
  if (item.status !== "cancelled") return false;
  for (const row of history) {
    if (row.item_id !== item.id) continue;
    if (isCommitted(row.new_value?.status) || isCommitted(row.old_value?.status)) return true;
  }
  return !!(item.customer_accepted_at || item.executed_at);
}
