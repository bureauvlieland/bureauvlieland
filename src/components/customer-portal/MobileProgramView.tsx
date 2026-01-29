import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgramSection } from "./ProgramSection";

import { NextStepsCard } from "./NextStepsCard";
import { PriceSummaryCard } from "./PriceSummaryCard";
import { BillingDetailsCard } from "./BillingDetailsCard";
import { InvoiceProvidersCard } from "./InvoiceProvidersCard";
import { AcceptTermsCard } from "./AcceptTermsCard";
import { AcceptedTermsCard, type AcceptedTermsEntry } from "./AcceptedTermsCard";
import { ProgramHistoryTimeline } from "./ProgramHistoryTimeline";
import { CustomerProgramItem } from "./CustomerProgramItem";
import { AddActivitySheet } from "./AddActivitySheet";
import { AccommodationSection } from "./AccommodationSection";
import { ExtrasSection } from "./ExtrasSection";
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
import type { ProgramRequestItem, ProgramRequestHistory } from "@/types/programRequest";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";

interface MobileProgramViewProps {
  program: {
    customer_name: string;
    customer_company?: string;
    customer_email: string;
    customer_phone: string;
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
    acceptedTerms?: AcceptedTermsEntry[];
  };
  history: ProgramRequestHistory[];
  selectedDates: Date[];
  statusSummary: {
    total: number;
    confirmed: number;
    pending: number;
    alternative: number;
    progress: number;
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
}

export const MobileProgramView = ({
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
}: MobileProgramViewProps) => {
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const termsAccepted = !!program.terms_accepted_at;
  const billingComplete = !!(
    program.billing_company_name &&
    program.billing_address_street &&
    program.billing_address_postal &&
    program.billing_address_city &&
    program.billing_contact_name
  );

  // Determine which sections should be open by default
  // Show AcceptTermsCard when no pending/alternative items and at least one item exists
  const allConfirmed = statusSummary.pending === 0 && statusSummary.alternative === 0 && statusSummary.total > 0;
  const shouldOpenBilling = allConfirmed && !termsAccepted && !billingComplete;

  return (
    <div className="space-y-4">
      {/* Accommodation section - always first */}
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
        />
      </ProgramSection>

      {/* Next steps - always open */}
      <NextStepsCard
        statusSummary={statusSummary}
        termsAccepted={termsAccepted}
        billingComplete={billingComplete}
        onOpenBilling={onOpenBilling}
      />

      {/* Accept terms card - shows when all confirmed but not yet accepted */}
      {allConfirmed && !termsAccepted && (
        <AcceptTermsCard
          onAccept={onAcceptTerms}
          isBillingComplete={billingComplete}
          onOpenBilling={onOpenBilling}
          items={program.items}
        />
      )}

      {/* Accepted terms card - shows after acceptance with permanent visibility */}
      {termsAccepted && program.acceptedTerms && program.acceptedTerms.length > 0 && (
        <AcceptedTermsCard
          termsAcceptedAt={program.terms_accepted_at!}
          signatureName={program.signature_name || null}
          signatureId={program.signature_id || null}
          acceptedTerms={program.acceptedTerms}
        />
      )}

      {/* Program section - always open */}
      <ProgramSection
        id="program"
        title="Jouw Programma"
        icon={<Calendar className="h-4 w-4 text-primary" />}
        badge={
          <div className="flex items-center gap-2 ml-auto">
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
                  hasChanges={pendingChanges.some((c) => c.itemId === item.id)}
                />
              ))}
          </div>
        )}
      </ProgramSection>

      {/* Invoicing section */}
      <ProgramSection
        id="invoicing"
        title="Facturatie"
        icon={<FileText className="h-4 w-4 text-primary" />}
        defaultOpen={shouldOpenBilling}
      >
        <div className="space-y-4">
          <BillingDetailsCard program={program as any} onEdit={onOpenBilling} />
          <InvoiceProvidersCard 
            items={program.items} 
            selectedAccommodationQuote={accommodationQuotes.find(q => q.status === "selected")}
            numberOfPeople={program.number_of_people}
          />
          <PriceSummaryCard 
            items={program.items} 
            numberOfPeople={program.number_of_people} 
            termsAccepted={termsAccepted}
            selectedAccommodationQuote={accommodationQuotes.find(q => q.status === "selected")}
          />
        </div>
      </ProgramSection>

      {/* Details section */}
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
                <a href="tel:+31562452700">
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
