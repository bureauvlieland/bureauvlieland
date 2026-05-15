import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeConfirmationDialog, type PendingChange } from "@/components/customer-portal/ChangeConfirmationDialog";
import { EditProgramDetailsDialog } from "@/components/customer-portal/EditProgramDetailsDialog";
import { EditGuestDetailsDialog } from "@/components/customer-portal/EditGuestDetailsDialog";
import { CancelRequestDialog } from "@/components/customer-portal/CancelRequestDialog";
import { BillingDetailsDialog, type BillingDetails } from "@/components/customer-portal/BillingDetailsDialog";
import { ProgramNavigation } from "@/components/customer-portal/ProgramNavigation";
import { MobileProgramView } from "@/components/customer-portal/MobileProgramView";
import { DesktopProgramView } from "@/components/customer-portal/DesktopProgramView";
import { CustomerPortalSplash } from "@/components/customer-portal/CustomerPortalSplash";
import { useCustomerProgram } from "@/hooks/useCustomerProgram";
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
  Info,
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
    updateProgramDetails,
    updateGuestDetails,
    updateBillingDetails,
    acceptTerms,
    cancelRequest,
    acceptItem,
    submitCounterProposal,
    acceptQuoteProposal,
    approveQuoteItem,
    statusSummary,
    // Accommodation
    accommodation,
    accommodationQuotes,
    selectAccommodationQuote,
  } = useCustomerProgram(token || "");

  const [activeDay, setActiveDay] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const participantShareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/programma-deelnemers/${token}`
    : "";

  const pendingChanges = getPendingChanges();
  const hasChanges = pendingChanges.length > 0;

  // Parse dates, with defensive check for items beyond the date array
  const selectedDates = useMemo(() => {
    if (!program?.selected_dates) return [];
    const parsed = program.selected_dates.map((d: string) => {
      try {
        return parseISO(d);
      } catch {
        return new Date(d);
      }
    });

    // If items exist with a day_index beyond the dates array, generate placeholder dates
    if (program?.items) {
      const maxDayIndex = Math.max(...program.items.filter((i: any) => i.status !== "cancelled").map((i: any) => i.day_index), -1);
      while (parsed.length <= maxDayIndex && parsed.length > 0) {
        const lastDate = parsed[parsed.length - 1];
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 1);
        parsed.push(nextDate);
      }
    }

    return parsed;
  }, [program?.selected_dates, program?.items]);

  // Items per day
  const itemCountPerDay = useMemo(() => {
    if (!program?.items) return [];
    return selectedDates.map((_, dayIdx) => 
      program.items.filter((item) => item.day_index === dayIdx && item.day_index >= 0 && item.status !== "cancelled").length
    );
  }, [program?.items, selectedDates]);

  // Get items for a specific day (exclude overige kosten with day_index=-1)
  const getItemsForDay = (dayIndex: number) => {
    if (!program?.items) return [];
    return program.items
      .filter((item) => item.day_index === dayIndex && item.day_index >= 0 && item.status !== "cancelled")
      .sort((a, b) => {
        if (!a.preferred_time && !b.preferred_time) return 0;
        if (!a.preferred_time) return 1;
        if (!b.preferred_time) return -1;
        return a.preferred_time.localeCompare(b.preferred_time);
      });
  };

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
        description: "De aanbieders zijn op de hoogte gesteld van je wijzigingen.",
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

  const handleAcceptTerms = async (signatureName: string) => {
    const success = await acceptTerms(signatureName);

    if (success) {
      toast({
        title: "Boeking ondertekend",
        description: "Uw boeking is nu definitief bevestigd. U ontvangt een bevestigingsmail.",
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventMode.eventModeActive]);

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
        <main className="container mx-auto px-4 py-12 max-w-4xl">
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
        <main className="container mx-auto px-4 py-12 max-w-2xl text-center">
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
  const handleNavigate = (view: "splash" | "accommodation" | "program" | "practical" | "billing" | "accept" | "today" | "map") => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Date range for display
  const dateRange = selectedDates.length > 0
    ? selectedDates.length === 1
      ? format(selectedDates[0], "EEE d MMMM yyyy", { locale: nl })
      : `${format(selectedDates[0], "EEE d MMM", { locale: nl })} - ${format(selectedDates[selectedDates.length - 1], "EEE d MMM yyyy", { locale: nl })}`
    : "";

  // Shared props for both views
  const invoicingMode = (program as any).invoicing_mode || "bureau_central";
  const isMultiDay = selectedDates.length > 1;

  // Determine which guest-details fields to show
  const hasCateringItems = (program.items || []).some(
    (i: any) => i.status !== "cancelled" && (i.block_category === "catering" || i.category === "catering")
  );
  const guestShowDietary = hasCateringItems;
  const guestShowRoomAssignment = isMultiDay || !!accommodation;
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
    program: program as any,
    invoicingMode,
    history,
    selectedDates,
    statusSummary,
    activeDay,
    onDayChange: setActiveDay,
    itemCountPerDay,
    getItemsForDay,
    pendingChanges,
    hasChanges,
    onUpdateItem: updateItem,
    onRemoveItem: removeItem,
    onAcceptItem: acceptItem,
    onCounterProposal: submitCounterProposal,
    onOpenBilling: () => setShowBillingDialog(true),
    onOpenEdit: () => setShowEditDialog(true),
    onOpenCancel: () => setShowCancelDialog(true),
    onOpenGuestDetails: () => setShowGuestDialog(true),
    guestDetails,
    onSubmitChanges: () => setShowConfirmDialog(true),
    onRefresh: refetch,
    onAcceptTerms: handleAcceptTerms,
    onAddActivity: (blockId: string) => addItem(blockId, activeDay, null, ""),
    // Accommodation
    accommodation,
    accommodationQuotes,
    onSelectAccommodationQuote: selectAccommodationQuote,
    // Quote proposal
    onAcceptQuoteProposal: acceptQuoteProposal,
    onApproveQuoteItem: approveQuoteItem,
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
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logoImage} alt="Bureau Vlieland" className="h-7 sm:h-8" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Delen met deelnemers"
              onClick={async () => {
                const url = `${window.location.origin}/programma-deelnemers/${token}`;
                // Try Web Share API first (mainly mobile)
                if (typeof navigator !== "undefined" && (navigator as any).share) {
                  try {
                    await (navigator as any).share({
                      title: "Programma Bureau Vlieland",
                      text: "Hier is ons programma op Vlieland:",
                      url,
                    });
                    return;
                  } catch (err: any) {
                    if (err?.name === "AbortError") return; // user cancelled
                    // fall through to clipboard
                  }
                }
                // Try modern clipboard API
                let copied = false;
                try {
                  await navigator.clipboard.writeText(url);
                  copied = true;
                } catch {
                  // Fallback: hidden textarea + execCommand (works in iframes)
                  try {
                    const ta = document.createElement("textarea");
                    ta.value = url;
                    ta.style.position = "fixed";
                    ta.style.opacity = "0";
                    document.body.appendChild(ta);
                    ta.focus();
                    ta.select();
                    copied = document.execCommand("copy");
                    document.body.removeChild(ta);
                  } catch {
                    copied = false;
                  }
                }
                if (copied) {
                  toast({
                    title: "Link gekopieerd",
                    description: "Plak de link in WhatsApp of e-mail om met deelnemers te delen.",
                  });
                } else {
                  // Last resort: show the URL so the user can copy manually
                  window.prompt("Kopieer deze link om te delen met deelnemers:", url);
                }
              }}
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
            <Button variant="ghost" size="sm" onClick={() => refetch()} aria-label="Vernieuwen" className="lg:hidden">
              <RefreshCw className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Vernieuwen</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Beta banner */}
      {appSettings.portal_beta_banner_enabled && !betaBannerDismissed && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="container mx-auto px-4 py-3 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 flex-1">
              <strong>Nieuw! Vernieuwde klantomgeving</strong> — Wij werken momenteel met een volledig vernieuwde klantomgeving. Mocht u ergens tegenaan lopen, dan horen wij dat graag via{" "}
              <a href="mailto:hallo@bureauvlieland.nl" className="underline font-medium">hallo@bureauvlieland.nl</a>.
            </p>
            <button
              onClick={() => setBetaBannerDismissed(true)}
              className="text-blue-600 hover:text-blue-800 flex-shrink-0"
              aria-label="Sluiten"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Deelnemersweergave: identiek aan wat deelnemers zien */}
      {eventMode.eventModeActive ? (
        <ParticipantView
          program={program}
          accommodation={accommodation}
          selectedDates={selectedDates}
          eventMode={eventMode}
        />
      ) : (
      <>
      {/* Compute tab badges */}
      {(() => null)()}
      {(() => {
        const termsAccepted = !!(program as any).terms_accepted_at;
        const actionCount = statusSummary.pending + statusSummary.alternative + (statusSummary.counter_proposed || 0);
        const hasNewAccommodationQuote = accommodationQuotes.some((q) => q.status === "submitted")
          && !accommodationQuotes.some((q) => q.status === "selected");
        const hasSelectedAccommodation = accommodationQuotes.some((q) => q.status === "selected");
        const guestIncomplete = !!guestDetails && (
          !guestDetails.guest_names ||
          (guestDetails.showDietary && !guestDetails.dietary_notes) ||
          (guestDetails.showRoomAssignment && !guestDetails.room_assignment)
        );
        const allConfirmed = statusSummary.total > 0
          && statusSummary.pending === 0
          && statusSummary.alternative === 0
          && (statusSummary.counter_proposed || 0) === 0;
        const badges = {
          accommodation: hasNewAccommodationQuote
            ? { label: "Nieuw", variant: "destructive" as const }
            : hasSelectedAccommodation
            ? { label: "✓", variant: "secondary" as const }
            : undefined,
          program: actionCount > 0
            ? { label: `${actionCount} actie${actionCount > 1 ? "s" : ""}`, variant: "destructive" as const }
            : undefined,
          practical: guestIncomplete
            ? { label: "Aanvullen", variant: "outline" as const }
            : undefined,
          accept: termsAccepted
            ? { label: "✓", variant: "secondary" as const }
            : allConfirmed
            ? { label: "Klaar", variant: "destructive" as const }
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

      <main className="container mx-auto px-4 py-8">
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
          />
        )}

        {/* Accommodation view */}
        {effectiveView === "accommodation" && isMultiDay && (
          isMobile ? (
            <MobileProgramView {...viewProps} initialSection="accommodation" />
          ) : (
            <DesktopProgramView {...viewProps} initialSection="accommodation" />
          )
        )}

        {/* Program view */}
        {effectiveView === "program" && (
          isMobile ? (
            <MobileProgramView {...viewProps} initialSection="program" />
          ) : (
            <DesktopProgramView {...viewProps} initialSection="program" />
          )
        )}

        {/* Practical view */}
        {effectiveView === "practical" && (
          isMobile ? (
            <MobileProgramView {...viewProps} initialSection="practical" />
          ) : (
            <DesktopProgramView {...viewProps} initialSection="practical" />
          )
        )}

        {/* Billing as separate tab */}
        {effectiveView === "billing" && (
          isMobile ? (
            <MobileProgramView {...viewProps} initialSection="billing" />
          ) : (
            <DesktopProgramView {...viewProps} initialSection="billing" />
          )
        )}

        {/* Accept (akkoord) view */}
        {effectiveView === "accept" && (
          isMobile ? (
            <MobileProgramView {...viewProps} initialSection="accept" />
          ) : (
            <DesktopProgramView {...viewProps} initialSection="accept" />
          )
        )}

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
      </main>
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
            program:
              statusSummary.pending + statusSummary.alternative + (statusSummary.counter_proposed || 0) >
              0,
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

      <EditProgramDetailsDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        selectedDates={selectedDates}
        numberOfPeople={program.number_of_people}
        programDescription={program.program_description}
        hasActiveAccommodation={!!accommodation}
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

      <BillingDetailsDialog
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
          billing_contact_name: (program as any).billing_contact_name || "",
          billing_contact_email: (program as any).billing_contact_email || "",
          billing_reference: (program as any).billing_reference || "",
        }}
      />
    </div>
  );
};

export default CustomerProgram;

