import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeConfirmationDialog, type PendingChange } from "@/components/customer-portal/ChangeConfirmationDialog";
import { EditProgramDetailsDialog } from "@/components/customer-portal/EditProgramDetailsDialog";
import { EditGuestDetailsDialog } from "@/components/customer-portal/EditGuestDetailsDialog";
import { CancelRequestDialog } from "@/components/customer-portal/CancelRequestDialog";
import { BillingDetailsSheet, type BillingDetails } from "@/components/customer-portal/BillingDetailsSheet";
import { ProgramNavigation, type PortalView } from "@/components/customer-portal/ProgramNavigation";
import { Container, Notice } from "@/components/system";
import { EditAccommodationSetupDialog } from "@/components/shared/EditAccommodationSetupDialog";
import { ProgramView } from "@/components/customer-portal/ProgramView";
import { CustomerPortalSplash } from "@/components/customer-portal/CustomerPortalSplash";
import { useCustomerProgram } from "@/hooks/useCustomerProgram";
import { getCustomerPortalStatus } from "@/lib/customerPortalStatus";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEventMode } from "@/hooks/useEventMode";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  X,
  Sparkles,
  Share2,
} from "lucide-react";
import logoImage from "@/assets/logo.png";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { TodayView } from "@/components/customer-portal/TodayView";
import { ProgramMap } from "@/components/customer-portal/ProgramMap";
import { MobileBottomNav, type BottomNavView } from "@/components/customer-portal/MobileBottomNav";
import { InstallPwaBanner } from "@/components/customer-portal/InstallPwaBanner";
import { ParticipantView } from "@/components/customer-portal/ParticipantView";
import { ShareWithParticipantsDialog } from "@/components/customer-portal/ShareWithParticipantsDialog";

const CustomerProgram = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { settings: appSettings } = useAppSettings();
  const [betaBannerDismissed, setBetaBannerDismissed] = useState(false);
  const [activeView, setActiveView] = useState<"splash" | "accommodation" | "program" | "practical" | "billing" | "accept" | "today" | "map">("splash");
  
  const {
    program,
    history,
    isLoading,
    error,
    refetch,
    updateItem,
    removeItem,
    addItem,
    getPendingChanges,
    submitChanges,
    discardChanges,
    isPendingRemoval,
    updateProgramDetails,
    updateGuestDetails,
    updateAccommodationSetup,
    updateBillingDetails,
    acceptTerms,
    cancelRequest,
    acceptItem,
    submitCounterProposal,
    acceptQuoteProposal,
    approveQuoteItem,
    bulkApproveQuoteItems,
    statusSummary,
    // Accommodation
    accommodation,
    accommodationQuotes,
    extrasByQuoteId,
    selectAccommodationQuote,
    billingLinesByItem,
    blockVatRates,
    revisionFeesTotal,
    customerReview,
  } = useCustomerProgram(token || "");


  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  // Aparte deelnemerscode: geeft alleen de deelnemersweergave, nooit deze klantpagina.
  const participantShareUrl = typeof window !== "undefined" && program?.participant_token
    ? `${window.location.origin}/programma-deelnemers/${program.participant_token}`
    : "";

  const pendingChanges = getPendingChanges();
  const hasChanges = pendingChanges.length > 0;

  // Optionele extra's vanuit OptionalAddOnsStrip triggeren een refresh
  useEffect(() => {
    const handler = () => { refetch(); };
    window.addEventListener("customer-program:refresh", handler);
    return () => window.removeEventListener("customer-program:refresh", handler);
  }, [refetch]);

  // Voorkom dat de klant per ongeluk een verwijdering/verplaatsing/tijd-wijziging
  // verliest door de tab te sluiten of te refreshen zonder op "Wijzigingen
  // opslaan" te klikken. De browser toont zelf een generieke bevestiging.
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);


  // Parse dates, with defensive check for items beyond the date array
  const selectedDates = useMemo(() => {
    if (!program?.selected_dates) return [];
    // selected_dates kan vrije strings bevatten ("7 juli") naast ISO-datums.
    // Filter ongeldige datums weg zodat date-fns format() niet crasht.
    const parsed = program.selected_dates
      .map((d: string) => {
        let date: Date;
        try {
          date = parseISO(d);
          if (isNaN(date.getTime())) date = new Date(d);
        } catch {
          date = new Date(d);
        }
        return date;
      })
      .filter((d: Date) => d instanceof Date && !isNaN(d.getTime()));

    // If items exist with a day_index beyond the dates array, generate placeholder dates
    if (program?.items && parsed.length > 0) {
      const maxDayIndex = Math.max(...program.items.filter((i: any) => i.status !== "cancelled").map((i: any) => i.day_index), -1);
      while (parsed.length <= maxDayIndex) {
        const lastDate = parsed[parsed.length - 1];
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 1);
        parsed.push(nextDate);
      }
    }

    return parsed;
  }, [program?.selected_dates, program?.items]);

  // Calculate provider count for cancellation dialog
  const uniqueProviders = useMemo(() => {
    if (!program?.items) return new Set<string>();
    return new Set(
      program.items
        .filter(item => item.status !== "cancelled" && item.block_type !== "self_arranged" && item.provider_email)
        .map(item => item.provider_id)
    );
  }, [program?.items]);

  const handleSubmitChanges = async () => {
    setIsSubmitting(true);
    const success = await submitChanges();
    setIsSubmitting(false);
    setShowConfirmDialog(false);

    if (success) {
      toast({
        title: "Wijzigingen opgeslagen",
        description: "De aanbieders zijn op de hoogte gesteld van uw wijzigingen.",
      });
    } else {
      toast({
        title: "Er ging iets mis",
        description: "Probeer het later opnieuw of neem contact met ons op.",
        variant: "destructive",
      });
    }
  };

  const handleSaveDetails = async (updates: { selectedDates?: Date[]; numberOfPeople?: number }) => {
    const success = await updateProgramDetails(updates);

    if (success) {
      toast({
        title: "Details bijgewerkt",
        description: updates.selectedDates 
          ? "Alle aanbieders zijn op de hoogte gesteld van de datumwijziging."
          : "Je wijzigingen zijn opgeslagen.",
      });
    } else {
      toast({
        title: "Er ging iets mis",
        description: "Probeer het later opnieuw of neem contact met ons op.",
        variant: "destructive",
      });
    }

    return success;
  };

  const handleSaveBillingDetails = async (details: BillingDetails) => {
    const success = await updateBillingDetails(details);

    if (success) {
      toast({
        title: "Facturatiegegevens opgeslagen",
        description: "Je gegevens zijn bijgewerkt.",
      });
    } else {
      toast({
        title: "Er ging iets mis",
        description: "Probeer het later opnieuw of neem contact met ons op.",
        variant: "destructive",
      });
    }

    return success;
  };

  const handleSaveGuestDetails = async (updates: { guest_names?: string | null; dietary_notes?: string | null; room_assignment?: string | null }) => {
    const success = await updateGuestDetails(updates);
    if (success) {
      toast({ title: "Wensen opgeslagen", description: "Bureau Vlieland en de aanbieders zien uw aanvullingen." });
    } else {
      toast({ title: "Er ging iets mis", description: "Probeer het later opnieuw.", variant: "destructive" });
    }
    return success;
  };

  const handleAcceptTerms = async (signatureName: string, underReservation?: boolean) => {
    const success = await acceptTerms(signatureName, underReservation);

    if (success) {
      toast({
        title: underReservation ? "Ondertekend onder voorbehoud" : "Boeking ondertekend",
        description: underReservation
          ? "Uw akkoord is vastgelegd. De onderdelen die nog op bevestiging wachten houden wij voor u in de gaten."
          : "Uw boeking is nu definitief bevestigd. U ontvangt een bevestigingsmail.",
      });

    } else {
      toast({
        title: "Er ging iets mis",
        description: "Probeer het later opnieuw of neem contact met ons op.",
        variant: "destructive",
      });
    }

    return success;
  };

  const handleCancelRequest = async (reason?: string, cancelAccommodation?: boolean) => {
    setIsCancelling(true);
    const success = await cancelRequest(reason, cancelAccommodation);
    setIsCancelling(false);
    setShowCancelDialog(false);

    if (success) {
      toast({
        title: "Aanvraag geannuleerd",
        description: "Alle betrokken aanbieders zijn op de hoogte gesteld.",
      });
    } else {
      toast({
        title: "Er ging iets mis",
        description: "Probeer het later opnieuw of neem contact met ons op.",
        variant: "destructive",
      });
    }
  };

  // Event-modus: automatisch + handmatige toggle (MOET vóór early returns)
  const eventMode = useEventMode(selectedDates, token ? `bv:event-mode:${token}` : undefined);

  // Preview/demo: ?eventmode=on of ?eventmode=off forceert de modus via de URL
  useEffect(() => {
    const param = searchParams.get("eventmode");
    if (param === "on") eventMode.setManualOverride("on");
    else if (param === "off") eventMode.setManualOverride("off");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Bij eerste render binnen het programma-venster: spring naar "Vandaag"
  useEffect(() => {
    if (eventMode.eventModeActive && activeView === "splash") {
      setActiveView("today");
    } else if (!eventMode.eventModeActive && (activeView === "today" || activeView === "map")) {
      // Terug uit de evenementmodus: die weergaven hebben dan geen tabblad meer.
      setActiveView("splash");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventMode.eventModeActive]);

  // Een anker op een ander tabblad: na het wisselen van weergave pas scrollen.
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingAnchor) return;
    const target = document.getElementById(pendingAnchor);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    setPendingAnchor(null);
  }, [pendingAnchor, activeView]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoImage} alt="Bureau Vlieland" className="h-8" />
            </Link>
          </div>
        </header>
        <main id="main-content" className="container mx-auto px-4 py-12 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-64 mb-8" />
          <Skeleton className="h-32 w-full mb-6" />
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    );
  }

  // Error state
  if (error || !program) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoImage} alt="Bureau Vlieland" className="h-8" />
            </Link>
          </div>
        </header>
        <main id="main-content" className="container mx-auto px-4 py-12 max-w-2xl text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Programma niet gevonden</h1>
          <p className="text-muted-foreground mb-6">
            {error || "Dit programma bestaat niet of is verlopen."}
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Terug naar home
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  // Navigate to a specific view
  // Decision 1: Splash always shown for multi-day (no localStorage skip)
  // Decision 2: Single-day → skip splash, go directly to program
  // Met een anker: staat het al op het scherm, dan direct scrollen; anders eerst
  // naar het tabblad waar het staat (voorwaarden op "accept", logies op "accommodation").
  const handleNavigate = (view: PortalView, anchor?: string) => {
    if (anchor) {
      const target = document.getElementById(anchor);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      setPendingAnchor(anchor);
      setActiveView(view);
      return;
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Date range for display
  const dateRange = selectedDates.length > 0
    ? selectedDates.length === 1
      ? format(selectedDates[0], "EEE d MMMM yyyy", { locale: nl })
      : `${format(selectedDates[0], "EEE d MMM", { locale: nl })} - ${format(selectedDates[selectedDates.length - 1], "EEE d MMM yyyy", { locale: nl })}`
    : "";

  // Props voor de ene weergave
  const invoicingMode = (program as any).invoicing_mode || "bureau_central";
  const isMultiDay = selectedDates.length > 1;

  // Determine which guest-details fields to show
  const hasCateringItems = (program.items || []).some(
    (i: any) => i.status !== "cancelled" && (i.block_category === "catering" || i.category === "catering")
  );
  const guestShowDietary = hasCateringItems;
  // Alleen met gekoppelde logies: zonder linked_accommodation_id wordt de kamerindeling niet opgeslagen.
  const guestShowRoomAssignment = !!accommodation;
  const guestDetails = {
    guest_names: (program as any).guest_names ?? null,
    dietary_notes: (program as any).dietary_notes ?? null,
    room_assignment: accommodation?.room_assignment ?? null,
    updated_at:
      (program as any).guest_details_updated_at ??
      (accommodation as any)?.guest_details_updated_at ??
      null,
    showDietary: guestShowDietary,
    showRoomAssignment: guestShowRoomAssignment,
  };

  const viewProps = {
    onNavigate: handleNavigate,
    program: program as any,
    customerReview,
    invoicingMode,
    history,
    selectedDates,
    statusSummary,
    pendingChanges,
    hasChanges,
    isPendingRemoval,
    onUpdateItem: updateItem,
    onRemoveItem: removeItem,
    onAcceptItem: acceptItem,

    onCounterProposal: submitCounterProposal,
    onOpenBilling: () => setShowBillingDialog(true),
    onOpenEdit: () => setShowEditDialog(true),
    onOpenCancel: () => setShowCancelDialog(true),
    onOpenGuestDetails: () => setShowGuestDialog(true),
    onOpenAccommodationSetup: () => setShowSetupDialog(true),
    guestDetails,
    onSubmitChanges: () => setShowConfirmDialog(true),
    onDiscardChanges: () => {
      discardChanges();
      toast({ title: "Wijzigingen ongedaan gemaakt", description: "Het programma staat weer zoals het was." });
    },
    onAcceptTerms: handleAcceptTerms,
    onAddActivity: (blockId: string, dayIndex: number) => addItem(blockId, dayIndex, null, ""),
    // Tijdens het verblijf opent de tijdlijn bij vandaag.
    todayIndex: eventMode.isEventDay ? eventMode.currentDayIndex : null,
    // Accommodation
    accommodation,
    accommodationQuotes,
    accommodationExtrasByQuoteId: extrasByQuoteId,
    onSelectAccommodationQuote: selectAccommodationQuote,
    // Quote proposal
    onAcceptQuoteProposal: acceptQuoteProposal,
    onApproveQuoteItem: approveQuoteItem,
    onBulkApproveQuoteItems: bulkApproveQuoteItems,
    // Pre-resolved server data (lock-down readiness)
    billingLinesByItem,
    blockVatRates,
    revisionFeesTotal,
  };

  // Decision 2: Single-day programs skip the splash and go directly to program
  const effectiveView = !isMultiDay && activeView === "splash" ? "program" : activeView;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Uw Programma | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Container size="full" className="py-3 sm:py-4 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logoImage} alt="Bureau Vlieland" className="h-7 sm:h-8" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Delen met deelnemers"
              onClick={() => setShowShareDialog(true)}
              title="Deel een deelnemers-versie van het programma (zonder facturatie en akkoord)"
            >
              <Share2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Delen met deelnemers</span>
            </Button>
            <Button
              variant={eventMode.eventModeActive ? "default" : "outline"}
              size="sm"
              aria-label="Deelnemersweergave"
              onClick={() =>
                eventMode.setManualOverride(eventMode.eventModeActive ? "off" : "on")
              }
              title="Deelnemersweergave: snel naar Vandaag, Kaart en tickets tijdens het verblijf"
            >
              <Sparkles className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Deelnemersweergave</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetch()} aria-label="Vernieuwen">
              <RefreshCw className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Vernieuwen</span>
            </Button>
          </div>
        </Container>
      </header>

      {/* Beta banner */}
      {appSettings.portal_beta_banner_enabled && !betaBannerDismissed && (
        <Container size="full" className="pt-4">
          <Notice tone="info">
            <div className="flex items-start gap-3">
              <p className="flex-1">
                <strong>Nieuwe klantomgeving.</strong> U kijkt naar onze vernieuwde klantomgeving. Mocht u ergens tegenaan lopen, dan horen wij dat graag via{" "}
                <a href="mailto:hallo@bureauvlieland.nl" className="underline font-medium">hallo@bureauvlieland.nl</a>.
              </p>
              <button
                type="button"
                onClick={() => setBetaBannerDismissed(true)}
                className="shrink-0 rounded-sm p-1 hover:bg-info/10"
                aria-label="Sluiten"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </Notice>
        </Container>
      )}

      {/* Deelnemersweergave: identiek aan wat deelnemers zien */}
      {eventMode.eventModeActive ? (
        <ParticipantView
          program={program}
          accommodation={accommodation}
          selectedDates={selectedDates}
          eventMode={eventMode}
          onExit={() => eventMode.setManualOverride("off")}
          onShare={() => setShowShareDialog(true)}
        />
      ) : (
      <>
      {/* Compute tab badges */}
      {(() => null)()}
      {(() => {
        const portalStatus = getCustomerPortalStatus({
          program: program as any,
          items: program.items,
          accommodationQuotes,
          selectedDates,
          hasAccommodationRequest: !!accommodation,
          guestDetails,
        });
        const { termsAccepted, customerActionsCount, isPostExecution } = portalStatus;
        const hasNewAccommodationQuote = accommodationQuotes.some((q) => q.status === "submitted")
          && !accommodationQuotes.some((q) => q.status === "selected");
        const hasSelectedAccommodation = accommodationQuotes.some((q) => q.status === "selected");
        const guestIncomplete = portalStatus.guestDetailsIncomplete;
        const allConfirmed = portalStatus.allConfirmed;
        const badges = {
          accommodation: hasNewAccommodationQuote
            ? { label: "Nieuw", tone: "warning" as const }
            : hasSelectedAccommodation
            ? { label: "✓", tone: "success" as const }
            : undefined,
          // Amber 'default' i.p.v. rood 'destructive': klantactie is geen alarm.
          // Het programma is gewoon klaar om te beoordelen.
          program: isPostExecution
            ? { label: "Uitgevoerd", tone: "success" as const }
            : customerActionsCount > 0
            ? { label: `${customerActionsCount} goed te keuren`, tone: "warning" as const }
            : undefined,
          practical: guestIncomplete
            ? { label: "Aanvullen", tone: "warning" as const }
            : undefined,
          accept: termsAccepted
            ? { label: "✓", tone: "success" as const }
            : allConfirmed && !isPostExecution
            ? { label: "Klaar", tone: "warning" as const }
            : undefined,
        };
        return (
          <ProgramNavigation
            isMultiDay={isMultiDay}
            activeView={effectiveView}
            onNavigate={handleNavigate}
            badges={badges}
            showEventTabs={eventMode.eventModeActive}
          />
        );
      })()}

      <Container as="main" id="main-content" size="full" className="pt-8 pb-floating">
        {/* Splash view — only for multi-day */}
        {effectiveView === "splash" && (
          <CustomerPortalSplash
            program={program as any}
            selectedDates={selectedDates}
            statusSummary={statusSummary}
            accommodation={accommodation}
            accommodationQuotes={accommodationQuotes}
            isMultiDay={isMultiDay}
            onNavigate={handleNavigate}
            onShareWithParticipants={() => setShowShareDialog(true)}
          />
        )}

        {/* Logies, programma, praktisch, facturatie en akkoord: één weergave op elk formaat */}
        {effectiveView === "accommodation" && isMultiDay && <ProgramView {...viewProps} initialSection="accommodation" />}
        {effectiveView === "program" && <ProgramView {...viewProps} initialSection="program" />}
        {effectiveView === "practical" && <ProgramView {...viewProps} initialSection="practical" />}
        {effectiveView === "billing" && <ProgramView {...viewProps} initialSection="billing" />}
        {effectiveView === "accept" && <ProgramView {...viewProps} initialSection="accept" />}

        {/* Today (event-modus) */}
        {effectiveView === "today" && (
          <TodayView
            selectedDates={selectedDates}
            items={program.items}
            currentDayIndex={eventMode.currentDayIndex}
            isUpcoming={eventMode.isUpcoming}
            numberOfPeople={program.number_of_people}
            customerCompany={(program as any).customer_company}
            customerName={program.customer_name}
          />
        )}

        {/* Map (event-modus) */}
        {effectiveView === "map" && (
          <ProgramMap
            items={program.items}
            selectedDates={selectedDates}
            accommodationLabel={(accommodation as any)?.partner_name || "Logies"}
            accommodationLat={(accommodation as any)?.location_lat ?? null}
            accommodationLng={(accommodation as any)?.location_lng ?? null}
            accommodationAddress={(accommodation as any)?.location_address ?? null}
          />
        )}
      </Container>
      </>
      )}

      {/* Extra bottom padding op mobile zodat content niet onder de bottom-nav valt */}
      {isMobile && <div className="h-16" />}

      {/* Mobile bottom nav — alleen tijdens event-modus */}
      {isMobile && eventMode.eventModeActive && (
        <MobileBottomNav
          active={
            (["today", "program", "map", "practical"].includes(effectiveView)
              ? (effectiveView as BottomNavView)
              : "today") as BottomNavView
          }
          onChange={(v) => handleNavigate(v)}
          badges={{
            program: getCustomerPortalStatus({
              program: program as any,
              items: program.items,
              accommodationQuotes,
              selectedDates,
              hasAccommodationRequest: !!accommodation,
              guestDetails,
            }).customerActionsCount > 0,
          }}
        />
      )}

      {/* PWA install hint — alleen mobiel + event-modus */}
      {isMobile && eventMode.eventModeActive && (
        <InstallPwaBanner programToken={token} />
      )}


      {/* Dialogs */}
      <ChangeConfirmationDialog
        isOpen={showConfirmDialog}
        onConfirm={handleSubmitChanges}
        onCancel={() => setShowConfirmDialog(false)}
        changes={pendingChanges as PendingChange[]}
        isSubmitting={isSubmitting}
      />

      {accommodation && (
        <EditAccommodationSetupDialog
          isOpen={showSetupDialog}
          onClose={() => setShowSetupDialog(false)}
          initialValue={{
            room_count: (accommodation as any).room_count ?? null,
            room_occupancy: (accommodation as any).room_occupancy ?? null,
            room_types: ((accommodation as any).room_types as string[]) || [],
            board_preference: (accommodation as any).board_preference ?? null,
          }}
          numberOfGuests={(accommodation as any).number_of_guests ?? program.number_of_people}
          onSave={updateAccommodationSetup}
        />
      )}

      <EditProgramDetailsDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        selectedDates={selectedDates}
        numberOfPeople={program.number_of_people}
        programDescription={program.program_description}
        hasActiveAccommodation={!!accommodation}
        capacityItems={(program.items || [])
          .filter((i: any) => i.status !== "cancelled")
          .map((i: any) => ({
            itemId: i.id,
            itemName: i.block_name,
            minPeople: i.block_min_people,
            maxPeople: i.block_max_people,
            overridePeople: i.override_people,
            status: i.status,
          }))}
        onSave={handleSaveDetails}
      />

      <CancelRequestDialog
        isOpen={showCancelDialog}
        onConfirm={handleCancelRequest}
        onCancel={() => setShowCancelDialog(false)}
        itemCount={program.items.filter(i => i.status !== "cancelled").length}
        providerCount={uniqueProviders.size}
        dateRange={dateRange}
        isSubmitting={isCancelling}
        hasLinkedAccommodation={!!accommodation}
      />

      <EditGuestDetailsDialog
        isOpen={showGuestDialog}
        onClose={() => setShowGuestDialog(false)}
        initialGuestNames={guestDetails.guest_names || ""}
        initialDietaryNotes={guestDetails.dietary_notes || ""}
        initialRoomAssignment={guestDetails.room_assignment || ""}
        showDietary={guestDetails.showDietary}
        showRoomAssignment={guestDetails.showRoomAssignment}
        onSave={handleSaveGuestDetails}
      />

      {/* Chat Widget */}
      {token && program && (
        <ChatWidget
          source="customer_portal"
          sourceToken={token}
          visitorName={program.customer_name}
          visitorEmail={program.customer_email}
          requestId={program.id}
          defaultOpen={searchParams.get("chat") === "open"}
        />
      )}

      <BillingDetailsSheet
        isOpen={showBillingDialog}
        onClose={() => setShowBillingDialog(false)}
        onSave={handleSaveBillingDetails}
        initialValues={{
          billing_company_name: (program as any).billing_company_name || "",
          billing_kvk_number: (program as any).billing_kvk_number || "",
          billing_vat_number: (program as any).billing_vat_number || "",
          billing_address_street: (program as any).billing_address_street || "",
          billing_address_postal: (program as any).billing_address_postal || "",
          billing_address_city: (program as any).billing_address_city || "",
          billing_country: (program as { billing_country?: string | null }).billing_country || "NL",
          billing_contact_name: (program as any).billing_contact_name || "",
          billing_contact_email: (program as any).billing_contact_email || "",
          billing_reference: (program as any).billing_reference || "",
        }}
      />

      <ShareWithParticipantsDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        shareUrl={participantShareUrl}
        programLabel={program?.reference_number || undefined}
      />
    </div>
  );
};

export default CustomerProgram;

