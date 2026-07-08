/**
 * Project execution state — pure helper that answers:
 * "Is deze project-datum al voorbij, en welke acties zijn dan nog relevant?"
 *
 * Wordt gebruikt door:
 *  - klant-portaal (om goedkeur-callouts te onderdrukken zodra uitvoering voorbij is)
 *  - admin todo-lijst / edge function `auto-close-past-execution`
 *  - partner-portaal (om reageren op aanvragen te verbergen voor verleden projecten)
 */

export type ProjectExecutionState = "future" | "in_progress" | "past_execution";

export interface ProjectExecutionInput {
  selected_dates?: string[] | null;
  cancelled_at?: string | null;
  completion_status?: string | null;
}

/**
 * Parse loose date strings (ISO of vrije NL tekst) naar Date. Retourneert `null`
 * als het niet lukt — dan tellen we die datum niet mee.
 */
function parseLooseDate(value: string): Date | null {
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  return null;
}

function lastValidDate(dates: string[] | null | undefined): Date | null {
  if (!Array.isArray(dates) || dates.length === 0) return null;
  const parsed = dates
    .map(parseLooseDate)
    .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
  if (parsed.length === 0) return null;
  return parsed.reduce((max, cur) => (cur.getTime() > max.getTime() ? cur : max), parsed[0]);
}

function startOfDay(d: Date): Date {
  const copy = new Date(d.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Bepaal of een project nog moet starten, in uitvoering is, of achter ons ligt.
 *
 * - `cancelled_at` of `completion_status` in ("ready_for_invoice", "partially_invoiced",
 *   "fully_invoiced") → geen "past_execution" trigger nodig (workflow al elders geregeld).
 * - Geen bruikbare datum → altijd `future` (we willen niets forceren).
 * - Laatste datum ≥ vandaag → `future` als eerste datum in toekomst, anders `in_progress`.
 * - Laatste datum < vandaag → `past_execution`.
 */
export function getProjectExecutionState(
  project: ProjectExecutionInput,
  now: Date = new Date(),
): ProjectExecutionState {
  if (project.cancelled_at) return "future"; // geannuleerd — auto-close overslaan
  if (
    project.completion_status === "ready_for_invoice" ||
    project.completion_status === "partially_invoiced" ||
    project.completion_status === "fully_invoiced"
  ) {
    // Al door naar facturatie-fase — auto-close is klaar met dit project.
    return "past_execution";
  }

  const last = lastValidDate(project.selected_dates);
  if (!last) return "future";

  const today = startOfDay(now);
  const lastDay = startOfDay(last);

  if (lastDay.getTime() < today.getTime()) return "past_execution";

  // Vind ook eerste datum om te weten of we al bezig zijn.
  const dates = (project.selected_dates ?? [])
    .map(parseLooseDate)
    .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
  const first = dates.reduce((min, cur) => (cur.getTime() < min.getTime() ? cur : min), dates[0]);
  if (startOfDay(first).getTime() <= today.getTime()) return "in_progress";
  return "future";
}

/**
 * Whitelist van `admin_todos.auto_type` waarden die alleen zin hebben *vóór*
 * uitvoering. Voor projecten in `past_execution` mogen deze automatisch worden
 * afgesloten door `auto-close-past-execution`.
 *
 * BEWUST NIET in deze lijst (mogen open blijven na uitvoering):
 *   - customer_billing_missing   → gegevens facturatie
 *   - customer_terms_missing     → voorwaarden ondertekenen
 *   - partner_invoice_pending    → inkoopfactuur wacht op partner
 *   - commission_pending         → commissie moet nog worden bevestigd
 *   - bureau_invoice_pending     → verkoopfactuur klaarzetten
 *   - customer_aftersales / feedback_collect → reviews & nazorg
 *   - partner_post_charge        → nafactureren
 */
export const PRE_EXECUTION_TODO_TYPES: readonly string[] = [
  "quote_pending_partner",
  "quote_pending_customer",
  "quote_expiring_soon",
  "quote_expired_partner",
  "request_no_response",
  "all_partners_responded",
  "customer_date_change_partner_notify",
  "customer_cancellation",
  "new_program_request",
  "new_accommodation_request",
  "new_request_received",
  "customer_inputs_missing",
  "stale_pending_change",
  "book_ferry_tickets",
] as const;

export function isPreExecutionTodoType(autoType: string | null | undefined): boolean {
  if (!autoType) return false;
  return PRE_EXECUTION_TODO_TYPES.includes(autoType);
}

/**
 * Statuses op `program_request_items` die "wacht op iemand" betekenen en die we
 * na uitvoering automatisch als bevestigd (of geannuleerd) behandelen.
 */
export const OPEN_ITEM_STATUSES_TO_FORCE = ["pending", "alternative"] as const;
