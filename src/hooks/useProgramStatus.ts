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

  // Fase-flags (single source of truth voor portaal-UI).
  const isProposalPhase = program.quote_status === "offerte_verstuurd"; // fase 2
  const isApprovalPhase = program.quote_status === "akkoord_ontvangen"; // fase 3

  // Bureau-onderdelen zijn per definitie akkoord (Bureau Vlieland regelt het zelf).
  // De klant hoeft daar nooit op te klikken — ze tellen dus niet mee in actie-tellers.
  const isCustomerActionableCandidate = (i: ProgramRequestItem) =>
    i.block_type !== "self_arranged" &&
    i.provider_id !== "bureau" &&
    i.status !== "cancelled";

  // Items waar de klant NU akkoord op kan geven.
  // Pending items = wacht op partner — daar kan de klant niets aan doen.
  const customerActionableItems = useMemo(
    () =>
      program.items.filter(
        (i) =>
          isCustomerActionableCandidate(i) &&
          (i.status === "confirmed" || i.status === "alternative") &&
          !i.customer_approved_at,
      ),
    [program.items],
  );
  const proposalActionsCount = customerActionableItems.length;

  // Totaal te accorderen onderdelen (noemer voor "x van y").
  // Een item telt mee zodra de klant er iets over kan/heeft kunnen zeggen:
  // - status confirmed/alternative (klant kan nu akkoord geven), OF
  // - customer_approved_at gezet (klant heeft al akkoord gegeven, ook al staat
  //   het item nu op 'pending' omdat we op partner-bevestiging wachten).
  const customerApprovableTotal = useMemo(
    () =>
      program.items.filter(
        (i) =>
          isCustomerActionableCandidate(i) &&
          (i.status === "confirmed" ||
            i.status === "alternative" ||
            !!i.customer_approved_at),
      ).length,
    [program.items],
  );
  // Teller op basis van customer_approved_at — robuust ongeacht latere status-wijzigingen.
  const customerApprovedCount = useMemo(
    () =>
      program.items.filter(
        (i) => isCustomerActionableCandidate(i) && !!i.customer_approved_at,
      ).length,
    [program.items],
  );

  const alternativeActionsCount = customerActionableItems.filter(
    (i) => i.status === "alternative",
  ).length;

  // Single source of truth voor "wat moet de klant nu doen op deze tab".
  // In fase 2 (voorstel) zit de actie bovenaan (bulk-akkoord), niet per item.
  const customerActionsCount = isApprovalPhase ? proposalActionsCount : 0;

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
