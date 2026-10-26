/**
 * Werkbank-taak voor een falende kritieke zelftest.
 *
 * Eén stabiele sleutel (auto_entity_id) in plaats van één per dag: zolang
 * dezelfde fout blijft bestaan wordt de bestaande open taak bijgewerkt, en
 * zodra de zelftest weer slaagt wordt de taak automatisch afgerond. Zo
 * stapelen er geen zes "Kritieke zelftest faalt"-regels op in de inbox.
 */

export const SELFTEST_TODO_TYPE = "critical_selftest_failure";
export const SELFTEST_TODO_ENTITY = "critical-selftest";

export interface FailedCheckLike {
  label: string;
  detail: string;
  fixHint?: string;
}

export interface SelftestTodoDraft {
  title: string;
  description: string;
}

export function buildSelftestTodo(failed: FailedCheckLike[]): SelftestTodoDraft {
  return {
    title: `Kritieke zelftest faalt: ${failed.map((f) => f.label).join(", ")}`,
    description: failed
      .map((f) => `• ${f.label}: ${f.detail}\n  Fix: ${f.fixHint ?? "—"}`)
      .join("\n"),
  };
}

export interface ExistingSelftestTodo {
  id: string;
  title: string;
  status: string;
}

export type SelftestTodoAction =
  | { kind: "update"; id: string }
  | { kind: "insert" }
  | { kind: "skip"; reason: "dismissed_same_failure" };

/**
 * Bepaalt wat er met de zelftest-taak moet gebeuren.
 *
 * - open taak (todo/in_progress) → bijwerken met de actuele fouten;
 * - laatst bekende taak is weggezet als "niet relevant" met dezelfde titel →
 *   niets doen (de beheerder heeft deze fout bewust genegeerd);
 * - anders → nieuwe taak.
 */
export function decideSelftestTodoAction(
  existing: ExistingSelftestTodo | null,
  draft: SelftestTodoDraft,
): SelftestTodoAction {
  if (!existing) return { kind: "insert" };
  if (existing.status === "todo" || existing.status === "in_progress") {
    return { kind: "update", id: existing.id };
  }
  if (existing.status === "dismissed" && existing.title === draft.title) {
    return { kind: "skip", reason: "dismissed_same_failure" };
  }
  return { kind: "insert" };
}
