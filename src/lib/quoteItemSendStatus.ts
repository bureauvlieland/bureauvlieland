/**
 * Shared helpers for determining quote-aware item send status in admin views.
 */

export type QuoteItemSendPhase =
  | "wacht_op_klant"      // offerte sent, customer hasn't approved yet
  | "klaar_om_te_sturen"  // customer approved, admin can send to partners
  | "verstuurd";           // already sent to partners

export interface QuoteItemForStatus {
  status: string;
  skip_partner_notification: boolean | null;
  customer_approved_at?: string | null;
}

export interface ProgramForQuoteStatus {
  program_type?: string | null;
  quote_status?: string | null;
}

export function isQuoteOrMaatwerk(programType?: string | null): boolean {
  return programType === "quote" || !!programType?.startsWith("maatwerk_");
}

export function getQuoteItemSendPhase(
  item: QuoteItemForStatus,
  program: ProgramForQuoteStatus,
): QuoteItemSendPhase {
  if (!item.skip_partner_notification) return "verstuurd";
  
  const isQuote = isQuoteOrMaatwerk(program.program_type);
  
  if (isQuote && !item.customer_approved_at) {
    return "wacht_op_klant";
  }
  
  return "klaar_om_te_sturen";
}

export function countReadyToSend(
  items: QuoteItemForStatus[],
  program: ProgramForQuoteStatus,
): number {
  return items.filter(
    (i) => i.status !== "cancelled" && getQuoteItemSendPhase(i, program) === "klaar_om_te_sturen"
  ).length;
}

export function countWaitingForCustomer(
  items: QuoteItemForStatus[],
  program: ProgramForQuoteStatus,
): number {
  return items.filter(
    (i) => i.status !== "cancelled" && getQuoteItemSendPhase(i, program) === "wacht_op_klant"
  ).length;
}
