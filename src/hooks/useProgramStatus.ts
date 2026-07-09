import { useMemo } from "react";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";
import {
  getCustomerApprovalStats as getCanonicalCustomerApprovalStats,
  getCustomerPortalStatus,
  type CustomerPortalGuestDetailsLike,
} from "@/lib/customerPortalStatus";

interface ProgramForStatus {
  terms_accepted_at?: string;
  billing_company_name?: string;
  billing_address_street?: string;
  billing_address_postal?: string;
  billing_address_city?: string;
  billing_contact_name?: string;
  items: ProgramRequestItem[];
  quote_status?: string | null;
  selected_dates?: string[] | null;
  completion_status?: string | null;
  cancelled_at?: string | null;
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

export const getCustomerApprovalStats = (
  items: ProgramRequestItem[],
  quoteStatus?: string | null,
): CustomerApprovalStats => {
  return getCanonicalCustomerApprovalStats(items, quoteStatus);
};

export const useProgramStatus = (
  program: ProgramForStatus,
  accommodationQuotes: AccommodationQuote[],
  statusSummary: StatusSummary,
  selectedDates: Date[],
  options: { hasAccommodationRequest?: boolean; guestDetails?: CustomerPortalGuestDetailsLike | null } = {},
) => {
  const portalStatus = useMemo(
    () => getCustomerPortalStatus({
      program,
      items: program.items,
      accommodationQuotes,
      selectedDates,
      hasAccommodationRequest: options.hasAccommodationRequest,
      guestDetails: options.guestDetails,
    }),
    [program, accommodationQuotes, selectedDates, options.hasAccommodationRequest, options.guestDetails],
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
    ...portalStatus,
    totalCost,
  };
};
