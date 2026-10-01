import { useState, useMemo, useRef } from "react";
import { resolveFeeStructure } from "@/lib/feeEngine";
import { usePricingStructures } from "@/hooks/usePricing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProgramSidebar } from "./ProgramSidebar";
import { ProgramStepper, type StepId } from "./ProgramStepper";
import { type PortalView } from "./ProgramNavigation";
import { useFloatingBar } from "@/hooks/useFloatingLayer";
import { Container, EmptyState } from "@/components/system";
import { AcceptTermsCard } from "./AcceptTermsCard";
import { AcceptedTermsCard, type AcceptedTermsEntry } from "./AcceptedTermsCard";
import { ProgramIntroCard } from "./ProgramIntroCard";
import { ProposalHeroCard } from "./ProposalHeroCard";

import { ProgramHistoryTimeline } from "./ProgramHistoryTimeline";
import { CustomerTimeline } from "./CustomerTimeline";
import { AddActivitySheet } from "./AddActivitySheet";
import { PaymentStatusCard } from "./PaymentStatusCard";
import { AccommodationSection } from "./AccommodationSection";

import { ProgramOverviewCard } from "./ProgramOverviewCard";
import { ActionRequiredCard } from "./ActionRequiredCard";
import { ReviewInviteCard } from "./ReviewInviteCard";
import { CompactBillingSection } from "./CompactBillingSection";
import { PracticalView } from "./PracticalView";

import { AcceptView } from "./AcceptView";
import { TabHeader } from "./TabHeader";
import { buildTabHeader } from "./tabHeaderConfig";
import { CustomerProgramItem } from "./CustomerProgramItem";
import { DayTabs } from "@/components/configurator/DayTabs";
import { useItemVatRates } from "@/hooks/useItemVatRates";
import { useProgramStatus } from "@/hooks/useProgramStatus";
import { hasQuoteItemsAwaitingCustomerApproval } from "@/lib/customerQuoteApproval";
import { isMaatwerkProject } from "@/lib/projectOrigin";
import { getCustomerActionableItems } from "@/lib/customerPortalStatus";
import {
  Calendar,
  Settings,
  History,
  Mail,
  Phone,
  Pencil,
  Building2,
  Send,
  Plus,
  BedDouble,
  MoreHorizontal,
  Download,
  
  CalendarPlus,
  Sparkles,
  ThumbsUp,
  AlertTriangle,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProgramRequestItem, ProgramRequestHistory, ProgramRequestWithItems } from "@/types/programRequest";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";
import { calculateExclVat } from "@/lib/appSettings";
import { getItemEffectivePrice } from "@/lib/portalPricing";
import { ProgramPdfDownload } from "./ProgramPdfDownload";
import { downloadAllEvents } from "@/lib/calendarExport";

interface DesktopProgramViewProps {
  invoicingMode?: string;
  /** De ingevulde beoordeling van de klant (fase 4), voor de kaart na afloop. */
  customerReview?: { created_at: string; google_clicked_at: string | null } | null;
  initialSection?: "accommodation" | "program" | "practical" | "billing" | "accept";
  program: {
    customer_name: string;
    customer_company?: string;
    customer_email: string;
    review_token?: string | null;
    customer_phone: string;
    customer_token?: string;
    number_of_people: number;
    items: ProgramRequestItem[];
    terms_accepted_at?: string;
    signature_name?: string;
    signature_id?: string;
    billing_company_name?: string;
    billing_address_street?: string;
    billing_address_postal?: string;
    billing_address_city?: string;
    billing_contact_name?: string;
    billing_kvk_number?: string;
    billing_vat_number?: string;
    billing_contact_email?: string;
    billing_reference?: string;
    acceptedTerms?: AcceptedTermsEntry[];
    reference_number?: string | null;
    // Quote mode fields
    origin?: string | null;
    quote_status?: string | null;
    excluded_fees?: string[] | null;
    quote_valid_until?: string | null;
    // Program description
    program_description?: string | null;
    program_published_at?: string | null;
    selected_dates?: string[] | null;
    completion_status?: string | null;
    cancelled_at?: string | null;
  };
  history: ProgramRequestHistory[];
  selectedDates: Date[];
  statusSummary: {
    total: number;
    confirmed: number;
    pending: number;
    alternative: number;
    progress: number;
    counter_proposed?: number;
  };
  activeDay: number;
  onDayChange: (day: number) => void;
  itemCountPerDay: number[];
  getItemsForDay: (dayIndex: number) => ProgramRequestItem[];
  pendingChanges: { itemId: string }[];
  hasChanges: boolean;
  pendingRemovals?: Set<string>;
  isPendingRemoval?: (itemId: string) => boolean;
  onUpdateItem: (itemId: string, updates: Partial<ProgramRequestItem>) => void;
  onRemoveItem: (itemId: string) => void;

  onAcceptItem: (itemId: string) => Promise<boolean>;
  onCounterProposal: (itemId: string, counterTime: string, counterNote: string) => Promise<boolean>;
  onOpenBilling: () => void;
  onOpenEdit: () => void;
  onOpenAccommodationSetup?: () => void;
  onOpenCancel: () => void;
  onSubmitChanges: () => void;
  onRefresh: () => void;
  onAcceptTerms: (signatureName: string, underReservation?: boolean) => Promise<boolean>;
  onAddActivity: (blockId: string) => void;
  // Accommodation
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
  accommodationExtrasByQuoteId?: Record<string, any[]>;
  onSelectAccommodationQuote: (quoteId: string, signatureName: string, acceptedTerms: boolean) => Promise<boolean>;
  // Quote proposal
  onAcceptQuoteProposal: () => Promise<boolean>;
  onApproveQuoteItem: (itemId: string) => Promise<boolean>;
  onBulkApproveQuoteItems?: () => Promise<{ approved: number; failed: number; autoSentToPartner: number }>;
  // Guest details
  onOpenGuestDetails?: () => void;
  guestDetails?: {
    guest_names: string | null;
    dietary_notes: string | null;
    room_assignment: string | null;
    updated_at: string | null;
    showDietary: boolean;
    showRoomAssignment: boolean;
  };
  // Pre-resolved server data from get-customer-program edge function
  billingLinesByItem?: Record<string, any[]>;
  blockVatRates?: Record<string, number>;
  /** Som van billable wijzigingsrondes (uit get-customer-program). */
  revisionFeesTotal?: number;
  /** Naar een weergave; met `anchor` daarna naar dat element scrollen. */
  onNavigate?: (view: PortalView, anchor?: string) => void;
}

export const DesktopProgramView = ({
  customerReview,
  invoicingMode,
  initialSection,
  program,
  history,
  selectedDates,
  statusSummary,
  activeDay,
  onDayChange,
  itemCountPerDay,
  getItemsForDay,
  pendingChanges,
  hasChanges,
  pendingRemovals,
  isPendingRemoval,
  onUpdateItem,
  onRemoveItem,
  onAcceptItem,
  onCounterProposal,

  onOpenBilling,
  onOpenEdit,
  onOpenAccommodationSetup,
  onOpenCancel,
  onSubmitChanges,
  onRefresh,
  onAcceptTerms,
  onAddActivity,
  accommodation,
  accommodationQuotes,
  accommodationExtrasByQuoteId,
  onSelectAccommodationQuote,
  onAcceptQuoteProposal,
  onApproveQuoteItem,
  onBulkApproveQuoteItems,
  onOpenGuestDetails,
  guestDetails,
  billingLinesByItem,
  blockVatRates,
  revisionFeesTotal,
  onNavigate,
}: DesktopProgramViewProps) => {
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Organisatiefee 2.0: reken met dezelfde (snapshot-)structuur als de admin-factuur,
  // zodat het klanttotaal nooit afwijkt van de factuur.
  const { activeStructure } = usePricingStructures();
  const feeStructure = useMemo(
    () => resolveFeeStructure((program as any).fee_snapshot, activeStructure),
    [program, activeStructure],
  );
  const requestDate = (program as any).created_at ?? null;
  const arrivalDate = useMemo(() => {
    if (!selectedDates?.length) return null;
    const first = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())[0];
    return first ? first.toISOString() : null;
  }, [selectedDates]);


  const isPublished = !!program.program_published_at;
  const isQuoteMode = true; // All projects use unified quote pipeline
  const hasUnapprovedItems = hasQuoteItemsAwaitingCustomerApproval(program.items);
  const isProposalPhase = program.quote_status === "offerte_verstuurd";
  const activeItems = program.items.filter((i) => i.status !== "cancelled");
  const bureauItemCount = activeItems.filter((i) => i.provider_id === "bureau").length;
  const partnerItemCount = activeItems.length - bureauItemCount;


  const { getItemVatRate } = useItemVatRates(program.items, blockVatRates);
  const {
    termsAccepted,
    billingComplete,
    allConfirmed,
    canAcceptUnderReservation,
    isMultiDay,
    hasSelectedAccommodation,
    isQuoteAwaitingApproval,
    isPreApproval,
    totalCost,
    customerActionsCount,
    alternativeActionsCount,
    newItemActionsCount,
    customerApprovedCount,
    customerApprovableTotal: customerApprovableCount,
    isPostExecution,
  } = useProgramStatus(program, accommodationQuotes, statusSummary, selectedDates);

  // De opslaanbalk is een vaste balk onderaan; hij meldt zijn hoogte, zodat de
  // chatknop erboven staat en de inhoud er niet onder verdwijnt (pb-floating).
  const saveBarRef = useRef<HTMLDivElement>(null);
  useFloatingBar(saveBarRef, hasChanges && isPublished && !isPostExecution);

  // De ankers staan op verschillende tabbladen; via onNavigate eerst daarheen.
  const goToAnchor = (view: PortalView, anchor: string) => {
    if (onNavigate) onNavigate(view, anchor);
    else document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
  };
  // Hide "Logies nog niet geregeld" banner if there's an active accommodation request OR a selected quote
  const hasActiveAccommodation = hasSelectedAccommodation || !!accommodation;

  const scrollToTerms = () => goToAnchor("accept", "terms-section");
  const scrollToAccommodation = () => goToAnchor("accommodation", "accommodation");

  const accommodationStatus: "none" | "requested" | "selected" =
    accommodationQuotes.some((q) => q.status === "selected")
      ? "selected"
      : accommodation
        ? "requested"
        : "none";

  const handleStepAction = (stepId: StepId) => {
    if (stepId === "lodging") {
      scrollToAccommodation();
    } else if (stepId === "providers" || stepId === "approve") {
      goToAnchor("program", "program");
    } else if (stepId === "billing_terms") {
      if (!billingComplete) onOpenBilling();
      else scrollToTerms();
    }
  };

  const tabSection = initialSection ?? "program";
  const tabHeaderConfig = buildTabHeader({
    section: tabSection,
    statusSummary,
    accommodationQuotes,
    hasAccommodationRequest: !!accommodation,
    billingComplete,
    termsAccepted,
    customerApprovedCount,
    customerApprovableCount,
    customerActionsCount,
    quoteStatus: program.quote_status,
    isPostExecution,
  });

  return (
    <div className="grid grid-cols-[1fr,320px] gap-8">
      {/* Main content */}
      <div className="space-y-6">
        {/* Tab-eigen header — vertelt direct WAT deze tab is en de status van dít onderwerp */}
        <TabHeader
          {...tabHeaderConfig}
          selectedDates={selectedDates}
          numberOfPeople={program.number_of_people}
          referenceNumber={program.reference_number}
        />

        {/* Voortgang-stepper is verplaatst naar de rechter sidebar (verticaal) — zie ProgramSidebar topSlot. */}




        {/* 2. Action required card + Intro card + programma-samenvatting — alleen op Programma tab */}
        {(initialSection === "program" || !initialSection) && (
          <>
            <ProgramOverviewCard
              selectedDates={selectedDates}
              numberOfPeople={program.number_of_people}
              customerCompany={program.customer_company}
              accommodation={accommodation}
              accommodationQuotes={accommodationQuotes}
              referenceNumber={program.reference_number}
              accommodationReferenceNumber={accommodation?.reference_number}
              programType={program.origin as any}
              origin={program.origin}
              quoteStatus={program.quote_status as any}
              quoteValidUntil={program.quote_valid_until}
              termsAcceptedAt={program.terms_accepted_at}
              completionStatus={(program as any).completion_status ?? null}
              programDescription={program.program_description}
              onEdit={onOpenEdit}
              hasPendingItems={statusSummary.pending > 0}
            />

            {/* Na afloop: de eigen beoordeling (docs/plan-reviews-oogsten.md, fase 4) */}
            {isPostExecution && <ReviewInviteCard reviewToken={program.review_token} review={customerReview} />}

            <ActionRequiredCard
              statusSummary={statusSummary}
              isMultiDay={isMultiDay}
              hasAccommodation={hasActiveAccommodation}
              billingComplete={billingComplete}
              termsAccepted={termsAccepted}
              onOpenBilling={onOpenBilling}
              onScrollToTerms={scrollToTerms}
              onScrollToAccommodation={scrollToAccommodation}
              programType={program.origin}
              quoteStatus={program.quote_status}
              programPublishedAt={program.program_published_at}
              customerActionsCount={customerActionsCount}
              alternativeActionsCount={alternativeActionsCount}
              newItemActionsCount={newItemActionsCount}
              pendingApprovalNames={getCustomerActionableItems(program.items, program.quote_status).map((i) => i.block_name).filter(Boolean)}
              guestDetailsIncomplete={
                !!guestDetails &&
                (!guestDetails.guest_names ||
                  (guestDetails.showDietary && !guestDetails.dietary_notes) ||
                  (guestDetails.showRoomAssignment && !guestDetails.room_assignment))
              }
              onOpenGuestDetails={onOpenGuestDetails}
              selectedDates={(program as any).selected_dates ?? null}
              completionStatus={(program as any).completion_status ?? null}
              cancelledAt={(program as any).cancelled_at ?? null}
            />

          </>
        )}

        {/* 3. Accommodation section - only for multi-day, shown when initialSection is "accommodation" */}
        {isMultiDay && initialSection === "accommodation" && (
          <div id="accommodation" className="scroll-mt-20">
            <Card>
              <CardContent className="pt-6">
                <AccommodationSection
                  accommodation={accommodation}
                  quotes={accommodationQuotes}
                  extrasByQuoteId={accommodationExtrasByQuoteId}
                  onSelectQuote={onSelectAccommodationQuote}
                  selectedDates={selectedDates}
                  onEditAccommodation={onOpenEdit}
                  onEditAccommodationSetup={onOpenAccommodationSetup}
                  customerToken={program.customer_token}
                  numberOfPeople={program.number_of_people}
                  invoicingMode={invoicingMode}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 4. Program, billing, terms, contact - visible when not showing accommodation or billing-only */}
        {(initialSection === "program" || !initialSection) && (
          <>
            {/* Fase 2: één centrale hero-kaart bóven het programma */}
            {isProposalPhase && (
              <ProposalHeroCard
                quoteValidUntil={program.quote_valid_until}
                hasUnapprovedItems={hasUnapprovedItems}
                onAcceptQuoteProposal={onAcceptQuoteProposal}
                bureauItemCount={bureauItemCount}
                partnerItemCount={partnerItemCount}
              />
            )}

            {/* Intro card behoudt maatwerk-leeg / bevestigd-flows */}
            <ProgramIntroCard
              programType={program.origin}
              quoteStatus={program.quote_status}
              quoteValidUntil={program.quote_valid_until}
              termsAcceptedAt={program.terms_accepted_at}
              itemCount={program.items.filter(i => i.status !== "cancelled").length}
              isMaatwerkEmpty={isMaatwerkProject(program) && program.items.length === 0}
              onAcceptQuoteProposal={onAcceptQuoteProposal}
              hasUnapprovedItems={hasUnapprovedItems}
              programPublishedAt={program.program_published_at}
              allConfirmed={allConfirmed}
              quotePdfUrl={(program as any).quote_pdf_url}
              isPostExecution={isPostExecution}
            />


            {/* Program content only (no billing) */}
            <div id="program" className="scroll-mt-20">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Programma
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <ProgramPdfDownload
                        customerName={program.customer_name}
                        customerCompany={program.customer_company}
                        selectedDates={selectedDates}
                        numberOfPeople={program.number_of_people}
                        items={program.items}
                        referenceNumber={program.reference_number}
                        requestId={(program as any).id}
                        customerToken={program.customer_token}
                        variant="sm"
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const activeItems = program.items.filter(i => i.status !== "cancelled" && i.day_index >= 0);
                                downloadAllEvents(
                                  activeItems.map(i => ({
                                    id: i.id,
                                    block_name: i.block_name,
                                    provider_name: i.provider_name,
                                    day_index: i.day_index,
                                    confirmed_time: i.confirmed_time,
                                    proposed_time: i.proposed_time,
                                    preferred_time: i.preferred_time,
                                    duration: i.duration,
                                    location_address: i.location_address,
                                  })),
                                  selectedDates.map(d => d.toISOString().split("T")[0]),
                                  program.number_of_people,
                                  `Programma ${program.customer_company || program.customer_name}`
                                );
                              }}
                            >
                              <CalendarPlus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Exporteren naar agenda</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {/* Bekijk-offerte knop verwijderd: de offerte loopt achter op de live programmastatus en zorgt voor verwarring. */}
                      {!isPostExecution && customerActionsCount > 0 && onBulkApproveQuoteItems && (
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-success hover:bg-success text-primary-foreground"
                          onClick={async () => {
                            await onBulkApproveQuoteItems();
                          }}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {customerActionsCount === 1
                            ? "Dit onderdeel goedkeuren"
                            : `Alle ${customerActionsCount} onderdelen goedkeuren`}
                        </Button>
                      )}
                      {!termsAccepted && isPublished && !isPostExecution && (
                        <Button
                          size="sm"
                          onClick={() => setIsAddActivityOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Toevoegen
                        </Button>
                      )}
                      {!(isMaatwerkProject(program) && statusSummary.total === 0) && (
                        <Badge variant="secondary">
                          {statusSummary.total} activiteiten
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {program.items.length === 0 ? (
                    <EmptyState
                      icon={<Sparkles />}
                      title="Bureau Vlieland is uw programma aan het samenstellen"
                      description="Zodra het programma klaar is, vindt u het hier terug."
                    />
                  ) : selectedDates.length > 1 ? (
                    <DayTabs
                      selectedDates={selectedDates}
                      activeDay={activeDay}
                      onDayChange={onDayChange}
                      itemCountPerDay={itemCountPerDay}
                    >
                      {(dayIndex) => {
                        const dayItems = getItemsForDay(dayIndex);
                        const dayPricedItems = dayItems.filter(i => i.status !== "cancelled" && i.quoted_price);
                        const dayTotalIncl = dayPricedItems.reduce((s, i) => s + getItemEffectivePrice(i, program.number_of_people), 0);
                        const dayTotalExcl = dayPricedItems.reduce((s, i) => {
                          const rate = getItemVatRate(i);
                          return s + calculateExclVat(getItemEffectivePrice(i, program.number_of_people), rate);
                        }, 0);
                        return (
                          <>
                            <CustomerTimeline items={dayItems} showTimeColumn>
                              {(item) => (
                              <CustomerProgramItem
                                  item={item}
                                  selectedDates={selectedDates}
                                  onUpdate={(updates) => onUpdateItem(item.id, updates)}
                                  onRemove={() => onRemoveItem(item.id)}
                                  onAccept={() => onAcceptItem(item.id)}
                                  onCounterProposal={(counterTime, counterNote) => onCounterProposal(item.id, counterTime, counterNote)}
                                  onApproveQuoteItem={() => onApproveQuoteItem(item.id)}
                                  allItems={program.items}
                                  hasChanges={pendingChanges.some((c) => c.itemId === item.id)}
                                  invoicingMode={invoicingMode}
                                   isPreApproval={isPreApproval}
                                   quoteStatus={program.quote_status}
                                   isQuoteMode={isQuoteMode}
                                  vatRate={getItemVatRate(item)}
                                    readOnly={!isPublished || isPostExecution}
                                   isPostExecution={isPostExecution}
                                   hideDay
                                   numberOfPeople={program.number_of_people}
                                   isPendingRemoval={isPendingRemoval ? isPendingRemoval(item.id) : false}
                                 />

                              )}
                            </CustomerTimeline>
                            {dayPricedItems.length > 0 && (
                              <div className="flex items-center justify-between pt-3 mt-3 border-t text-sm">
                                <span className="text-muted-foreground">Dagtotaal</span>
                                <div className="text-right">
                                  <span className="font-semibold">€{dayTotalIncl.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  <span className="text-xs text-muted-foreground ml-2">(excl. BTW: €{dayTotalExcl.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      }}
                    </DayTabs>
                  ) : (
                    <CustomerTimeline
                      items={program.items.filter((item) => item.status !== "cancelled" && item.day_index >= 0)}
                      showTimeColumn
                    >
                      {(item) => (
                        <CustomerProgramItem
                          item={item}
                          selectedDates={selectedDates}
                          onUpdate={(updates) => onUpdateItem(item.id, updates)}
                          onRemove={() => onRemoveItem(item.id)}
                          onAccept={() => onAcceptItem(item.id)}
                          onCounterProposal={(counterTime, counterNote) => onCounterProposal(item.id, counterTime, counterNote)}
                          onApproveQuoteItem={() => onApproveQuoteItem(item.id)}
                          allItems={program.items}
                          hasChanges={pendingChanges.some((c) => c.itemId === item.id)}
                          invoicingMode={invoicingMode}
                           isPreApproval={isPreApproval}
                           quoteStatus={program.quote_status}
                           isQuoteMode={isQuoteMode}
                          vatRate={getItemVatRate(item)}
                          readOnly={!isPublished || isPostExecution}
                          isPostExecution={isPostExecution}
                          numberOfPeople={program.number_of_people}
                          isPendingRemoval={isPendingRemoval ? isPendingRemoval(item.id) : false}
                        />

                      )}
                    </CustomerTimeline>
                  )}
                </CardContent>
              </Card>
            </div>




            {/* Floating changes bar */}
            {hasChanges && isPublished && !isPostExecution && (
              <div
                ref={saveBarRef}
                role="status"
                className="fixed inset-x-0 bottom-0 z-30 border-t border-warning/40 bg-warning-soft/95 backdrop-blur supports-[backdrop-filter]:bg-warning-soft/90"
              >
                <Container size="full" className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-start gap-2 text-warning-ink">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-medium">
                        {pendingChanges.length} wijziging{pendingChanges.length > 1 ? "en" : ""} nog niet verstuurd
                      </p>
                      <p className="text-sm">Zonder opslaan gaan uw wijzigingen verloren als u de pagina ververst.</p>
                    </div>
                  </div>
                  <Button onClick={onSubmitChanges} className="shrink-0">
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Wijzigingen opslaan
                  </Button>
                </Container>
              </div>
            )}

          </>
        )}

        {/* Billing-only view: just the financial summary */}
        {initialSection === "billing" && (
          <div className="space-y-6">
            <div id="billing" className="scroll-mt-20">
              <CompactBillingSection
                program={program}
                items={program.items}
                numberOfPeople={program.number_of_people}
                numberOfDays={selectedDates.length || 1}
                termsAccepted={termsAccepted}
                selectedAccommodationQuote={accommodationQuotes.find(q => q.status === "selected")}
                onEditBilling={onOpenBilling}
                invoicingMode={invoicingMode}
                billingLinesByItem={billingLinesByItem}
                blockVatRates={blockVatRates}
                accommodationExtrasByQuoteId={accommodationExtrasByQuoteId}
                excludedFees={program.excluded_fees}
                feeStructure={feeStructure}
                requestDate={requestDate}
                arrivalDate={arrivalDate}
                revisionFeesTotal={revisionFeesTotal}
              />
            </div>
            {termsAccepted && (
              <PaymentStatusCard
                items={program.items}
                termsAcceptedAt={program.terms_accepted_at!}
              />
            )}
          </div>
        )}

        {/* Practical view */}
        {initialSection === "practical" && (
          <PracticalView
            program={program as any}
            selectedDates={selectedDates}
            guestDetails={guestDetails}
            onOpenGuestDetails={onOpenGuestDetails}
          />
        )}

        {/* Accept (akkoord) view */}
        {initialSection === "accept" && (
          <AcceptView
            program={program}
            items={program.items}
            numberOfPeople={program.number_of_people}
            selectedDates={selectedDates}
            termsAccepted={termsAccepted}
            billingComplete={billingComplete}
            allConfirmed={allConfirmed}
            canAcceptUnderReservation={canAcceptUnderReservation}
            accommodationQuotes={accommodationQuotes}
            invoicingMode={invoicingMode}
            acceptedTerms={program.acceptedTerms}
            termsAcceptedAt={program.terms_accepted_at}
            signatureName={program.signature_name}
            signatureId={program.signature_id}
            onAcceptTerms={onAcceptTerms}
            onOpenBilling={onOpenBilling}
          />
        )}
      </div>

      {/* Sidebar */}
      <ProgramSidebar
        statusSummary={statusSummary}
        termsAccepted={termsAccepted}
        billingComplete={billingComplete}
        onOpenBilling={onOpenBilling}
        onRefresh={onRefresh}
        onCancel={onOpenCancel}
        items={program.items}
        numberOfPeople={program.number_of_people}
        numberOfDays={selectedDates.length || 1}
        selectedAccommodationQuote={accommodationQuotes.find(q => q.status === "selected")}
        accommodation={accommodation}
        isMultiDay={isMultiDay}
         isPreApproval={isPreApproval}
         quoteStatus={program.quote_status}
        totalCost={totalCost}
        excludedFees={program.excluded_fees}
        allConfirmed={allConfirmed}
        onScrollToTerms={scrollToTerms}
        topSlot={
          <ProgramStepper
            variant="vertical"
            statusSummary={statusSummary}
            billingComplete={billingComplete}
            termsAccepted={termsAccepted}
            isMultiDay={isMultiDay}
            accommodationStatus={accommodationStatus}
            accommodationQuoteReceivedCount={accommodationQuotes.filter((q) => q.status === "submitted").length}
            customerApprovedCount={customerApprovedCount}
            customerApprovableCount={customerApprovableCount}
            quoteStatus={program.quote_status}
            isPostExecution={isPostExecution}
            onStepAction={handleStepAction}
          />
        }
      />


      {/* Add Activity Sheet */}
      <AddActivitySheet
        open={isAddActivityOpen}
        onOpenChange={setIsAddActivityOpen}
        existingBlockIds={program.items.map((item) => item.block_id).filter((id): id is string => id !== null)}
        onAddActivity={(blockId) => onAddActivity(blockId)}
      />
    </div>
  );
};
