import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgramSection } from "./ProgramSection";
import { PriceSummaryCard } from "./PriceSummaryCard";
import { BillingDetailsCard } from "./BillingDetailsCard";
import { InvoiceProvidersCard } from "./InvoiceProvidersCard";
import { AcceptTermsCard } from "./AcceptTermsCard";
import { AcceptedTermsCard, type AcceptedTermsEntry } from "./AcceptedTermsCard";
import { AcceptQuoteProposalCard } from "./AcceptQuoteProposalCard";
import { ProgramHistoryTimeline } from "./ProgramHistoryTimeline";
import { CustomerProgramItem } from "./CustomerProgramItem";
import { AddActivitySheet } from "./AddActivitySheet";
import { PaymentStatusCard } from "./PaymentStatusCard";
import { AccommodationSection } from "./AccommodationSection";
import { ExtrasSection } from "./ExtrasSection";
import { ProgramOverviewCard } from "./ProgramOverviewCard";
import { ActionRequiredCard } from "./ActionRequiredCard";
import { MobileStickyStatus } from "./MobileStickyStatus";
import { DayTabs } from "@/components/configurator/DayTabs";
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
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { ProgramRequestItem, ProgramRequestHistory, ProgramRequestWithItems } from "@/types/programRequest";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";
import { supabase } from "@/integrations/supabase/client";
import { calculateExclVat } from "@/lib/appSettings";
import { ProgramPdfDownload } from "./ProgramPdfDownload";

interface MobileProgramViewProps {
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
  onAcceptTerms: (signatureName: string) => Promise<boolean>;
  onAddActivity: (blockId: string, dayIndex: number, preferredTime: string | null, notes: string) => void;
  // Accommodation
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
  onSelectAccommodationQuote: (quoteId: string) => Promise<boolean>;
  // Quote proposal
  onAcceptQuoteProposal: () => Promise<boolean>;
}

export const MobileProgramView = ({
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
  onAcceptTerms,
  onAddActivity,
  accommodation,
  accommodationQuotes,
  onSelectAccommodationQuote,
  onAcceptQuoteProposal,
}: MobileProgramViewProps) => {
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);

  // Fetch VAT rates per building block
  const [vatRateMap, setVatRateMap] = useState<Record<string, number>>({});
  useEffect(() => {
    const blockIds = program.items.map(i => i.block_id).filter(Boolean) as string[];
    if (blockIds.length === 0) return;
    supabase
      .from("building_blocks")
      .select("id, vat_rate")
      .in("id", blockIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, number> = {};
          data.forEach(b => { map[b.id] = b.vat_rate ?? 21; });
          setVatRateMap(map);
        }
      });
  }, [program.items]);

  const getItemVatRate = (item: ProgramRequestItem): number => {
    if (item.block_id && vatRateMap[item.block_id] !== undefined) {
      return vatRateMap[item.block_id];
    }
    return 21;
  };

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

  // Pre-approval: quote programs where partners haven't been contacted yet
  const isPreApproval = program.program_type === "quote" && 
    !!program.quote_status && 
    ["concept", "in_afstemming", "offerte_verstuurd"].includes(program.quote_status);

  // Calculate total cost
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
        totalCost={totalCost}
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

      {/* 3. Action Required Card (hide when quote awaiting approval) */}
      {!isQuoteAwaitingApproval && (
        <ActionRequiredCard
          statusSummary={statusSummary}
          isMultiDay={isMultiDay}
          hasAccommodation={hasActiveAccommodation}
          billingComplete={billingComplete}
          termsAccepted={termsAccepted}
          onOpenBilling={onOpenBilling}
          onScrollToTerms={() => document.getElementById("terms-section")?.scrollIntoView({ behavior: "smooth" })}
          onScrollToAccommodation={() => document.getElementById("accommodation")?.scrollIntoView({ behavior: "smooth" })}
        />
      )}

      {/* 3. Accommodation section - only for multi-day */}
      {isMultiDay && (
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
          />
        </ProgramSection>
      )}

      {/* 4. Program section */}
      <ProgramSection
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
                variant="sm"
              />
              {!termsAccepted && (
                <Button
                  variant="outline"
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
              <Badge variant="secondary">
                {statusSummary.total} activiteiten
              </Badge>
            </div>
          }
        defaultOpen
      >
        {selectedDates.length > 1 ? (
          <DayTabs
            selectedDates={selectedDates}
            activeDay={activeDay}
            onDayChange={onDayChange}
            itemCountPerDay={itemCountPerDay}
          >
            {(dayIndex) => {
              const dayItems = getItemsForDay(dayIndex);
              const dayPricedItems = dayItems.filter(i => i.status !== "cancelled" && i.quoted_price);
              const dayTotalIncl = dayPricedItems.reduce((s, i) => s + (i.quoted_price || 0), 0);
              const dayTotalExcl = dayPricedItems.reduce((s, i) => {
                const rate = getItemVatRate(i);
                return s + calculateExclVat(i.quoted_price || 0, rate);
              }, 0);
              return (
                <div className="space-y-3 mt-4">
                  {dayItems.map((item) => (
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
                      isPreApproval={isPreApproval}
                      vatRate={getItemVatRate(item)}
                    />
                  ))}
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
                </div>
              );
            }}
          </DayTabs>
        ) : (
          <div className="space-y-3">
            {program.items
              .filter((item) => item.status !== "cancelled" && item.day_index >= 0)
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
                  isPreApproval={isPreApproval}
                  vatRate={getItemVatRate(item)}
                />
              ))}
          </div>
        )}
      </ProgramSection>

      {/* 5. Billing section - always visible */}
      <ProgramSection
        id="billing"
        title="Facturatie & Kosten"
        icon={<FileText className="h-4 w-4 text-primary" />}
        defaultOpen={allConfirmed && !termsAccepted}
      >
        <div className="space-y-4">
          <BillingDetailsCard program={program as any} onEdit={onOpenBilling} />
          <InvoiceProvidersCard 
            items={program.items} 
            selectedAccommodationQuote={accommodationQuotes.find(q => q.status === "selected")}
            numberOfPeople={program.number_of_people}
            invoicingMode={invoicingMode}
          />
          <PriceSummaryCard 
            items={program.items} 
            numberOfPeople={program.number_of_people} 
            termsAccepted={termsAccepted}
            selectedAccommodationQuote={accommodationQuotes.find(q => q.status === "selected")}
            invoicingMode={invoicingMode}
          />
        </div>
      </ProgramSection>

      {/* 6. Accept terms - only when ready */}
      {allConfirmed && !termsAccepted && (
        <div id="terms-section">
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

      {/* Accepted terms - permanent visibility */}
      {termsAccepted && program.acceptedTerms && program.acceptedTerms.length > 0 && (
        <AcceptedTermsCard
          termsAcceptedAt={program.terms_accepted_at!}
          signatureName={program.signature_name || null}
          signatureId={program.signature_id || null}
          acceptedTerms={program.acceptedTerms}
        />
      )}

      {/* Payment status after terms acceptance */}
      {termsAccepted && (
        <PaymentStatusCard
          items={program.items}
          termsAcceptedAt={program.terms_accepted_at!}
        />
      )}

      {/* Extras section */}
      <ExtrasSection />

      {/* Floating changes bar */}
      {hasChanges && (
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

      {/* Secondary options - collapsible */}
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
                      {format(d, "d MMM yyyy", { locale: nl })}
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

      {/* History section */}
      {history.length > 0 && (
        <ProgramSection
          id="history"
          title="Geschiedenis"
          icon={<History className="h-4 w-4 text-primary" />}
        >
          <ProgramHistoryTimeline history={history} variant="embedded" />
        </ProgramSection>
      )}

      {/* Cancel request section */}
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
