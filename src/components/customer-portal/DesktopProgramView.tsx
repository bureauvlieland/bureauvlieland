import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgramSidebar } from "./ProgramSidebar";
import { AcceptTermsCard } from "./AcceptTermsCard";
import { AcceptedTermsCard, type AcceptedTermsEntry } from "./AcceptedTermsCard";
import { AcceptQuoteProposalCard } from "./AcceptQuoteProposalCard";
import { ProgramHistoryTimeline } from "./ProgramHistoryTimeline";
import { CustomerProgramItem } from "./CustomerProgramItem";
import { AddActivitySheet } from "./AddActivitySheet";
import { AccommodationSection } from "./AccommodationSection";
import { ExtrasSection } from "./ExtrasSection";
import { ProgramOverviewCard } from "./ProgramOverviewCard";
import { ActionRequiredCard } from "./ActionRequiredCard";
import { CompactBillingSection } from "./CompactBillingSection";
import { DayTabs } from "@/components/configurator/DayTabs";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProgramRequestItem, ProgramRequestHistory, ProgramRequestWithItems } from "@/types/programRequest";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";

interface DesktopProgramViewProps {
  invoicingMode?: string;
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
  onAddActivity: (blockId: string, dayIndex: number, preferredTime: string | null, notes: string) => void;
  // Accommodation
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
  onSelectAccommodationQuote: (quoteId: string) => Promise<boolean>;
  // Quote proposal
  onAcceptQuoteProposal: () => Promise<boolean>;
}

export const DesktopProgramView = ({
  invoicingMode,
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
}: DesktopProgramViewProps) => {
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const termsAccepted = !!program.terms_accepted_at;
  const billingComplete = !!(
    program.billing_company_name &&
    program.billing_address_street &&
    program.billing_address_postal &&
    program.billing_address_city &&
    program.billing_contact_name
  );
  
  const allConfirmed = statusSummary.pending === 0 && statusSummary.alternative === 0 && (statusSummary.counter_proposed || 0) === 0 && statusSummary.total > 0;
  const isMultiDay = selectedDates.length > 1;
  const hasSelectedAccommodation = accommodationQuotes.some(q => q.status === "selected");
  // Hide "Logies nog niet geregeld" banner if there's an active accommodation request OR a selected quote
  const hasActiveAccommodation = hasSelectedAccommodation || !!accommodation;
  
  // Check if this is a quote awaiting customer approval
  const isQuoteAwaitingApproval = program.program_type === "quote" && program.quote_status === "offerte_verstuurd";

  // Calculate total cost for sidebar
  const totalCost = useMemo(() => {
    let total = 0;
    
    // Activity costs
    program.items.forEach(item => {
      if (item.status !== "cancelled" && item.quoted_price) {
        total += item.quoted_price;
      }
    });
    
    // Accommodation cost
    const selectedQuote = accommodationQuotes.find(q => q.status === "selected");
    if (selectedQuote) {
      total += selectedQuote.price_total;
    }
    
    return total;
  }, [program.items, accommodationQuotes]);

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
        />

        {/* 2. Quote Proposal Card - only for maatwerk quotes awaiting approval */}
        {isQuoteAwaitingApproval && (
          <AcceptQuoteProposalCard
            program={program as unknown as ProgramRequestWithItems}
            onAccept={onAcceptQuoteProposal}
          />
        )}

        {/* 3. Action required card - intelligent priority-based alert (hide when quote awaiting approval) */}
        {!isQuoteAwaitingApproval && (
          <ActionRequiredCard
            statusSummary={statusSummary}
            isMultiDay={isMultiDay}
            hasAccommodation={hasActiveAccommodation}
            billingComplete={billingComplete}
            termsAccepted={termsAccepted}
            onOpenBilling={onOpenBilling}
            onScrollToTerms={scrollToTerms}
            onScrollToAccommodation={scrollToAccommodation}
          />
        )}

        {/* 3. Accommodation section - only for multi-day, only if not yet selected */}
        {isMultiDay && (
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
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 4. Program section - always visible */}
        <div id="program" className="scroll-mt-20">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Programma
                </CardTitle>
                <div className="flex items-center gap-2">
                  {!termsAccepted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddActivityOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Toevoegen
                    </Button>
                  )}
                  <Badge variant="secondary">
                    {statusSummary.total} activiteiten
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedDates.length > 1 ? (
                <DayTabs
                  selectedDates={selectedDates}
                  activeDay={activeDay}
                  onDayChange={onDayChange}
                  itemCountPerDay={itemCountPerDay}
                >
                  {(dayIndex) => (
                    <div className="space-y-3 mt-4">
                      {getItemsForDay(dayIndex).map((item) => (
                        <CustomerProgramItem
                          key={item.id}
                          item={item}
                          selectedDates={selectedDates}
                          onUpdate={(updates) => onUpdateItem(item.id, updates)}
                          onRemove={() => onRemoveItem(item.id)}
                          onAccept={() => onAcceptItem(item.id)}
                          onCounterProposal={(counterTime, counterNote) => onCounterProposal(item.id, counterTime, counterNote)}
                          allItems={program.items}
                          hasChanges={pendingChanges.some((c) => c.itemId === item.id)}
                          invoicingMode={invoicingMode}
                        />
                      ))}
                      {getItemsForDay(dayIndex).length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          Geen activiteiten op deze dag
                        </p>
                      )}
                    </div>
                  )}
                </DayTabs>
              ) : (
                <div className="space-y-3">
                  {program.items
                    .filter((item) => item.status !== "cancelled")
                    .sort((a, b) => {
                      if (!a.preferred_time && !b.preferred_time) return 0;
                      if (!a.preferred_time) return 1;
                      if (!b.preferred_time) return -1;
                      return a.preferred_time.localeCompare(b.preferred_time);
                    })
                    .map((item) => (
                      <CustomerProgramItem
                        key={item.id}
                        item={item}
                        selectedDates={selectedDates}
                        onUpdate={(updates) => onUpdateItem(item.id, updates)}
                        onRemove={() => onRemoveItem(item.id)}
                        onAccept={() => onAcceptItem(item.id)}
                        onCounterProposal={(counterTime, counterNote) => onCounterProposal(item.id, counterTime, counterNote)}
                        allItems={program.items}
                        hasChanges={pendingChanges.some((c) => c.itemId === item.id)}
                        invoicingMode={invoicingMode}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 5. Billing & Costs section - always visible, not in accordion */}
        <div id="billing" className="scroll-mt-20">
          <CompactBillingSection
            program={program}
            items={program.items}
            numberOfPeople={program.number_of_people}
            termsAccepted={termsAccepted}
            selectedAccommodationQuote={accommodationQuotes.find(q => q.status === "selected")}
            onEditBilling={onOpenBilling}
            invoicingMode={invoicingMode}
          />
        </div>

        {/* 6. Accept terms - only when ready */}
        {allConfirmed && !termsAccepted && (
          <div id="terms-section" className="scroll-mt-20">
            <AcceptTermsCard
              onAccept={onAcceptTerms}
              isBillingComplete={billingComplete}
              onOpenBilling={onOpenBilling}
              items={program.items}
              accommodationQuotes={accommodationQuotes}
              selectedDates={selectedDates}
            />
          </div>
        )}

        {/* Accepted terms - permanent visibility after acceptance */}
        {termsAccepted && program.acceptedTerms && program.acceptedTerms.length > 0 && (
          <AcceptedTermsCard
            termsAcceptedAt={program.terms_accepted_at!}
            signatureName={program.signature_name || null}
            signatureId={program.signature_id || null}
            acceptedTerms={program.acceptedTerms}
          />
        )}

        {/* Extras section */}
        <ExtrasSection />

        {/* Floating changes bar */}
        {hasChanges && (
          <div className="sticky bottom-4 z-50 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg max-w-[calc(100%-340px)]">
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
                Wijzigingen doorvoeren
              </Button>
            </div>
          </div>
        )}

        {/* Secondary info in collapsible section */}
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <button 
                  onClick={onOpenEdit}
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Settings className="h-4 w-4" />
                  Programma details
                </button>
                {history.length > 0 && (
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <History className="h-4 w-4" />
                    Geschiedenis
                  </button>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background">
                  <DropdownMenuItem onClick={onOpenEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Gegevens bewerken
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={onOpenCancel}
                    className="text-destructive focus:text-destructive"
                  >
                    Aanvraag annuleren
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Expandable history */}
            {showHistory && history.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <ProgramHistoryTimeline history={history} variant="embedded" />
              </div>
            )}
          </CardContent>
        </Card>

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
                  Neem gerust contact met ons op. We helpen u graag verder.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a href="mailto:hallo@bureauvlieland.nl">
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      hallo@bureauvlieland.nl
                    </Button>
                  </a>
                  <a href="tel:+31562700208">
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      0562 700 208
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
        selectedAccommodationQuote={accommodationQuotes.find(q => q.status === "selected")}
        isMultiDay={isMultiDay}
        totalCost={totalCost}
        allConfirmed={allConfirmed}
        onScrollToTerms={scrollToTerms}
      />

      {/* Add Activity Sheet */}
      <AddActivitySheet
        open={isAddActivityOpen}
        onOpenChange={setIsAddActivityOpen}
        selectedDates={selectedDates}
        existingBlockIds={program.items.map((item) => item.block_id)}
        onAddActivity={onAddActivity}
      />
    </div>
  );
};
