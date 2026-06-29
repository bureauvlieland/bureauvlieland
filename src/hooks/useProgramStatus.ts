import { useMemo } from "react";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";

interface ProgramForStatus {
  terms_accepted_at?: string;
  billing_company_name?: string;
  billing_address_street?: string;
  billing_address_postal?: string;
  billing_address_city?: string;
  billing_contact_name?: string;
  items: ProgramRequestItem[];
  quote_status?: string | null;
}

interface StatusSummary {
  total: number;
  confirmed: number;
  pending: number;
  alternative: number;
  progress: number;
  counter_proposed?: number;
}

export interface CustomerApprovalStats {
  customerActionsCount: number;
  proposalActionsCount: number;
  alternativeActionsCount: number;
  customerApprovedCount: number;
  customerApprovableTotal: number;
}

const isCustomerActionableCandidate = (i: ProgramRequestItem) =>
  i.block_type !== "self_arranged" &&
  i.status !== "cancelled";

const hasLiveCustomerApproval = (i: ProgramRequestItem) => {
  if (!i.customer_approved_at) return false;
  if (i.status !== "alternative") return true;
  // Klant heeft het alternatief opnieuw goedgekeurd nadat de aanbieder
  // het voorstel deed.
  const statusUpdatedAt = (i as any).status_updated_at as string | null | undefined;
  if (!statusUpdatedAt) return false;
  return new Date(i.customer_approved_at).getTime() >= new Date(statusUpdatedAt).getTime();
};

export const getCustomerApprovalStats = (
  items: ProgramRequestItem[],
  quoteStatus?: string | null,
): CustomerApprovalStats => {
  const isProposalPhase = quoteStatus === "offerte_verstuurd";
  const isApprovalPhase = quoteStatus === "akkoord_ontvangen";

  const customerActionableItems = items.filter(
    (i) =>
      isCustomerActionableCandidate(i) &&
      (isProposalPhase || i.status === "confirmed" || i.status === "alternative") &&
      !hasLiveCustomerApproval(i),
  );

  const customerApprovableTotal = items.filter(
    (i) =>
      isCustomerActionableCandidate(i) &&
      (isProposalPhase ||
        i.status === "confirmed" ||
        i.status === "alternative" ||
        !!i.customer_approved_at),
  ).length;

  const customerApprovedCount = items.filter(
    (i) => isCustomerActionableCandidate(i) && hasLiveCustomerApproval(i),
  ).length;

  const proposalActionsCount = customerActionableItems.length;

  return {
    customerActionsCount: (isProposalPhase || isApprovalPhase) ? proposalActionsCount : 0,
    proposalActionsCount,
    alternativeActionsCount: customerActionableItems.filter((i) => i.status === "alternative").length,
    customerApprovedCount,
    customerApprovableTotal,
  };
};

export const useProgramStatus = (
  program: ProgramForStatus,
  accommodationQuotes: AccommodationQuote[],
  statusSummary: StatusSummary,
  selectedDates: Date[],
) => {
  const termsAccepted = !!program.terms_accepted_at;

  const billingComplete = !!(
    program.billing_company_name &&
    program.billing_address_street &&
    program.billing_address_postal &&
    program.billing_address_city &&
    program.billing_contact_name
  );

  const allConfirmed = statusSummary.pending === 0 &&
    statusSummary.alternative === 0 &&
    (statusSummary.counter_proposed || 0) === 0 &&
    statusSummary.total > 0;

  const isMultiDay = selectedDates.length > 1;

  const hasSelectedAccommodation = accommodationQuotes.some(q => q.status === "selected");
  const hasActiveAccommodation = hasSelectedAccommodation || false; // caller can override with accommodation prop

  const isQuoteAwaitingApproval = program.quote_status === "offerte_verstuurd";

  const isPreApproval = !!program.quote_status &&
    ["concept", "in_afstemming", "offerte_verstuurd"].includes(program.quote_status);

  // Fase-flags (single source of truth voor portaal-UI).
  const isProposalPhase = program.quote_status === "offerte_verstuurd"; // fase 2
  const isApprovalPhase = program.quote_status === "akkoord_ontvangen"; // fase 3

  const {
    customerActionsCount,
    proposalActionsCount,
    alternativeActionsCount,
    customerApprovedCount,
    customerApprovableTotal,
  } = useMemo(
    () => getCustomerApprovalStats(program.items, program.quote_status),
    [program.items, program.quote_status],
  );

  const totalCost = useMemo(() => {
    let total = 0;
    program.items.forEach(item => {
      if (item.status !== "cancelled" && item.block_type !== "self_arranged" && item.quoted_price) {
        total += item.quoted_price;
      }
    });
    const selectedQuote = accommodationQuotes.find(q => q.status === "selected");
    if (selectedQuote) {
      total += selectedQuote.price_total;
    }
    return total;
  }, [program.items, accommodationQuotes]);

  return {
    termsAccepted,
    billingComplete,
    allConfirmed,
    isMultiDay,
    hasSelectedAccommodation,
    hasActiveAccommodation,
    isQuoteAwaitingApproval,
    isPreApproval,
    isProposalPhase,
    isApprovalPhase,
    totalCost,
    // Customer-action telstaten — single source of truth voor badges, strook en sidebar.
    customerActionsCount,
    proposalActionsCount,
    alternativeActionsCount,
    customerApprovedCount,
    customerApprovableTotal,
  };
};
