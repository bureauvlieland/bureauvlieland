import type { AccommodationQuote } from "@/types/accommodation";
import type { ProgramRequestItem } from "@/types/programRequest";
import { getProjectExecutionState, type ProjectExecutionState } from "@/lib/projectExecutionState";

export interface CustomerPortalProgramLike {
  terms_accepted_at?: string | null;
  billing_company_name?: string | null;
  billing_address_street?: string | null;
  billing_address_postal?: string | null;
  billing_address_city?: string | null;
  billing_contact_name?: string | null;
  quote_status?: string | null;
  selected_dates?: string[] | null;
  completion_status?: string | null;
  cancelled_at?: string | null;
}

export interface CustomerPortalGuestDetailsLike {
  guest_names?: string | null;
  dietary_notes?: string | null;
  room_assignment?: string | null;
  showDietary?: boolean;
  showRoomAssignment?: boolean;
}

export interface CustomerPortalStatus {
  executionState: ProjectExecutionState;
  isPostExecution: boolean;
  termsAccepted: boolean;
  billingComplete: boolean;
  guestDetailsIncomplete: boolean;
  isMultiDay: boolean;
  hasSelectedAccommodation: boolean;
  hasActiveAccommodation: boolean;
  isQuoteAwaitingApproval: boolean;
  isPreApproval: boolean;
  isProposalPhase: boolean;
  isApprovalPhase: boolean;
  allConfirmed: boolean;
  customerActionsCount: number;
  proposalActionsCount: number;
  alternativeActionsCount: number;
  customerApprovedCount: number;
  customerApprovableTotal: number;
  showApprovalActions: boolean;
  showPartnerWaiting: boolean;
}

const POST_EXECUTION_COMPLETION_STATUSES = new Set([
  "ready_for_invoice",
  "partially_invoiced",
  "fully_invoiced",
  "completed",
]);

function toExecutionDateValues(
  programDates: string[] | null | undefined,
  selectedDates: Date[] | null | undefined,
): string[] | null {
  if (Array.isArray(programDates) && programDates.length > 0) return programDates;
  if (Array.isArray(selectedDates) && selectedDates.length > 0) {
    return selectedDates.map((d) => d.toISOString());
  }
  return null;
}

export const isCustomerActionableCandidate = (item: ProgramRequestItem) =>
  item.block_type !== "self_arranged" && item.status !== "cancelled";

export const hasLiveCustomerApproval = (item: ProgramRequestItem): boolean => {
  if (!item.customer_approved_at) return false;
  if (item.status !== "alternative") return true;
  const statusUpdatedAt = (item as any).status_updated_at as string | null | undefined;
  if (!statusUpdatedAt) return false;
  return new Date(item.customer_approved_at).getTime() >= new Date(statusUpdatedAt).getTime();
};

export function getCustomerApprovalStats(
  items: ProgramRequestItem[],
  quoteStatus?: string | null,
  options: { suppressApprovalActions?: boolean } = {},
) {
  const isProposalPhase = quoteStatus === "offerte_verstuurd";
  const isApprovalPhase = quoteStatus === "akkoord_ontvangen";

  const customerActionableItems = options.suppressApprovalActions
    ? []
    : items.filter(
        (item) =>
          isCustomerActionableCandidate(item) &&
          (isProposalPhase || item.status === "confirmed" || item.status === "alternative") &&
          !hasLiveCustomerApproval(item),
      );

  const customerApprovableTotal = options.suppressApprovalActions
    ? items.filter(isCustomerActionableCandidate).length
    : items.filter(
        (item) =>
          isCustomerActionableCandidate(item) &&
          (isProposalPhase ||
            item.status === "confirmed" ||
            item.status === "alternative" ||
            !!item.customer_approved_at),
      ).length;

  const customerApprovedCount = options.suppressApprovalActions
    ? customerApprovableTotal
    : items.filter((item) => isCustomerActionableCandidate(item) && hasLiveCustomerApproval(item)).length;

  const proposalActionsCount = customerActionableItems.length;

  return {
    customerActionsCount: !options.suppressApprovalActions && (isProposalPhase || isApprovalPhase)
      ? proposalActionsCount
      : 0,
    proposalActionsCount,
    alternativeActionsCount: customerActionableItems.filter((item) => item.status === "alternative").length,
    customerApprovedCount,
    customerApprovableTotal,
  };
}

export function getCustomerPortalStatus(args: {
  program: CustomerPortalProgramLike;
  items: ProgramRequestItem[];
  accommodationQuotes?: AccommodationQuote[];
  selectedDates?: Date[];
  hasAccommodationRequest?: boolean;
  guestDetails?: CustomerPortalGuestDetailsLike | null;
}) : CustomerPortalStatus {
  const { program, items, accommodationQuotes = [], selectedDates = [], guestDetails = null } = args;
  const executionState = getProjectExecutionState({
    selected_dates: toExecutionDateValues(program.selected_dates, selectedDates) ?? undefined,
    completion_status: program.completion_status ?? null,
    cancelled_at: program.cancelled_at ?? null,
  });
  const isPostExecution =
    executionState === "past_execution" ||
    POST_EXECUTION_COMPLETION_STATUSES.has(program.completion_status ?? "");

  const termsAccepted = !!program.terms_accepted_at;
  const billingComplete = !!(
    program.billing_company_name &&
    program.billing_address_street &&
    program.billing_address_postal &&
    program.billing_address_city &&
    program.billing_contact_name
  );
  const isMultiDay = selectedDates.length > 1;
  const hasSelectedAccommodation = accommodationQuotes.some((q) => q.status === "selected");
  const hasActiveAccommodation = hasSelectedAccommodation || !!args.hasAccommodationRequest;
  const isProposalPhase = program.quote_status === "offerte_verstuurd";
  const isApprovalPhase = program.quote_status === "akkoord_ontvangen";
  const isPreApproval = !!program.quote_status &&
    ["concept", "in_afstemming", "offerte_verstuurd"].includes(program.quote_status);

  const rawAllConfirmed = items.some((item) => item.status !== "cancelled") &&
    items.every((item) =>
      item.status === "cancelled" ||
      item.status === "confirmed" ||
      item.status === "accepted" ||
      item.status === "executed" ||
      item.status === "invoiced" ||
      item.item_quote_status === "bevestigd",
    );
  const allConfirmed = isPostExecution || rawAllConfirmed;
  const showApprovalActions = !isPostExecution;
  const showPartnerWaiting = !isPostExecution;
  const approvalStats = getCustomerApprovalStats(items, program.quote_status, {
    suppressApprovalActions: !showApprovalActions,
  });
  const guestDetailsIncomplete = !!guestDetails && (
    !guestDetails.guest_names ||
    (!!guestDetails.showDietary && !guestDetails.dietary_notes) ||
    (!!guestDetails.showRoomAssignment && !guestDetails.room_assignment)
  );

  return {
    executionState,
    isPostExecution,
    termsAccepted,
    billingComplete,
    guestDetailsIncomplete,
    isMultiDay,
    hasSelectedAccommodation,
    hasActiveAccommodation,
    isQuoteAwaitingApproval: isProposalPhase,
    isPreApproval,
    isProposalPhase,
    isApprovalPhase,
    allConfirmed,
    showApprovalActions,
    showPartnerWaiting,
    ...approvalStats,
  };
}