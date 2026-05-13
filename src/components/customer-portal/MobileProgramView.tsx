import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgramSection } from "./ProgramSection";
import { PriceSummaryCard } from "./PriceSummaryCard";
import { BillingDetailsCard } from "./BillingDetailsCard";
import { PracticalView } from "./PracticalView";
import { AcceptView } from "./AcceptView";

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
import { GuestDetailsCard } from "./GuestDetailsCard";
import { MobileStickyStatus } from "./MobileStickyStatus";
import { CustomerProgramItem } from "./CustomerProgramItem";
import { DayTabs } from "@/components/configurator/DayTabs";
import { useItemVatRates } from "@/hooks/useItemVatRates";
import { useProgramStatus } from "@/hooks/useProgramStatus";
import { hasQuoteItemsAwaitingCustomerApproval } from "@/lib/customerQuoteApproval";
import { isMaatwerkProject } from "@/lib/projectOrigin";
import {
  Calendar,
  FileText,
  Settings,
  History,
  Users,
  Mail,
  Phone,
  Pencil,
  Ban,
  Building2,
  Send,
  Plus,
  BedDouble,
  Download,
  CalendarPlus,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { ProgramRequestItem, ProgramRequestHistory, ProgramRequestWithItems } from "@/types/programRequest";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";
import { calculateExclVat } from "@/lib/appSettings";
import { getItemEffectivePrice } from "@/lib/portalPricing";
import { ProgramPdfDownload } from "./ProgramPdfDownload";
import { downloadAllEvents } from "@/lib/calendarExport";

interface MobileProgramViewProps {
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
  onAcceptTerms: (signatureName: string) => Promise<boolean>;
  onAddActivity: (blockId: string) => void;
  // Accommodation
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
  onSelectAccommodationQuote: (quoteId: string) => Promise<boolean>;
  // Quote proposal
  onAcceptQuoteProposal: () => Promise<boolean>;
  onApproveQuoteItem: (itemId: string) => Promise<boolean>;
  onOpenGuestDetails?: () => void;
  guestDetails?: {
    guest_names: string | null;
    dietary_notes: string | null;
    room_assignment: string | null;
    updated_at: string | null;
    showDietary: boolean;
    showRoomAssignment: boolean;
  };
}

export const MobileProgramView = ({
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
  onAcceptTerms,
  onAddActivity,
  accommodation,
  accommodationQuotes,
  onSelectAccommodationQuote,
  onAcceptQuoteProposal,
  onApproveQuoteItem,
  onOpenGuestDetails,
  guestDetails,
}: MobileProgramViewProps) => {
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);

  const isPublished = !!program.program_published_at;
  const isQuoteMode = true; // All projects use unified quote pipeline
  const hasUnapprovedItems = hasQuoteItemsAwaitingCustomerApproval(program.items);

  const { getItemVatRate } = useItemVatRates(program.items);
  const {
    termsAccepted,
    billingComplete,
    allConfirmed,
    isMultiDay,
    hasSelectedAccommodation,
    isPreApproval,
  } = useProgramStatus(program, accommodationQuotes, statusSummary, selectedDates);
  // Hide "Logies nog niet geregeld" banner if there's an active accommodation request OR a selected quote
  const hasActiveAccommodation = hasSelectedAccommodation || !!accommodation;

  // Calculate completed steps
  const completedSteps = useMemo(() => {
    let count = 0;
    if (allConfirmed) count++;
    if (billingComplete) count++;
    if (!isMultiDay || hasSelectedAccommodation) count++;
    if (termsAccepted) count++;
    return count;
  }, [allConfirmed, billingComplete, isMultiDay, hasSelectedAccommodation, termsAccepted]);

  const totalSteps = isMultiDay ? 4 : 3;

  // Get next action for mobile sticky bar
  const getNextAction = () => {
    if (statusSummary.alternative > 0) {
      return { 
        label: "Bekijk", 
        onClick: () => document.getElementById("program")?.scrollIntoView({ behavior: "smooth" }) 
      };
    }
    if (isMultiDay && !hasSelectedAccommodation) {
      return { 
        label: "Logies", 
        onClick: () => document.getElementById("accommodation")?.scrollIntoView({ behavior: "smooth" }) 
      };
    }
    if (!billingComplete && allConfirmed) {
      return { label: "Invullen", onClick: onOpenBilling };
    }
    if (allConfirmed && billingComplete && !termsAccepted) {
      return { 
        label: "Ondertekenen", 
        onClick: () => document.getElementById("terms-section")?.scrollIntoView({ behavior: "smooth" }) 
      };
    }
    return undefined;
  };

  return (
    <div className="space-y-4">
      {/* Mobile sticky status bar */}
      <MobileStickyStatus
        completedSteps={completedSteps}
        totalSteps={totalSteps}
        nextAction={getNextAction()}
      />

      {/* 1. Program Overview Card */}
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
        programDescription={program.program_description}
        onEdit={onOpenEdit}
        hasPendingItems={statusSummary.pending > 0}
      />

      {/* 2. Action Required Card + Intro card — only on Programma tab (or no tab, e.g. single-day) */}
      {(initialSection === "program" || !initialSection) && (
        <>
          <ActionRequiredCard
            statusSummary={statusSummary}
            isMultiDay={isMultiDay}
            hasAccommodation={hasActiveAccommodation}
            billingComplete={billingComplete}
            termsAccepted={termsAccepted}
            onOpenBilling={onOpenBilling}
            onScrollToTerms={() => document.getElementById("terms-section")?.scrollIntoView({ behavior: "smooth" })}
            onScrollToAccommodation={() => document.getElementById("accommodation")?.scrollIntoView({ behavior: "smooth" })}
            programType={program.origin}
            quoteStatus={program.quote_status}
            programPublishedAt={program.program_published_at}
            guestDetailsIncomplete={
              !!guestDetails &&
              (!guestDetails.guest_names ||
                (guestDetails.showDietary && !guestDetails.dietary_notes) ||
                (guestDetails.showRoomAssignment && !guestDetails.room_assignment))
            }
            onOpenGuestDetails={onOpenGuestDetails}
          />

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
          />

          {guestDetails && isPublished && onOpenGuestDetails && (
            <GuestDetailsCard
              guestNames={guestDetails.guest_names}
              dietaryNotes={guestDetails.dietary_notes}
              roomAssignment={guestDetails.room_assignment}
              showDietary={guestDetails.showDietary}
              showRoomAssignment={guestDetails.showRoomAssignment}
              updatedAt={guestDetails.updated_at}
              onEdit={onOpenGuestDetails}
            />
          )}
        </>
      )}

      {/* 3. Accommodation section - only for multi-day, shown when initialSection is "accommodation" */}
      {isMultiDay && initialSection === "accommodation" && (
        <ProgramSection
          id="accommodation"
          title="Logies"
          icon={<BedDouble className="h-4 w-4 text-primary" />}
          defaultOpen
        >
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
        </ProgramSection>
      )}

      {/* 4. Program section - hide when showing accommodation or billing */}
      {(initialSection === "program" || !initialSection) && <ProgramSection
        id="program"
        title="Programma"
        icon={<Calendar className="h-4 w-4 text-primary" />}
          badge={
            <div className="flex items-center gap-2 ml-auto">
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
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
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
                <CalendarPlus className="h-3 w-3" />
              </Button>
              {(program as any).quote_pdf_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open((program as any).quote_pdf_url, "_blank");
                  }}
                  className="h-7 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Offerte
                </Button>
              )}
              {!termsAccepted && isPublished && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddActivityOpen(true);
                  }}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Toevoegen
                </Button>
              )}
              {!(isMaatwerkProject(program) && statusSummary.total === 0) && (
                <Badge variant="secondary">
                  {statusSummary.total} activiteiten
                </Badge>
              )}
            </div>
          }
        defaultOpen
      >
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
                <div className="mt-4">
                  <CustomerTimeline items={dayItems}>
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
                        readOnly={!isPublished}
                        hideDay
                        numberOfPeople={program.number_of_people}
                      />
                    )}
                  </CustomerTimeline>
                </div>
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
                      readOnly={!isPublished}
                      numberOfPeople={program.number_of_people}
                    />
                  )}
                </CustomerTimeline>
        )}
      </ProgramSection>}

      {/* 5. Billing-only view: financial summary */}
      {initialSection === "billing" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium">Wat kunt u hier doen?</p>
              <p className="text-blue-800/90 dark:text-blue-100/90 mt-1">
                Hier vindt u het kostenoverzicht en de status van facturen.
              </p>
            </div>
          </div>
          <BillingDetailsCard program={program as any} onEdit={onOpenBilling} />
          <PriceSummaryCard
            items={program.items}
            numberOfPeople={program.number_of_people}
            numberOfDays={selectedDates.length || 1}
            termsAccepted={termsAccepted}
            selectedAccommodationQuote={accommodationQuotes.find(q => q.status === "selected")}
            invoicingMode={invoicingMode}
          />
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

      {initialSection === "program" && (
        <>
          {/* Floating changes bar — only in program view */}
          {initialSection === "program" && hasChanges && isPublished && (
            <div className="sticky bottom-4 left-0 right-0 z-50 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg mx-2">
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

          {/* Secondary options — only in program view */}
          {initialSection === "program" && (
            <>
              <ProgramSection
                id="details"
                title="Programma Details"
                icon={<Settings className="h-4 w-4 text-primary" />}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Pas gegevens aan</span>
                    <Button variant="ghost" size="sm" onClick={onOpenEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Bewerken
                    </Button>
                  </div>
                  <div className="grid gap-4 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-muted-foreground">Contactpersoon</p>
                        <p className="font-medium">{program.customer_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-muted-foreground">Datum(s)</p>
                        <p className="font-medium">
                          {selectedDates.map((d, i) => (
                            <span key={i}>
                              {i > 0 && ", "}
                              {format(d, "EEE d MMM yyyy", { locale: nl })}
                            </span>
                          ))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-muted-foreground">E-mail</p>
                        <p className="font-medium">{program.customer_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-muted-foreground">Telefoon</p>
                        <p className="font-medium">{program.customer_phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-muted-foreground">Aantal personen</p>
                        <p className="font-medium">{program.number_of_people}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ProgramSection>

              {history.length > 0 && (
                <ProgramSection
                  id="history"
                  title="Geschiedenis"
                  icon={<History className="h-4 w-4 text-primary" />}
                >
                  <ProgramHistoryTimeline history={history} variant="embedded" />
                </ProgramSection>
              )}

              <Card className="border-destructive/20">
                <CardContent className="py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium mb-1 flex items-center gap-2">
                        <Ban className="h-4 w-4 text-destructive" />
                        Aanvraag annuleren
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Alle aanbieders worden automatisch op de hoogte gesteld.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={onOpenCancel}
                    >
                      Annuleren
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Contact section */}
          <Card className="bg-muted/30">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Vragen of hulp nodig?</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Neem gerust contact met ons op.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a href="mailto:hallo@bureauvlieland.nl">
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-2" />
                        E-mail
                      </Button>
                    </a>
                    <a href="tel:+31562700208">
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4 mr-2" />
                        Bellen
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}




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
