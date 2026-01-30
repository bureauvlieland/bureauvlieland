import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeConfirmationDialog, type PendingChange } from "@/components/customer-portal/ChangeConfirmationDialog";
import { EditProgramDetailsDialog } from "@/components/customer-portal/EditProgramDetailsDialog";
import { CancelRequestDialog } from "@/components/customer-portal/CancelRequestDialog";
import { BillingDetailsDialog, type BillingDetails } from "@/components/customer-portal/BillingDetailsDialog";
import { ProgramNavigation } from "@/components/customer-portal/ProgramNavigation";
import { MobileProgramView } from "@/components/customer-portal/MobileProgramView";
import { DesktopProgramView } from "@/components/customer-portal/DesktopProgramView";
import { useCustomerProgram } from "@/hooks/useCustomerProgram";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  ArrowLeft, 
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import logoImage from "@/assets/logo.png";

const CustomerProgram = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
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
    updateBillingDetails,
    acceptTerms,
    cancelRequest,
    acceptItem,
    submitCounterProposal,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const pendingChanges = getPendingChanges();
  const hasChanges = pendingChanges.length > 0;

  // Parse dates
  const selectedDates = useMemo(() => {
    if (!program?.selected_dates) return [];
    return program.selected_dates.map((d: string) => {
      try {
        return parseISO(d);
      } catch {
        return new Date(d);
      }
    });
  }, [program?.selected_dates]);

  // Items per day
  const itemCountPerDay = useMemo(() => {
    if (!program?.items) return [];
    return selectedDates.map((_, dayIdx) => 
      program.items.filter((item) => item.day_index === dayIdx && item.status !== "cancelled").length
    );
  }, [program?.items, selectedDates]);

  // Get items for a specific day
  const getItemsForDay = (dayIndex: number) => {
    if (!program?.items) return [];
    return program.items
      .filter((item) => item.day_index === dayIndex && item.status !== "cancelled")
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

  const handleAcceptTerms = async (signatureName: string) => {
    const success = await acceptTerms(signatureName);

    if (success) {
      toast({
        title: "Boeking ondertekend",
        description: "Je boeking is nu definitief bevestigd. Je ontvangt een bevestigingsmail.",
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

  const handleCancelRequest = async (reason?: string) => {
    setIsCancelling(true);
    const success = await cancelRequest(reason);
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
        <Footer />
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
        <Footer />
      </div>
    );
  }

  // Date range for display
  const dateRange = selectedDates.length > 0
    ? selectedDates.length === 1
      ? format(selectedDates[0], "d MMMM yyyy", { locale: nl })
      : `${format(selectedDates[0], "d MMM", { locale: nl })} - ${format(selectedDates[selectedDates.length - 1], "d MMM yyyy", { locale: nl })}`
    : "";

  // Shared props for both views
  const viewProps = {
    program: program as any,
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
    onSubmitChanges: () => setShowConfirmDialog(true),
    onRefresh: refetch,
    onAcceptTerms: handleAcceptTerms,
    onAddActivity: addItem,
    // Accommodation
    accommodation,
    accommodationQuotes,
    onSelectAccommodationQuote: selectAccommodationQuote,
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Jouw Programma | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="Bureau Vlieland" className="h-8" />
          </Link>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="lg:hidden">
            <RefreshCw className="h-4 w-4 mr-2" />
            Vernieuwen
          </Button>
        </div>
      </header>

      {/* Desktop navigation - only show on lg screens */}
      {!isMobile && <ProgramNavigation />}

      <main className="container mx-auto px-4 py-8">

        {/* Responsive content */}
        {isMobile ? (
          <MobileProgramView {...viewProps} />
        ) : (
          <DesktopProgramView {...viewProps} />
        )}
      </main>

      <Footer />

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
      />

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
