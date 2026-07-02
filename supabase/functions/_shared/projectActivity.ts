// Deno-compatible port of src/lib/projectActivity.ts — keep behaviour in sync.

export const HOT_DAYS = 2;
export const WARM_DAYS = 7;

export type CooldownLevel = "hot" | "warm" | "cold";

export interface ProjectActivity {
  lastContactAt: string | null;
  daysSinceContact: number | null;
  cooldown: CooldownLevel;
}

export function getProjectActivityState(
  lastContactAt: string | null | undefined,
  now: Date = new Date(),
): ProjectActivity {
  if (!lastContactAt) {
    return { lastContactAt: null, daysSinceContact: null, cooldown: "cold" };
  }
  const t = new Date(lastContactAt).getTime();
  if (Number.isNaN(t)) {
    return { lastContactAt: null, daysSinceContact: null, cooldown: "cold" };
  }
  const days = (now.getTime() - t) / 86_400_000;
  const cooldown: CooldownLevel =
    days <= HOT_DAYS ? "hot" : days <= WARM_DAYS ? "warm" : "cold";
  return {
    lastContactAt: new Date(t).toISOString(),
    daysSinceContact: days,
    cooldown,
  };
}

const SUPPRESS_IN_HOT = new Set<string>([
  "partner_overdue",
  "lodging_no_quotes",
  "lodging_quote_unforwarded",
  "todo_overdue",
]);

const SUPPRESS_IN_WARM = new Set<string>([
  "partner_overdue",
  "lodging_no_quotes",
]);

/**
 * Project-level cooldown filter voor Claudia-signalen.
 * Snooze (snoozed_until > now) → altijd onderdrukken (info kan blijven via aparte check).
 */
export function shouldShowSignalDuringCooldown(
  cooldown: CooldownLevel,
  category: string,
): boolean {
  if (cooldown === "cold") return true;
  if (cooldown === "hot" && SUPPRESS_IN_HOT.has(category)) return false;
  if (cooldown === "warm" && SUPPRESS_IN_WARM.has(category)) return false;
  return true;
}

export const TERMINAL_COMPLETION_STATUSES = new Set<string>([
  "ready_for_invoice",
  "partially_invoiced",
  "fully_invoiced",
  "invoiced",
  "completed",
  "feedback_received",
  "cancelled",
]);

/**
 * Bepaal snooze-datum voor een facturatie-todo: laatste event-datum + 1 dag.
 * Returned ISO-date (YYYY-MM-DD) of null als er geen bruikbare datum bekend is
 * of de datum al gepasseerd is (dan is snoozen niet zinvol).
 */
export function computeInvoicingSnooze(
  selectedDates: unknown,
  today: Date = new Date(),
): string | null {
  if (!Array.isArray(selectedDates) || selectedDates.length === 0) return null;
  const times = selectedDates
    .map((d) => new Date(String(d)).getTime())
    .filter((t) => !Number.isNaN(t));
  if (times.length === 0) return null;
  const last = new Date(Math.max(...times));
  last.setDate(last.getDate() + 1);
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);
  if (last.getTime() <= todayMidnight.getTime()) return null;
  return last.toISOString().slice(0, 10);
}
