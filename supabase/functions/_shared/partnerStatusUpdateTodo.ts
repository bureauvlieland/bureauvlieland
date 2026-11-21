/**
 * Wanneer mag de reconciler een Werkbank-taak `partner_status_update`
 * ("Partner X reageert op … — bevestigd") sluiten?
 *
 * Tot november 2026 sloot `reconcile-admin-todos` deze taak zodra het
 * onderdeel op `confirmed` stond. Dat is precies de status waarin de taak
 * wordt aangemaakt, dus de melding verdween bij de eerstvolgende keer dat de
 * Werkbank openging, voordat iemand hem zag (docs/plan-notificaties.md,
 * "Het korte antwoord"). Een partnerreactie is een gebeurtenis van buiten:
 * die blijft staan tot Erwin hem afvinkt, of vervalt na een week, net als
 * `all_partners_responded`.
 */

export const PARTNER_STATUS_UPDATE_TTL_DAYS = 7;

export interface PartnerStatusUpdateTodoLike {
  created_at: string;
}

export interface PartnerStatusUpdateItemLike {
  status: string | null;
}

/**
 * True als de taak automatisch dicht mag: het onderdeel bestaat niet meer,
 * is geannuleerd, of de taak is ouder dan de bewaartermijn.
 */
export function shouldClosePartnerStatusUpdate(
  todo: PartnerStatusUpdateTodoLike,
  item: PartnerStatusUpdateItemLike | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!item) return true;
  if (item.status === "cancelled") return true;
  const created = new Date(todo.created_at).getTime();
  if (Number.isNaN(created)) return false;
  const ageDays = (now.getTime() - created) / 86_400_000;
  return ageDays > PARTNER_STATUS_UPDATE_TTL_DAYS;
}
