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
  "invoiced",
  "completed",
  "feedback_received",
  "cancelled",
]);
