/**
 * Shared helpers for determining quote-aware item send status in admin views.
 * 
 * Since all projects now follow the uniform quote pipeline (concept → offerte_verstuurd → akkoord_ontvangen),
 * the isQuoteOrMaatwerk check is kept for backward compatibility but effectively always returns true
 * for projects with a quote_status.
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
  quote_status?: string | null;
}

export function getQuoteItemSendPhase(
  item: QuoteItemForStatus,
  program: ProgramForQuoteStatus,
): QuoteItemSendPhase {
  if (!item.skip_partner_notification) return "verstuurd";
  
  // If customer already approved this specific item, it's ready to send
  if (item.customer_approved_at) return "klaar_om_te_sturen";

  // If the overall quote is already approved, treat all items as ready to send
  const overallApproved = program.quote_status === "akkoord_ontvangen" 
    || program.quote_status === "definitief_bevestigd";
  if (overallApproved) return "klaar_om_te_sturen";

  // If quote has been sent to customer, items are waiting for approval
  if (program.quote_status === "offerte_verstuurd") return "wacht_op_klant";
  
  // Default: concept phase, items are ready to send (admin decides when)
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
