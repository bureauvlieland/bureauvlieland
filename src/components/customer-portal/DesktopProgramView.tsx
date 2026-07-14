import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProgramSidebar } from "./ProgramSidebar";
import { ProgramStepper, type StepId } from "./ProgramStepper";
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
  initialSection?: "accommodation" | "program" | "practical" | "billing" | "accept";
  program: {
    customer_name: string;
    customer_company?: string;
    customer_email: string;
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
  onOpenCancel: () => void;
  onSubmitChanges: () => void;
  onRefresh: () => void;
  onAcceptTerms: (signatureName: string) => Promise<boolean>;
  onAddActivity: (blockId: string) => void;
  // Accommodation
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
  accommodationExtrasByQuoteId?: Record<string, any[]>;
  onSelectAccommodationQuote: (quoteId: string) => Promise<boolean>;
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
  onNavigate?: (view: "splash" | "accommodation" | "program" | "practical" | "billing" | "accept" | "today" | "map") => void;
}

export const DesktopProgramView = ({
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
  onNavigate,
}: DesktopProgramViewProps) => {
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    isMultiDay,
    hasSelectedAccommodation,
    isQuoteAwaitingApproval,
    isPreApproval,
    totalCost,
    customerActionsCount,
    alternativeActionsCount,
    customerApprovedCount,
    customerApprovableTotal: customerApprovableCount,
    isPostExecution,
  } = useProgramStatus(program, accommodationQuotes, statusSummary, selectedDates);
  // Hide "Logies nog niet geregeld" banner if there's an active accommodation request OR a selected quote
  const hasActiveAccommodation = hasSelectedAccommodation || !!accommodation;

  const scrollToTerms = () => {
    const termsSection = document.getElementById("terms-section");
    termsSection?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToAccommodation = () => {
    const accommodationSection = document.getElementById("accommodation");
    accommodationSection?.scrollIntoView({ behavior: "smooth" });
  };

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
      document.getElementById("program")?.scrollIntoView({ behavior: "smooth" });
    } else if (stepId === "billing_terms") {
      if (!billingComplete) onOpenBilling();
      else if (onNavigate) onNavigate("accept");
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
                          className="bg-green-600 hover:bg-green-700 text-white"
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
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                      <Sparkles className="h-8 w-8 text-primary/50" />
                      <p className="text-muted-foreground">
                        Bureau Vlieland is uw programma aan het samenstellen.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Zodra het programma klaar is, vindt u het hier terug.
                      </p>
                    </div>
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
                        />
                      )}
                    </CustomerTimeline>
                  )}
                </CardContent>
              </Card>
            </div>




            {/* Floating changes bar */}
            {hasChanges && isPublished && !isPostExecution && (
              <div className="sticky bottom-4 left-0 right-0 z-50 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {pendingChanges.length} wijziging{pendingChanges.length > 1 ? "en" : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Aanbieders worden op de hoogte gesteld
                    </p>
                  </div>
                  <Button onClick={onSubmitChanges}>
                    <Send className="h-4 w-4 mr-2" />
                    Doorvoeren
                  </Button>
                </div>
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
        existingBlockIds={program.items.map((item) => item.block_id)}
        onAddActivity={(blockId) => onAddActivity(blockId)}
      />
    </div>
  );
};
