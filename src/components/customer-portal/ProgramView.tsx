import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  AlertTriangle,
  Ban,
  CalendarPlus,
  ChevronDown,
  History,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Container, EmptyState, Pill, Stepper, type StepperStep } from "@/components/system";
import { useFloatingBar } from "@/hooks/useFloatingLayer";
import { useItemVatRates } from "@/hooks/useItemVatRates";
import { useProgramStatus } from "@/hooks/useProgramStatus";
import { usePricingStructures } from "@/hooks/usePricing";
import { useAppSettings } from "@/hooks/useAppSettings";
import { resolveFeeStructure } from "@/lib/feeEngine";
import { calculateExclVat } from "@/lib/appSettings";
import { getItemEffectivePrice } from "@/lib/portalPricing";
import { deriveItemDisplayStatus, type ItemDisplayStatus } from "@/lib/itemStatus";
import { hasQuoteItemsAwaitingCustomerApproval } from "@/lib/customerQuoteApproval";
import { getCustomerActionableItems } from "@/lib/customerPortalStatus";
import { isMaatwerkProject } from "@/lib/projectOrigin";
import { downloadAllEvents } from "@/lib/calendarExport";
import { TEMP_ID_PREFIX } from "@/hooks/useCustomerProgram";
import { cn } from "@/lib/utils";
import type { ProgramRequestItem, ProgramRequestHistory } from "@/types/programRequest";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";
import { type PortalView } from "./ProgramNavigation";
import { TabHeader } from "./TabHeader";
import { buildTabHeader } from "./tabHeaderConfig";
import { DayBar, type DayBarDay, type DayStatus } from "./DayBar";
import { ProgramItemCard } from "./ProgramItemCard";
import { ProgramSidebar } from "./ProgramSidebar";
import { ActionRequiredCard } from "./ActionRequiredCard";
import { ReviewInviteCard } from "./ReviewInviteCard";
import { ProposalHeroCard } from "./ProposalHeroCard";
import { ProgramIntroCard } from "./ProgramIntroCard";
import { ProgramHistoryTimeline } from "./ProgramHistoryTimeline";
import { AddActivitySheet } from "./AddActivitySheet";
import { ProgramPdfDownload } from "./ProgramPdfDownload";
import { AccommodationSection } from "./AccommodationSection";
import { CompactBillingSection } from "./CompactBillingSection";
import { PaymentStatusCard } from "./PaymentStatusCard";
import { PracticalView } from "./PracticalView";
import { AcceptView } from "./AcceptView";
import { type AcceptedTermsEntry } from "./AcceptedTermsCard";

/**
 * Eén responsieve weergave van het klantportaal (fase 2 van
 * docs/plan-klantportaal-ontwerpsysteem.md), in plaats van de vroegere
 * desktop- en mobiele kopie. Het programma is één doorlopende tijdlijn met
 * dagkoppen, een plakkende dagbalk, toevoegen per dag, de onderdeelkaart
 * (`ProgramItemCard`) en een vaste opslaanbalk met "Versturen" en
 * "Ongedaan maken". De voortgang is een `Stepper`-band plus één melding
 * met de volgende stap. De andere tabbladen (logies, praktisch, facturatie,
 * akkoord) staan hier ook, in dezelfde schil met de zijbalk.
 */
export type ProgramSection = "accommodation" | "program" | "practical" | "billing" | "accept";

export interface ProgramViewProgram {
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
  origin?: string | null;
  quote_status?: string | null;
  excluded_fees?: string[] | null;
  quote_valid_until?: string | null;
  program_description?: string | null;
  program_published_at?: string | null;
  selected_dates?: string[] | null;
  completion_status?: string | null;
  cancelled_at?: string | null;
}

export interface ProgramViewProps {
  invoicingMode?: string;
  /** De ingevulde beoordeling van de klant (fase 4), voor de kaart na afloop. */
  customerReview?: { created_at: string; google_clicked_at: string | null } | null;
  initialSection?: ProgramSection;
  program: ProgramViewProgram;
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
  pendingChanges: { itemId: string }[];
  hasChanges: boolean;
  isPendingRemoval?: (itemId: string) => boolean;
  onUpdateItem: (itemId: string, updates: Partial<ProgramRequestItem>) => void;
  onRemoveItem: (itemId: string) => void;
  onAcceptItem: (itemId: string) => Promise<boolean>;
  onCounterProposal: (itemId: string, counterTime: string, counterNote: string) => Promise<boolean>;
  onOpenBilling: () => void;
  onOpenEdit: () => void;
  onOpenAccommodationSetup?: () => void;
  onOpenCancel: () => void;
  /** Verzamelde wijzigingen in één keer versturen (opent de bevestiging). */
  onSubmitChanges: () => void;
  /** Alle nog niet verstuurde wijzigingen terugdraaien. */
  onDiscardChanges: () => void;
  onAcceptTerms: (signatureName: string, underReservation?: boolean) => Promise<boolean>;
  /** Een activiteit toevoegen aan een dag. */
  onAddActivity: (blockId: string, dayIndex: number) => void;
  /** Tijdens het verblijf: de dag van vandaag, zodat de tijdlijn daar opent. */
  todayIndex?: number | null;
  // Logies
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
  accommodationExtrasByQuoteId?: Record<string, any[]>;
  onSelectAccommodationQuote: (quoteId: string, signatureName: string, acceptedTerms: boolean) => Promise<boolean>;
  // Offerte
  onAcceptQuoteProposal: () => Promise<boolean>;
  onApproveQuoteItem: (itemId: string) => Promise<boolean>;
  onBulkApproveQuoteItems?: () => Promise<{ approved: number; failed: number; autoSentToPartner: number }>;
  // Gastgegevens
  onOpenGuestDetails?: () => void;
  guestDetails?: {
    guest_names: string | null;
    dietary_notes: string | null;
    room_assignment: string | null;
    updated_at: string | null;
    showDietary: boolean;
    showRoomAssignment: boolean;
  };
  // Vooraf opgehaalde gegevens uit get-customer-program
  billingLinesByItem?: Record<string, any[]>;
  blockVatRates?: Record<string, number>;
  /** Som van billable wijzigingsrondes (uit get-customer-program). */
  revisionFeesTotal?: number;
  /** Naar een weergave; met `anchor` daarna naar dat element scrollen. */
  onNavigate?: (view: PortalView, anchor?: string) => void;
}

interface DayData extends DayBarDay {
  items: ProgramRequestItem[];
  totalIncl: number;
  totalExcl: number;
}

const money = (n: number) => n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** De tijd waarop de tijdlijn sorteert: bevestigd, anders het voorstel, anders de wens. */
const effectiveTime = (item: ProgramRequestItem): string | null => {
  if (item.confirmed_time) return item.confirmed_time;
  if (item.proposed_time && (item.status === "confirmed" || item.status === "alternative")) return item.proposed_time;
  if (item.preferred_time && item.preferred_time !== "flexibel") return item.preferred_time;
  return null;
};

const byTime = (a: ProgramRequestItem, b: ProgramRequestItem) => {
  const ta = effectiveTime(a);
  const tb = effectiveTime(b);
  if (!ta && !tb) return 0;
  if (!ta) return 1;
  if (!tb) return -1;
  return ta.localeCompare(tb);
};

const WAITING_STATUSES: ItemDisplayStatus[] = ["wacht_op_partner", "klant_akkoord_wacht_partner", "tegenvoorstel_klant"];
const DONE_STATUSES: ItemDisplayStatus[] = ["geaccepteerd", "klant_akkoord_bureau", "uitgevoerd", "self_arranged", "afgesloten_automatisch"];

/** De dagkop staat na een klik 144px (scroll-mt-36) onder de bovenrand; daaronder telt een dag als "in beeld". */
const SCROLL_LINE = 150;

export const ProgramView = ({
  customerReview,
  invoicingMode,
  initialSection,
  program,
  history,
  selectedDates,
  statusSummary,
  pendingChanges,
  hasChanges,
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
  onDiscardChanges,
  onAcceptTerms,
  onAddActivity,
  todayIndex = null,
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
}: ProgramViewProps) => {
  const section: ProgramSection = initialSection ?? "program";
  const [addDay, setAddDay] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [highlight, setHighlight] = useState<{ id: string; tick: number } | null>(null);
  const { settings: appSettings } = useAppSettings();

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
  const isCancelled = !!program.cancelled_at;
  // De wizard slaat "niet_gespecificeerd" op als er geen omschrijving is; dat is geen tekst voor de klant.
  const description = program.program_description?.trim();
  const showDescription = !!description && description.toLowerCase() !== "niet_gespecificeerd";
  const hasUnapprovedItems = hasQuoteItemsAwaitingCustomerApproval(program.items);
  const isProposalPhase = program.quote_status === "offerte_verstuurd";
  const isApprovalPhase = program.quote_status === "offerte_verstuurd" || program.quote_status === "akkoord_ontvangen";
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
    isPreApproval,
    customerActionsCount,
    alternativeActionsCount,
    newItemActionsCount,
    customerApprovedCount,
    customerApprovableTotal: customerApprovableCount,
    isPostExecution,
  } = useProgramStatus(program, accommodationQuotes, statusSummary, selectedDates);

  const readOnly = !isPublished || isPostExecution;
  const canAdd = !termsAccepted && isPublished && !isPostExecution && !isCancelled;

  // De opslaanbalk is een vaste balk onderaan; hij meldt zijn hoogte, zodat de
  // chatknop erboven staat en de inhoud er niet onder verdwijnt (pb-floating).
  const showSaveBar = section === "program" && hasChanges && isPublished && !isPostExecution;
  const saveBarRef = useRef<HTMLDivElement>(null);
  useFloatingBar(saveBarRef, showSaveBar);

  // De ankers staan op verschillende tabbladen; via onNavigate eerst daarheen.
  const goToAnchor = (view: PortalView, anchor: string) => {
    if (onNavigate) onNavigate(view, anchor);
    else document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
  };
  const hasActiveAccommodation = hasSelectedAccommodation || !!accommodation;

  const tabHeaderConfig = buildTabHeader({
    section,
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

  // Voortgang: drie stappen, de eerste die nog niet rond is licht op. Alles rond: geen band.
  const steps: StepperStep[] = [
    ...(isMultiDay ? [{ key: "lodging", label: "Logies" }] : []),
    { key: "program", label: "Programma" },
    { key: "accept", label: "Akkoord" },
  ];
  const lodgingDone = !isMultiDay || hasSelectedAccommodation;
  const programDone = allConfirmed || isPostExecution;
  const currentStep = isCancelled ? null : !lodgingDone ? "lodging" : !programDone ? "program" : !termsAccepted ? "accept" : null;

  // De dagen: onderdelen op volgorde van tijd, de stand per dag voor de dagbalk en het dagtotaal.
  const dayCount = Math.max(selectedDates.length, 1);
  const priceThresholds = useMemo(
    () => ({ pct: appSettings.price_change_reapproval_pct, absEur: appSettings.price_change_reapproval_abs_eur }),
    [appSettings.price_change_reapproval_pct, appSettings.price_change_reapproval_abs_eur],
  );
  const days: DayData[] = useMemo(() => {
    const timeline = program.items.filter((i) => i.status !== "cancelled" && i.day_index >= 0);
    return Array.from({ length: dayCount }, (_, index) => {
      const items = timeline.filter((i) => Math.min(i.day_index, dayCount - 1) === index).sort(byTime);
      let openCount = 0;
      let waitingCount = 0;
      let doneCount = 0;
      for (const item of items) {
        const derived = deriveItemDisplayStatus(item, {
          programPeople: program.number_of_people ?? 1,
          numberOfDays: dayCount,
          quoteStatus: program.quote_status ?? null,
          priceReapprovalThresholds: priceThresholds,
          isPostExecution,
        });
        const selfArranged = item.block_type === "self_arranged";
        if (!selfArranged && !isPostExecution && isApprovalPhase && (derived === "wacht_op_klant" || derived === "prijs_gewijzigd")) openCount++;
        else if (WAITING_STATUSES.includes(derived)) waitingCount++;
        else if (DONE_STATUSES.includes(derived)) doneCount++;
      }
      const status: DayStatus =
        openCount > 0 ? "open" : waitingCount > 0 ? "waiting" : items.length > 0 && doneCount === items.length ? "done" : "empty";
      const priced = items.filter((i) => i.quoted_price != null || i.admin_price_override != null);
      const totalIncl = priced.reduce((s, i) => s + getItemEffectivePrice(i, program.number_of_people), 0);
      const totalExcl = priced.reduce(
        (s, i) => s + calculateExclVat(getItemEffectivePrice(i, program.number_of_people), getItemVatRate(i)),
        0,
      );
      return {
        index,
        date: selectedDates[index] ?? null,
        count: items.length,
        status,
        openCount,
        waitingCount,
        isToday: todayIndex === index,
        items,
        totalIncl,
        totalExcl,
      };
    });
  }, [program.items, program.number_of_people, program.quote_status, dayCount, selectedDates, priceThresholds, isPostExecution, isApprovalPhase, getItemVatRate, todayIndex]);

  // De dagbalk volgt het scrollen: de laatste dagkop boven de lijn is de actieve dag.
  const [activeDayIndex, setActiveDayIndex] = useState(() => (todayIndex != null && todayIndex > 0 ? todayIndex : 0));
  const timelineRef = useRef<HTMLDivElement>(null);
  const programTab = section === "program";
  useEffect(() => {
    if (!programTab || dayCount <= 1) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const sections = timelineRef.current?.querySelectorAll<HTMLElement>("[data-day-section]");
      if (!sections?.length) return;
      let current = 0;
      sections.forEach((el) => {
        if (el.getBoundingClientRect().top <= SCROLL_LINE) current = Number(el.dataset.daySection);
      });
      setActiveDayIndex(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [programTab, dayCount]);

  // Tijdens het verblijf opent de tijdlijn bij vandaag.
  const openedAtToday = useRef(false);
  useEffect(() => {
    if (!programTab || openedAtToday.current || todayIndex == null || todayIndex <= 0 || dayCount <= 1) return;
    openedAtToday.current = true;
    document.getElementById(`dag-${todayIndex}`)?.scrollIntoView({ block: "start" });
    setActiveDayIndex(todayIndex);
  }, [programTab, todayIndex, dayCount]);

  const scrollToDay = (index: number) => {
    setActiveDayIndex(index);
    document.getElementById(`dag-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Na toevoegen of verplaatsen scrolt de tijdlijn mee en licht de kaart kort op.
  const knownIds = useRef<Set<string>>(new Set(program.items.map((i) => i.id)));
  useEffect(() => {
    const fresh = program.items.find((i) => i.id.startsWith(TEMP_ID_PREFIX) && !knownIds.current.has(i.id));
    knownIds.current = new Set(program.items.map((i) => i.id));
    if (fresh) setHighlight({ id: fresh.id, tick: Date.now() });
  }, [program.items]);
  useEffect(() => {
    if (!highlight) return;
    document.getElementById(`onderdeel-${highlight.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setHighlight(null), 3000);
    return () => window.clearTimeout(timer);
  }, [highlight]);
  const handleMoved = (itemId: string) => setHighlight({ id: itemId, tick: Date.now() });

  const exportAgenda = () => {
    const exportItems = program.items.filter((i) => i.status !== "cancelled" && i.day_index >= 0);
    downloadAllEvents(
      exportItems.map((i) => ({
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
      selectedDates.map((d) => format(d, "yyyy-MM-dd")),
      program.number_of_people,
      `Programma ${program.customer_company || program.customer_name}`,
    );
  };

  const addDayDate = addDay !== null ? selectedDates[addDay] ?? null : null;
  const showItemCount = !(isMaatwerkProject(program) && statusSummary.total === 0) && statusSummary.total > 0;

  const addButton = (dayIndex: number, label: string) => (
    <Button variant="outline" size="sm" onClick={() => setAddDay(dayIndex)}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),300px]">
      <div className="min-w-0 space-y-6">
        <TabHeader
          {...tabHeaderConfig}
          selectedDates={selectedDates}
          numberOfPeople={program.number_of_people}
          referenceNumber={program.reference_number}
          actions={
            programTab && !isPostExecution && !isCancelled ? (
              <Button variant="outline" size="sm" onClick={onOpenEdit}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Bewerken
              </Button>
            ) : undefined
          }
        />

        {programTab && showDescription && (
          <blockquote className="whitespace-pre-line border-l-2 border-primary/40 pl-4 text-sm text-muted-foreground">{description}</blockquote>
        )}

        {currentStep && (
          <div className="rounded-lg border bg-card px-4 py-3">
            <Stepper steps={steps} current={currentStep} />
          </div>
        )}

        {programTab && (
          <>
            {isPostExecution && <ReviewInviteCard reviewToken={program.review_token} review={customerReview} />}

            <ActionRequiredCard
              statusSummary={statusSummary}
              isMultiDay={isMultiDay}
              hasAccommodation={hasActiveAccommodation}
              billingComplete={billingComplete}
              termsAccepted={termsAccepted}
              onOpenBilling={onOpenBilling}
              onScrollToTerms={() => goToAnchor("accept", "terms-section")}
              onScrollToAccommodation={() => goToAnchor("accommodation", "accommodation")}
              programType={program.origin}
              quoteStatus={program.quote_status}
              programPublishedAt={program.program_published_at}
              customerActionsCount={customerActionsCount}
              alternativeActionsCount={alternativeActionsCount}
              newItemActionsCount={newItemActionsCount}
              pendingApprovalNames={getCustomerActionableItems(program.items, program.quote_status)
                .map((i) => i.block_name)
                .filter(Boolean)}
              guestDetailsIncomplete={
                !!guestDetails &&
                (!guestDetails.guest_names ||
                  (guestDetails.showDietary && !guestDetails.dietary_notes) ||
                  (guestDetails.showRoomAssignment && !guestDetails.room_assignment))
              }
              onOpenGuestDetails={onOpenGuestDetails}
              selectedDates={program.selected_dates ?? null}
              completionStatus={program.completion_status ?? null}
              cancelledAt={program.cancelled_at ?? null}
              onBulkApprove={onBulkApproveQuoteItems}
            />

            {isProposalPhase && (
              <ProposalHeroCard
                quoteValidUntil={program.quote_valid_until}
                hasUnapprovedItems={hasUnapprovedItems}
                onAcceptQuoteProposal={onAcceptQuoteProposal}
                bureauItemCount={bureauItemCount}
                partnerItemCount={partnerItemCount}
              />
            )}

            <ProgramIntroCard
              programType={program.origin}
              quoteStatus={program.quote_status}
              quoteValidUntil={program.quote_valid_until}
              termsAcceptedAt={program.terms_accepted_at}
              itemCount={activeItems.length}
              isMaatwerkEmpty={isMaatwerkProject(program) && program.items.length === 0}
              onAcceptQuoteProposal={onAcceptQuoteProposal}
              hasUnapprovedItems={hasUnapprovedItems}
              programPublishedAt={program.program_published_at}
              allConfirmed={allConfirmed}
              quotePdfUrl={(program as any).quote_pdf_url}
              isPostExecution={isPostExecution}
            />

            {/* Het programma: werkbalk, dagbalk en de doorlopende tijdlijn */}
            <div id="program" className="scroll-mt-20 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {showItemCount
                    ? `${statusSummary.total} onderde${statusSummary.total === 1 ? "el" : "len"}${dayCount > 1 ? ` op ${dayCount} dagen` : ""}`
                    : ""}
                </p>
                <div className="flex flex-wrap items-center gap-2">
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
                  {activeItems.length > 0 && (
                    <Button variant="outline" size="sm" onClick={exportAgenda}>
                      <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                      Agenda
                    </Button>
                  )}
                </div>
              </div>

              {program.items.length === 0 ? (
                <EmptyState
                  icon={<Sparkles />}
                  title="Bureau Vlieland is uw programma aan het samenstellen"
                  description="Zodra het programma klaar is, vindt u het hier terug."
                />
              ) : (
                <>
                  <DayBar days={days} activeIndex={activeDayIndex} onSelect={scrollToDay} />

                  <div ref={timelineRef} className="space-y-8">
                    {days.map((day) => (
                      <section
                        key={day.index}
                        id={`dag-${day.index}`}
                        data-day-section={day.index}
                        className="scroll-mt-36"
                        aria-labelledby={`dag-${day.index}-kop`}
                      >
                        <header className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b pb-2">
                          <div className="min-w-0">
                            <h2 id={`dag-${day.index}-kop`} className="font-display text-xl font-medium leading-tight">
                              {day.date ? capitalize(format(day.date, "EEEE d MMMM", { locale: nl })) : "Programma"}
                            </h2>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
                              {dayCount > 1 && (
                                <>
                                  <span>
                                    dag {day.index + 1} van {dayCount}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                </>
                              )}
                              <span>
                                {day.count} onderde{day.count === 1 ? "el" : "len"}
                              </span>
                              {day.isToday && <Pill tone="brand">vandaag</Pill>}
                            </p>
                          </div>
                          {canAdd && day.items.length > 0 && addButton(day.index, dayCount > 1 ? "Toevoegen aan deze dag" : "Toevoegen")}
                        </header>

                        {day.items.length === 0 ? (
                          <EmptyState
                            className="py-6"
                            title="Nog niets op deze dag"
                            description={
                              canAdd
                                ? "Voeg een activiteit toe, of laat het ons weten als u hulp wilt bij het kiezen."
                                : "Bureau Vlieland vult deze dag nog in."
                            }
                            action={canAdd ? addButton(day.index, "Toevoegen aan deze dag") : undefined}
                          />
                        ) : (
                          <div className="space-y-3">
                            {day.items.map((item) => (
                              <ProgramItemCard
                                key={item.id}
                                item={item}
                                selectedDates={selectedDates}
                                onUpdate={(updates) => onUpdateItem(item.id, updates)}
                                onRemove={() => onRemoveItem(item.id)}
                                onAccept={() => onAcceptItem(item.id)}
                                onCounterProposal={(counterTime, counterNote) => onCounterProposal(item.id, counterTime, counterNote)}
                                onApproveQuoteItem={() => onApproveQuoteItem(item.id)}
                                onMoved={handleMoved}
                                allItems={program.items}
                                hasChanges={pendingChanges.some((c) => c.itemId === item.id)}
                                invoicingMode={invoicingMode}
                                vatRate={getItemVatRate(item)}
                                isPreApproval={isPreApproval}
                                quoteStatus={program.quote_status}
                                isPostExecution={isPostExecution}
                                readOnly={readOnly}
                                numberOfPeople={program.number_of_people}
                                isPendingRemoval={isPendingRemoval ? isPendingRemoval(item.id) : false}
                                highlighted={highlight?.id === item.id}
                              />
                            ))}
                          </div>
                        )}

                        {day.totalIncl > 0 && (
                          <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                            <span className="text-muted-foreground">Dagtotaal</span>
                            <div className="text-right">
                              <span className="font-semibold">€{money(day.totalIncl)}</span>
                              <span className="ml-2 text-xs text-muted-foreground">excl. btw €{money(day.totalExcl)}</span>
                            </div>
                          </div>
                        )}
                      </section>
                    ))}
                  </div>
                </>
              )}
            </div>

            {history.length > 0 && (
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <div className="rounded-lg border bg-card">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <History className="h-4 w-4 text-primary" aria-hidden="true" />
                        Geschiedenis
                      </span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        {history.length} {history.length === 1 ? "gebeurtenis" : "gebeurtenissen"}
                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-fast", historyOpen && "rotate-180")} aria-hidden="true" />
                      </span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t px-4 py-3">
                    <ProgramHistoryTimeline history={history} variant="embedded" />
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {!isPostExecution && !isCancelled && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-card px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">Aanvraag annuleren</p>
                  <p className="text-sm text-muted-foreground">Alle aanbieders worden automatisch op de hoogte gesteld.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive-soft hover:text-destructive"
                  onClick={onOpenCancel}
                >
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  Aanvraag annuleren
                </Button>
              </div>
            )}

            {/* De opslaanbalk: wijzigingen verzamelen en in één keer versturen, zichtbaar onderaan */}
            {showSaveBar && (
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
                      <p className="text-sm">Verstuur ze in één keer. Tot die tijd gaan ze verloren als u de pagina ververst.</p>
                    </div>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button variant="outline" onClick={onDiscardChanges} className="flex-1 sm:flex-none">
                      <Undo2 className="h-4 w-4" aria-hidden="true" />
                      Ongedaan maken
                    </Button>
                    <Button onClick={onSubmitChanges} className="flex-1 sm:flex-none">
                      <Send className="h-4 w-4" aria-hidden="true" />
                      Versturen
                    </Button>
                  </div>
                </Container>
              </div>
            )}
          </>
        )}

        {section === "accommodation" && isMultiDay && (
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

        {section === "billing" && (
          <div className="space-y-6">
            <div id="billing" className="scroll-mt-20">
              <CompactBillingSection
                program={program}
                items={program.items}
                numberOfPeople={program.number_of_people}
                numberOfDays={selectedDates.length || 1}
                termsAccepted={termsAccepted}
                selectedAccommodationQuote={accommodationQuotes.find((q) => q.status === "selected")}
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
            {termsAccepted && <PaymentStatusCard items={program.items} termsAcceptedAt={program.terms_accepted_at!} />}
          </div>
        )}

        {section === "practical" && (
          <PracticalView
            program={program as any}
            selectedDates={selectedDates}
            guestDetails={guestDetails}
            onOpenGuestDetails={onOpenGuestDetails}
          />
        )}

        {section === "accept" && (
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

      <ProgramSidebar excludedFees={program.excluded_fees} />

      <AddActivitySheet
        open={addDay !== null}
        onOpenChange={(open) => {
          if (!open) setAddDay(null);
        }}
        existingBlockIds={program.items.map((item) => item.block_id).filter((id): id is string => id !== null)}
        onAddActivity={(blockId) => {
          if (addDay !== null) onAddActivity(blockId, addDay);
        }}
        dateIso={addDayDate ? format(addDayDate, "yyyy-MM-dd") : null}
        dayLabel={addDayDate && dayCount > 1 ? `${capitalize(format(addDayDate, "EEEE d MMMM", { locale: nl }))} (dag ${(addDay ?? 0) + 1} van ${dayCount})` : undefined}
        numberOfPeople={program.number_of_people}
      />
    </div>
  );
};
