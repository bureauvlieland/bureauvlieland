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
    totalCost,
  };
};
