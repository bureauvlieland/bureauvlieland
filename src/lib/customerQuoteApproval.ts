import type { ItemQuoteStatus, ProgramRequestItem } from "@/types/programRequest";

const customerQuoteApprovalStatuses: ItemQuoteStatus[] = ["in_afstemming", "bevestigd"];

export const isQuoteItemAwaitingCustomerApproval = (
  item: Pick<ProgramRequestItem, "status" | "item_quote_status" | "customer_approved_at">,
) => {
  if (item.status === "cancelled" || item.customer_approved_at || !item.item_quote_status) {
    return false;
  }

  const operationallyReady = item.status === "confirmed" || item.status === "alternative";
  return operationallyReady && customerQuoteApprovalStatuses.includes(item.item_quote_status);
};

export const hasQuoteItemsAwaitingCustomerApproval = (items: ProgramRequestItem[]) =>
  items.some(isQuoteItemAwaitingCustomerApproval);