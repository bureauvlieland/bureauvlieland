// Automatische mails aan de klant om de algemene voorwaarden te ondertekenen.
// Gebruikt door check-pending-items (dagelijkse cron).
//
// Volgorde per project:
//  - customer_terms_request       zodra alles bevestigd is (eerste verzoek)
//  - customer_terms_reminder_t14  vanaf 14 dagen voor de eerste datum
//  - customer_terms_reminder_t7   vanaf 7 dagen voor de eerste datum
//  - customer_terms_reminder_t3   vanaf 3 dagen voor de eerste datum
//
// We sturen per run hooguit één mail: de meest urgente fase die al bereikt is.
// Is die al verstuurd, dan niets (een oudere fase alsnog sturen heeft geen zin).
// Tussen twee mails zitten minimaal MIN_DAYS_BETWEEN_TERMS_MAILS dagen.

export const TERMS_MAIL_TYPES = [
  "customer_terms_request",
  "customer_terms_reminder_t14",
  "customer_terms_reminder_t7",
  "customer_terms_reminder_t3",
] as const;
export type TermsMailType = typeof TERMS_MAIL_TYPES[number];

export const MIN_DAYS_BETWEEN_TERMS_MAILS = 2;

const STAGES: Array<{ type: TermsMailType; maxDaysUntil: number }> = [
  { type: "customer_terms_reminder_t3", maxDaysUntil: 3 },
  { type: "customer_terms_reminder_t7", maxDaysUntil: 7 },
  { type: "customer_terms_reminder_t14", maxDaysUntil: 14 },
  { type: "customer_terms_request", maxDaysUntil: Infinity },
];

export interface TermsItemLike {
  status: string;
  block_type?: string | null;
  day_index?: number | null;
  item_quote_status?: string | null;
}

/**
 * Zijn alle onderdelen die de klant moet tekenen bevestigd? Spiegelt
 * `isItemConfirmedForTerms` uit het klantportaal; bureau-onderdelen worden
 * door de aanroeper via `isBureau` doorgegeven.
 */
export function allItemsConfirmedForTerms<T extends TermsItemLike>(
  items: T[],
  isBureau: (item: T) => boolean = () => false,
): boolean {
  const relevant = items.filter(
    (i) =>
      i.status !== "cancelled" &&
      i.status !== "unavailable" &&
      i.block_type !== "self_arranged" &&
      i.day_index !== -1,
  );
  if (relevant.length === 0) return false;
  return relevant.every(
    (i) =>
      isBureau(i) ||
      ["confirmed", "accepted", "executed", "invoiced"].includes(i.status) ||
      i.item_quote_status === "bevestigd",
  );
}

/**
 * Welke voorwaarden-mail moet er nu uit? `null` = niets sturen.
 * @param daysUntilEvent hele dagen tot de eerste programmadatum (0 = vandaag)
 * @param sent verstuurde mails voor dit project: type + tijdstip
 */
export function pickTermsMail(
  daysUntilEvent: number,
  sent: Array<{ type: string; at: string }>,
  now: Date = new Date(),
): TermsMailType | null {
  if (daysUntilEvent < 0) return null;

  const lastAt = sent.reduce((max, s) => Math.max(max, new Date(s.at).getTime()), 0);
  if (lastAt && now.getTime() - lastAt < MIN_DAYS_BETWEEN_TERMS_MAILS * 24 * 60 * 60 * 1000) {
    return null;
  }

  const stage = STAGES.find((s) => daysUntilEvent <= s.maxDaysUntil);
  if (!stage) return null;
  if (sent.some((s) => s.type === stage.type)) return null;
  return stage.type;
}
