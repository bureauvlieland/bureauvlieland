// Statusstroom van inkoopfacturen die partners "via e-mail" registreren.
// Dependency-vrij zodat dit ook in node/vitest laadt zonder JSDOM.

export const PENDING_EMAIL_MATCH = "pending_email_match" as const;

export interface StatusFlowRow {
  status?: string | null;
  file_path?: string | null;
}

/**
 * Bepaalt of een factuur nog wacht op de PDF uit de inkoop-inbox.
 * Zodra de PDF gekoppeld is, hoort de factuur gewoon 'pending' te zijn.
 */
export function isAwaitingPdfMatch(row: StatusFlowRow): boolean {
  return row.status === PENDING_EMAIL_MATCH && !row.file_path;
}

/**
 * Geeft de nieuwe status terug wanneer er een PDF gekoppeld wordt,
 * of `null` wanneer de status ongewijzigd moet blijven.
 */
export function resolveStatusAfterPdfLink(
  currentStatus: string | null | undefined,
  hasPdf: boolean,
): "pending" | null {
  if (!hasPdf) return null;
  return currentStatus === PENDING_EMAIL_MATCH ? "pending" : null;
}

/**
 * Mag deze factuur mee in de doorstuur-/betaalstroom?
 * `pending_email_match` met PDF telt gewoon mee — anders vallen die facturen
 * stil uit de crediteurenstroom.
 */
export function isForwardableInvoice(row: StatusFlowRow): boolean {
  if (row.status === "pending" || row.status === "forwarded") return true;
  return row.status === PENDING_EMAIL_MATCH && !!row.file_path;
}

/** Aantal dagen dat een factuur al op de PDF wacht (voor waarschuwingskleur). */
export function daysAwaitingPdf(
  row: StatusFlowRow & { invoice_date?: string | null; created_at?: string | null },
  now: Date = new Date(),
): number | null {
  if (!isAwaitingPdfMatch(row)) return null;
  const ref = row.created_at || row.invoice_date;
  if (!ref) return null;
  const ts = new Date(ref).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor((now.getTime() - ts) / (1000 * 60 * 60 * 24));
}
