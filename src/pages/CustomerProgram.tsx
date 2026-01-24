import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusSummary } from "@/components/customer-portal/StatusSummary";
import { CustomerProgramItem } from "@/components/customer-portal/CustomerProgramItem";
import { ChangeConfirmationDialog, type PendingChange } from "@/components/customer-portal/ChangeConfirmationDialog";
import { EditProgramDetailsDialog } from "@/components/customer-portal/EditProgramDetailsDialog";
import { CancelRequestDialog } from "@/components/customer-portal/CancelRequestDialog";
import { BillingDetailsCard } from "@/components/customer-portal/BillingDetailsCard";
import { BillingDetailsDialog, type BillingDetails } from "@/components/customer-portal/BillingDetailsDialog";
import { AcceptTermsCard } from "@/components/customer-portal/AcceptTermsCard";
import { ProgramHistoryTimeline } from "@/components/customer-portal/ProgramHistoryTimeline";
import { InvoiceProvidersCard } from "@/components/customer-portal/InvoiceProvidersCard";
import { DayTabs } from "@/components/configurator/DayTabs";
import { useCustomerProgram } from "@/hooks/useCustomerProgram";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  ArrowLeft, 
  Building2, 
  Calendar, 
  Users, 
  Mail, 
  Phone, 
  AlertCircle,
  Send,
  RefreshCw,
  Pencil,
  Ban
} from "lucide-react";
import logoImage from "@/assets/logo.png";

const CustomerProgram = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  
  const {
    program,
    history,
    isLoading,
    error,
    refetch,
    updateItem,
    removeItem,
    getPendingChanges,
    submitChanges,
    updateProgramDetails,
    updateBillingDetails,
    acceptTerms,
    cancelRequest,
    statusSummary,
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

  const handleAcceptTerms = async () => {
    const success = await acceptTerms();

    if (success) {
      toast({
        title: "Voorwaarden geaccepteerd",
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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Jouw Programma | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      {/* Simple header with logo */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="Bureau Vlieland" className="h-8" />
          </Link>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Vernieuwen
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Jouw Programma</h1>
          <p className="text-muted-foreground">
            {program.customer_company && `${program.customer_company} • `}
            {program.number_of_people} personen
          </p>
        </div>

        {/* Status summary */}
        <StatusSummary
          total={statusSummary.total}
          confirmed={statusSummary.confirmed}
          pending={statusSummary.pending}
          alternative={statusSummary.alternative}
          progress={statusSummary.progress}
          className="mb-6"
        />

        {/* Accept terms card - shows when all confirmed and terms not yet accepted */}
        {statusSummary.pending === 0 && 
         statusSummary.confirmed > 0 && 
         !(program as any).terms_accepted_at && (
          <AcceptTermsCard
            onAccept={handleAcceptTerms}
            isBillingComplete={!!(
              (program as any).billing_company_name &&
              (program as any).billing_address_street &&
              (program as any).billing_address_postal &&
              (program as any).billing_address_city &&
              (program as any).billing_contact_name
            )}
            onOpenBilling={() => setShowBillingDialog(true)}
          />
        )}

        {/* Billing details card */}
        <BillingDetailsCard 
          program={program as any} 
          onEdit={() => setShowBillingDialog(true)} 
        />

        {/* Invoice providers info */}
        <InvoiceProvidersCard items={program.items} className="mb-6" />

        {/* Program details card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Programma details</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowEditDialog(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Bewerken
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
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
          </CardContent>
        </Card>

        {/* Activities by day */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Activiteiten</h2>
          
          {selectedDates.length > 1 ? (
            <DayTabs
              selectedDates={selectedDates}
              activeDay={activeDay}
              onDayChange={setActiveDay}
              itemCountPerDay={itemCountPerDay}
            >
              {(dayIndex) => (
                <div className="space-y-3 mt-4">
                  {getItemsForDay(dayIndex).map((item) => (
                    <CustomerProgramItem
                      key={item.id}
                      item={item}
                      selectedDates={selectedDates}
                      onUpdate={(updates) => updateItem(item.id, updates)}
                      onRemove={() => removeItem(item.id)}
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
                .map((item) => (
                  <CustomerProgramItem
                    key={item.id}
                    item={item}
                    selectedDates={selectedDates}
                    onUpdate={(updates) => updateItem(item.id, updates)}
                    onRemove={() => removeItem(item.id)}
                    hasChanges={pendingChanges.some((c) => c.itemId === item.id)}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Submit changes button */}
        {hasChanges && (
          <div className="sticky bottom-4 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg mb-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {pendingChanges.length} wijziging{pendingChanges.length > 1 ? "en" : ""} om door te voeren
                </p>
                <p className="text-sm text-muted-foreground">
                  Aanbieders worden automatisch op de hoogte gesteld
                </p>
              </div>
              <Button onClick={() => setShowConfirmDialog(true)}>
                <Send className="h-4 w-4 mr-2" />
                Wijzigingen doorvoeren
              </Button>
            </div>
          </div>
        )}

        {/* History timeline */}
        {history.length > 0 && (
          <ProgramHistoryTimeline history={history} className="mb-8" />
        )}

        {/* Cancel request section */}
        <Card className="mb-8 border-destructive/20">
          <CardContent className="py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium mb-1 flex items-center gap-2">
                  <Ban className="h-4 w-4 text-destructive" />
                  Aanvraag annuleren
                </h3>
                <p className="text-sm text-muted-foreground">
                  Wil je de hele aanvraag annuleren? Alle aanbieders worden automatisch op de hoogte gesteld.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => setShowCancelDialog(true)}
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
                  Neem gerust contact met ons op. We helpen je graag verder.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a href="mailto:hallo@bureauvlieland.nl">
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      hallo@bureauvlieland.nl
                    </Button>
                  </a>
                  <a href="tel:+31562452700">
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      0562-452700
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
