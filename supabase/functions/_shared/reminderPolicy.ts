/**
 * Mag een herinneringsmail (check-pending-items) nog een keer?
 *
 * Tot november 2026 was de regel "niet twee keer binnen zeven dagen", zonder
 * plafond. Daardoor kreeg een partner voor één factuur elke week opnieuw
 * T+3 én T+7, maandenlang (docs/plan-notificaties.md, 3.3). Nu:
 *
 *  - een reeks met vaste momenten (factuur T+3, T+7, T+14) stuurt elk type
 *    precies één keer per onderdeel en adres: `maxSends` 1 (standaard);
 *  - een herhalende herinnering (activiteit nog open, logiesofferte nog niet
 *    binnen) mag elke `repeatDays` dagen opnieuw, tot `maxSends` keer.
 *
 * De eerdere verzendingen komen uit email_log; wie ze ophaalt hoeft alleen
 * de nieuwste `maxSends` rijen te lezen.
 */

export interface ReminderPolicy {
  /** Hoe vaak dit type voor dit onderdeel en adres in totaal mag gaan. */
  maxSends?: number;
  /** Minimale afstand tussen twee verzendingen, in dagen; weglaten = één keer. */
  repeatDays?: number;
}

export const DEFAULT_REMINDER_POLICY: Required<ReminderPolicy> = {
  maxSends: 1,
  repeatDays: 0,
};

export interface ReminderDecision {
  send: boolean;
  reason: "eerste_keer" | "herhaling" | "plafond_bereikt" | "te_recent";
}

/**
 * @param priorSentAt tijdstippen van eerdere verzendingen (volgorde maakt niet uit)
 */
export function decideReminder(
  priorSentAt: ReadonlyArray<string | Date>,
  policy: ReminderPolicy = {},
  now: Date = new Date(),
): ReminderDecision {
  const maxSends = Math.max(1, policy.maxSends ?? DEFAULT_REMINDER_POLICY.maxSends);
  const repeatDays = policy.repeatDays ?? DEFAULT_REMINDER_POLICY.repeatDays;

  const times = priorSentAt
    .map((t) => new Date(t).getTime())
    .filter((t) => !Number.isNaN(t));

  if (times.length === 0) return { send: true, reason: "eerste_keer" };
  if (times.length >= maxSends) return { send: false, reason: "plafond_bereikt" };
  if (repeatDays <= 0) return { send: false, reason: "plafond_bereikt" };

  const newest = Math.max(...times);
  const ageDays = (now.getTime() - newest) / 86_400_000;
  if (ageDays < repeatDays) return { send: false, reason: "te_recent" };
  return { send: true, reason: "herhaling" };
}
