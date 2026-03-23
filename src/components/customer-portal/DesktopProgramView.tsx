import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProgramSidebar } from "./ProgramSidebar";
import { AcceptTermsCard } from "./AcceptTermsCard";
import { AcceptedTermsCard, type AcceptedTermsEntry } from "./AcceptedTermsCard";
import { ProgramIntroCard } from "./ProgramIntroCard";
import { ProgramHistoryTimeline } from "./ProgramHistoryTimeline";
import { CustomerTimeline } from "./CustomerTimeline";
import { AddActivitySheet } from "./AddActivitySheet";
import { PaymentStatusCard } from "./PaymentStatusCard";
import { AccommodationSection } from "./AccommodationSection";

import { ProgramOverviewCard } from "./ProgramOverviewCard";
import { ActionRequiredCard } from "./ActionRequiredCard";
import { CompactBillingSection } from "./CompactBillingSection";
import { CustomerProgramItem } from "./CustomerProgramItem";
import { DayTabs } from "@/components/configurator/DayTabs";
import { useItemVatRates } from "@/hooks/useItemVatRates";
import { useProgramStatus } from "@/hooks/useProgramStatus";
import { hasQuoteItemsAwaitingCustomerApproval } from "@/lib/customerQuoteApproval";
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
  FileText,
  CalendarPlus,
  Sparkles,
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
  initialSection?: "accommodation" | "program" | "billing";
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
    program_type?: string;
    quote_status?: string | null;
    quote_valid_until?: string | null;
    // Program description
    program_description?: string | null;
    program_published_at?: string | null;
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
  onSelectAccommodationQuote: (quoteId: string) => Promise<boolean>;
  // Quote proposal
  onAcceptQuoteProposal: () => Promise<boolean>;
  onApproveQuoteItem: (itemId: string) => Promise<boolean>;
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
  onSelectAccommodationQuote,
  onAcceptQuoteProposal,
  onApproveQuoteItem,
}: DesktopProgramViewProps) => {
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const isPublished = !!program.program_published_at;
  const isQuoteMode = program.program_type === "quote" || !!program.program_type?.startsWith("maatwerk_");
  const hasUnapprovedItems = isQuoteMode && hasQuoteItemsAwaitingCustomerApproval(program.items);

  const { getItemVatRate } = useItemVatRates(program.items);
  const {
    termsAccepted,
    billingComplete,
    allConfirmed,
    isMultiDay,
    hasSelectedAccommodation,
    isQuoteAwaitingApproval,
    isPreApproval,
    totalCost,
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

  return (
    <div className="grid grid-cols-[1fr,320px] gap-8">
      {/* Main content */}
      <div className="space-y-6">
        {/* 1. Hero header - compact overview */}
        <ProgramOverviewCard
          selectedDates={selectedDates}
          numberOfPeople={program.number_of_people}
          customerCompany={program.customer_company}
          accommodation={accommodation}
          accommodationQuotes={accommodationQuotes}
          referenceNumber={program.reference_number}
          accommodationReferenceNumber={accommodation?.reference_number}
          programType={program.program_type as any}
          quoteStatus={program.quote_status as any}
          quoteValidUntil={program.quote_valid_until}
          termsAcceptedAt={program.terms_accepted_at}
          programDescription={program.program_description}
          onEdit={onOpenEdit}
          hasPendingItems={statusSummary.pending > 0}
        />

        {/* 2. Action required card + Intro card — only on Programma tab (or no tab, e.g. single-day) */}
        {(initialSection === "program" || !initialSection) && (
          <>
            <ActionRequiredCard
              statusSummary={statusSummary}
              isMultiDay={isMultiDay}
              hasAccommodation={hasActiveAccommodation}
              billingComplete={billingComplete}
              termsAccepted={termsAccepted}
              onOpenBilling={onOpenBilling}
              onScrollToTerms={scrollToTerms}
              onScrollToAccommodation={scrollToAccommodation}
              programType={program.program_type}
              quoteStatus={program.quote_status}
              programPublishedAt={program.program_published_at}
            />

            <ProgramIntroCard
              programType={program.program_type}
              quoteStatus={program.quote_status}
              quoteValidUntil={program.quote_valid_until}
              termsAcceptedAt={program.terms_accepted_at}
              itemCount={program.items.filter(i => i.status !== "cancelled").length}
              isMaatwerkEmpty={!!program.program_type?.startsWith("maatwerk_") && program.items.length === 0}
              onAcceptQuoteProposal={onAcceptQuoteProposal}
              hasUnapprovedItems={hasUnapprovedItems}
              programPublishedAt={program.program_published_at}
            />
          </>
        )}

        {/* 3. Accommodation section - only for multi-day, shown when initialSection is "accommodation" */}
        {isMultiDay && initialSection === "accommodation" && (
          <div id="accommodation" className="scroll-mt-20">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-primary" />
                  Logies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AccommodationSection
                  accommodation={accommodation}
                  quotes={accommodationQuotes}
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
        {initialSection !== "accommodation" && initialSection !== "billing" && (
          <>
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
                      {(program as any).quote_pdf_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open((program as any).quote_pdf_url, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Bekijk offerte
                        </Button>
                      )}
                      {!termsAccepted && isPublished && (
                        <Button
                          size="sm"
                          onClick={() => setIsAddActivityOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Toevoegen
                        </Button>
                      )}
                      {!(program.program_type?.startsWith("maatwerk_") && statusSummary.total === 0) && (
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
                                  isQuoteMode={isQuoteMode}
                                  vatRate={getItemVatRate(item)}
                                  readOnly={!isPublished}
                                  hideDay
                                  numberOfPeople={program.number_of_people}
                                />
                              )}
                            </CustomerTimeline>
                            {dayItems.length === 0 && (
                              <p className="text-center text-muted-foreground py-8">
                                Geen activiteiten op deze dag
                              </p>
                            )}
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
                          isQuoteMode={isQuoteMode}
                          vatRate={getItemVatRate(item)}
                          readOnly={!isPublished}
                          numberOfPeople={program.number_of_people}
                        />
                      )}
                    </CustomerTimeline>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Floating changes bar */}
            {hasChanges && isPublished && (
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

        {/* Billing-only view (decision 4: separate billing tab) */}
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
              />
            </div>

            {!termsAccepted && (
              <div id="terms-section" className="scroll-mt-20">
                {allConfirmed ? (
                  <AcceptTermsCard
                    onAccept={onAcceptTerms}
                    isBillingComplete={billingComplete}
                    onOpenBilling={onOpenBilling}
                    items={program.items}
                    accommodationQuotes={accommodationQuotes}
                    selectedDates={selectedDates}
                  />
                ) : (
                  <Card className="border-dashed bg-muted/30">
                    <CardContent className="py-6">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <h3 className="font-medium">Voorwaarden</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Zodra alle activiteiten in je programma bevestigd zijn, verschijnen hier de voorwaarden ter ondertekening.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {termsAccepted && program.acceptedTerms && program.acceptedTerms.length > 0 && (
              <AcceptedTermsCard
                termsAcceptedAt={program.terms_accepted_at!}
                signatureName={program.signature_name || null}
                signatureId={program.signature_id || null}
                acceptedTerms={program.acceptedTerms}
              />
            )}

            {termsAccepted && (
              <PaymentStatusCard
                items={program.items}
                termsAcceptedAt={program.terms_accepted_at!}
              />
            )}
          </div>
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
        totalCost={totalCost}
        allConfirmed={allConfirmed}
        onScrollToTerms={scrollToTerms}
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
