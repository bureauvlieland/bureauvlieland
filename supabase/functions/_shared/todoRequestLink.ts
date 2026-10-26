/**
 * Koppeling tussen een auto-taak en zijn project.
 *
 * admin_todos.related_request_id staat op ON DELETE SET NULL. Wordt het
 * project verwijderd (zoals de dagelijkse zelftest doet met zijn
 * ZELFTEST-aanvraag), dan verliest de taak zijn koppeling en blijft hij als
 * "losse taak" eeuwig in de Werkbank staan. Voor project-gebonden auto_types
 * bewaart auto_entity_id echter nog het project-id, zodat reconcile de wees
 * alsnog kan herkennen en sluiten.
 */

/** auto_types waarvan auto_entity_id het program_requests.id is. */
export const REQUEST_BOUND_AUTO_TYPES = new Set([
  "request_no_response",
  "quote_pending_customer",
  "new_request_received",
  "new_program_request",
  "new_accommodation_request",
  "all_partners_responded",
  "customer_inputs_missing",
  "customer_date_change_partner_notify",
  "customer_cancellation",
  "send_items_to_partners",
  "invoicing_ready",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(s: string | null | undefined): s is string {
  return !!s && UUID_RE.test(s);
}

export interface TodoLinkLike {
  auto_type: string | null;
  auto_entity_id: string | null;
  related_request_id: string | null;
}

/**
 * Het project-id waar deze taak bij hoort: de expliciete koppeling, of — als
 * die door een verwijdering is weggevallen — het entity-id voor
 * project-gebonden types. Null als de taak niet aan een project hangt.
 */
export function requestIdForTodo(todo: TodoLinkLike): string | null {
  if (isUuid(todo.related_request_id)) return todo.related_request_id;
  if (
    todo.auto_type &&
    REQUEST_BOUND_AUTO_TYPES.has(todo.auto_type) &&
    isUuid(todo.auto_entity_id)
  ) {
    return todo.auto_entity_id;
  }
  return null;
}
