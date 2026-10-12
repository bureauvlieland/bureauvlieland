import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Users, Calendar, Building2, Mail, Phone, MessageSquare, Archive, XCircle, FolderOpen, BedDouble } from "lucide-react";
import { GuestDetailsBlock } from "@/components/partner-portal/GuestDetailsBlock";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { usePartnerPortal } from "@/hooks/usePartnerPortal";
import { PartnerProjectItemRow } from "@/components/partner-portal/PartnerProjectItemRow";
import { PartnerItemSheet } from "@/components/partner-portal/PartnerItemSheet";
import { PartnerAccommodationQuoteSheet } from "@/components/partner-portal/PartnerAccommodationQuoteSheet";
import { ProjectChatPanel } from "@/components/partner-portal/ProjectChatPanel";
import { InvoiceRegistrationDialog } from "@/components/partner-portal/InvoiceRegistrationDialog";
import { BureauCentralBadge } from "@/components/partner-portal/BureauCentralBadge";
import { PartnerPostChargesSection } from "@/components/partner-portal/PartnerPostChargesSection";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { PartnerItem, PartnerAccommodationQuote } from "@/types/partner";
import { cn } from "@/lib/utils";
import { DismissProjectDialog } from "@/components/partner-portal/DismissProjectDialog";
import { canPartnerCloseProject, selectClosableProjectItems } from "@/lib/partnerProjectDismiss";
import { reportError } from "@/lib/errorReporting";
import { isPartnerInvoicingReleased } from "@/lib/partnerInvoicing";
import { formatEuro } from "@/lib/formatEuro";


type Mode = "activities" | "accommodation";

interface Props {
  mode: Mode;
  /** Alleen voor de referentiepagina: het project zonder route-parameter. */
  projectId?: string;
}

const PartnerProjectContent = ({ mode, projectId }: Props) => {
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const id = projectId ?? params.id;
  const { toast } = useToast();
  const { data, partner, partnerToken, urlSuffix, isLoading, error, refetch } = usePartnerPortal();
  const partnerId = partner.id;
  const partnerName = partner.name;
  const partnerEmail = partner.email;
  // "Terug" gaat naar waar u vandaan kwam (werkbank of projecten, met filters), anders naar de werkbank.
  const backTo = (location.state as { from?: string } | null)?.from ?? `/partner/werkbank${urlSuffix}`;

  const [selectedItem, setSelectedItem] = useState<PartnerItem | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showQuoteSheet, setShowQuoteSheet] = useState(false);
  const [showDismissProject, setShowDismissProject] = useState(false);

  // Find project data
  const projectItems = useMemo<PartnerItem[]>(() => {
    if (!data || mode !== "activities" || !id) return [];
    return data.items.filter((i) => i.request_id === id);
  }, [data, mode, id]);

  const dismissableProjectItems = useMemo(
    () =>
      projectItems.map((i) => ({
        id: i.id,
        status: i.status,
        invoiced_number: (i as { invoiced_number?: string | null }).invoiced_number ?? null,
        partner_dismissed_at: (i as { partner_dismissed_at?: string | null }).partner_dismissed_at ?? null,
        block_name: i.block_name,
      })),
    [projectItems],
  );
  const closableCount = useMemo(
    () => selectClosableProjectItems(dismissableProjectItems).length,
    [dismissableProjectItems],
  );
  const canCloseProject = useMemo(
    () => canPartnerCloseProject(dismissableProjectItems),
    [dismissableProjectItems],
  );



  const accommodationQuote = useMemo<PartnerAccommodationQuote | null>(() => {
    if (!data || mode !== "accommodation" || !id) return null;
    return (
      data.accommodationQuotes?.find((q) => q.accommodation_requests.id === id) ?? null
    );
  }, [data, mode, id]);

  const updateItemStatus = async (
    status: string,
    statusNote?: string,
    quotedPrice?: number,
    quotedNotes?: string,
    proposedTime?: string,
    proposedDate?: string
  ): Promise<boolean> => {
    if (!partnerToken || !selectedItem) return false;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-partner-item-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            partnerToken,
            itemId: selectedItem.id,
            status,
            statusNote,
            quotedPrice,
            quotedNotes,
            proposedTime,
            proposedDate,
          }),
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({} as Record<string, unknown>));
        throw new Error(
          (payload.details as string) || (payload.error as string) || "Kon status niet bijwerken.",
        );
      }
      toast({ title: "Status bijgewerkt" });
      await refetch();
      return true;
    } catch (e) {
      toast({
        title: "Status niet bijgewerkt",
        description: e instanceof Error ? e.message : "Kon status niet bijwerken.",
        variant: "destructive",
      });
      return false;
    }

  };

  const handleInvoiceRegister = async (
    amount: number,
    invoiceNumber: string,
    date: string,
    notes?: string
  ) => {
    if (!partnerToken || !selectedItem) return { success: false };
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-partner-invoice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            partnerToken,
            itemId: selectedItem.id,
            invoicedAmount: amount,
            invoicedNumber: invoiceNumber,
            invoicedDate: date,
            notes,
          }),
        }
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({} as any));
        throw new Error(errData?.error || "Kon factuur niet registreren.");
      }
      const result = await response.json();
      await refetch();
      setShowInvoiceDialog(false);
      setSelectedItem(null);
      return { success: true, commission: result.commission };
    } catch (err: any) {
      toast({ title: "Factuur niet geregistreerd", description: err?.message || "Probeer het opnieuw.", variant: "destructive" });
      return { success: false };
    }

  };

  const handleQuoteSubmit = async (quoteData: any) => {
    if (!accommodationQuote) return false;
    try {
      // Bijlage (offerte-PDF) uploaden, net als op /partner/logies; voorheen
      // werd het bestand hier stilzwijgend weggegooid.
      let attachmentPath: string | null = (accommodationQuote as any).quote_attachment_path ?? null;
      let attachmentFilename: string | null = (accommodationQuote as any).quote_attachment_filename ?? null;
      if (quoteData.attachmentFile && accommodationQuote.partner_id) {
        const file = quoteData.attachmentFile as File;
        const ext = file.name.split(".").pop() || "pdf";
        const filePath = `${accommodationQuote.partner_id}/${accommodationQuote.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("accommodation-quote-attachments")
          .upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        attachmentPath = filePath;
        attachmentFilename = file.name;
      }

      const { error } = await supabase
        .from("accommodation_quotes")
        .update({
          accommodation_name: quoteData.accommodationName,
          description: quoteData.description,
          price_total: quoteData.priceTotal,
          price_per_person_per_night: quoteData.pricePerPersonPerNight,
          price_includes_vat: quoteData.priceIncludesVat,
          vat_rate: quoteData.vatRate,
          includes: quoteData.includes,
          conditions: quoteData.conditions,
          valid_until: quoteData.validUntil,
          partner_notes: quoteData.partnerNotes,
          room_configuration: quoteData.roomConfiguration,
          images: quoteData.images ?? [],
          board_type: quoteData.boardType || null,
          board_notes: quoteData.boardNotes || null,
          quote_external_url: quoteData.quoteExternalUrl || null,
          quote_attachment_path: attachmentPath,
          quote_attachment_filename: attachmentFilename,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          // Een (herziene) offerte moet opnieuw naar de klant kunnen.
          forwarded_at: null,
          reset_reason: null,
        } as any)
        .eq("id", accommodationQuote.id);
      if (error) throw error;
      toast({ title: "Offerte ingediend" });
      await refetch();
      setShowQuoteSheet(false);
      return true;
    } catch {
      toast({ title: "Offerte niet ingediend", description: "Kon offerte niet indienen. Probeer het opnieuw.", variant: "destructive" });
      return false;
    }
  };

  const handleQuoteDecline = async (
    declineReason: string,
    proposedArrival?: string,
    proposedDeparture?: string
  ) => {
    if (!accommodationQuote) return false;
    try {
      // Status + werkbanktaak + historie lopen via de edge function (service role);
      // directe inserts in admin_todos/historie zouden door RLS stilletjes falen.
      const { data, error } = await supabase.functions.invoke("decline-accommodation-quote", {
        body: {
          quoteId: accommodationQuote.id,
          declineReason: declineReason || null,
          proposedArrival: proposedArrival ?? null,
          proposedDeparture: proposedDeparture ?? null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: data?.alternativeDates ? "Alternatieve datums verstuurd" : "Aanvraag afgewezen",
      });
      await refetch();
      setShowQuoteSheet(false);
      return true;
    } catch (err) {
      reportError(err, { where: "PartnerProject: Error declining quote" });
      toast({ title: "Aanvraag niet afgewezen", description: "Kon aanvraag niet afwijzen. Probeer het opnieuw.", variant: "destructive" });
      return false;
    }
  };

  if (isLoading || error) {
    return <PartnerPage title="Project" icon={mode === "activities" ? <FolderOpen /> : <BedDouble />} back={{ to: backTo }} loading={isLoading} error={error} />;
  }

  // ---------- Activities project ----------
  if (mode === "activities") {
    if (projectItems.length === 0) {
      return (
        <PartnerPage title="Project" icon={<FolderOpen />} back={{ to: backTo }} error="Dit project is niet gevonden of hoort niet bij uw account." />
      );
    }

    const first = projectItems[0];
    const req = first.program_requests;
    const dates = (req.selected_dates || []) as string[];
    const sorted = [...dates].sort();
    const arrival = sorted[0];
    const departure = sorted[sorted.length - 1];
    const isConceptProject = projectItems.every((i) => i.is_concept);
    const isCancelledProject = !!req.cancelled_at || req.status === "cancelled";
    const customerLabel = isConceptProject
      ? "Aanvraag in voorbereiding"
      : req.customer_company || req.customer_name;
    const isBureauCentral = req.invoicing_mode === "bureau_central";

    return (
      <>
        <PartnerPage
          title={customerLabel}
          icon={<FolderOpen />}
          back={{ to: backTo }}
          description={
            arrival
              ? departure && departure !== arrival
                ? `${format(parseISO(arrival), "EEEE d MMMM", { locale: nl })} tot ${format(parseISO(departure), "EEEE d MMMM yyyy", { locale: nl })}`
                : format(parseISO(arrival), "EEEE d MMMM yyyy", { locale: nl })
              : "Nog geen datum"
          }
          status={isCancelledProject ? { label: "Geannuleerd", tone: "danger" } : isConceptProject ? { label: "Concept", tone: "neutral" } : null}
        >

          {isConceptProject && (
            isCancelledProject ? (
              <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-destructive">Deze aanvraag is geannuleerd</p>
                  <p className="text-sm text-muted-foreground">
                    Geannuleerd voordat Bureau Vlieland 'm aan je had vrijgegeven. Er is geen actie nodig.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                <p className="font-medium">Concept — nog niet vrijgegeven door Bureau Vlieland</p>
                <p className="mt-1">
                  Deze aanvraag is in voorbereiding. Je kunt 'm vast bekijken; klantgegevens en acties komen
                  pas vrij zodra Bureau Vlieland de aanvraag officieel naar je verstuurt.
                </p>
              </div>
            )
          )}

          {/* Project info card */}
          <Card className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Aantal personen</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {req.number_of_people}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Aankomst</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {arrival ? format(parseISO(arrival), "d MMM", { locale: nl }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Vertrek</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {departure ? format(parseISO(departure), "d MMM", { locale: nl }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Referentie</p>
                <p className="font-medium">{req.reference_number || "—"}</p>
              </div>
            </div>

            {!isBureauCentral && !isConceptProject && (
              <div className="grid sm:grid-cols-2 gap-3 text-sm border-t pt-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{customerLabel}</span>
                </div>
                {req.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${req.customer_email}`} className="hover:underline">
                      {req.customer_email}
                    </a>
                  </div>
                )}
                {req.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${req.customer_phone}`} className="hover:underline">
                      {req.customer_phone}
                    </a>
                  </div>
                )}
              </div>
            )}

            {isBureauCentral && !isConceptProject && <BureauCentralBadge variant="compact" />}

            {!isConceptProject && (
              <GuestDetailsBlock
                guestNames={req.guest_names}
                dietaryNotes={req.dietary_notes}
              />
            )}

          </Card>

          {/* Items + chat in 2-col layout */}
          <div className={cn("grid gap-6", !isConceptProject && "lg:grid-cols-[1fr_400px]")}>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Onderdelen ({projectItems.length})</h2>
                {!isConceptProject && canCloseProject && (
                  <Button variant="outline" size="sm" onClick={() => setShowDismissProject(true)}>
                    <Archive className="h-4 w-4 mr-1.5" />
                    Project sluiten
                  </Button>
                )}
              </div>

              {isConceptProject ? (
                <Card className="divide-y">
                  {projectItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-4 opacity-70">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.block_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.duration ?? "—"}
                          {item.preferred_time && ` · voorkeur ${item.preferred_time}`}
                        </p>
                      </div>
                      <Badge
                        variant={isCancelledProject ? "destructive" : "outline"}
                        className={cn("shrink-0", !isCancelledProject && "border-dashed")}
                      >
                        {isCancelledProject ? "Geannuleerd" : "Concept"}
                      </Badge>
                    </div>
                  ))}
                </Card>
              ) : (
                projectItems.map((item) => (
                  <PartnerProjectItemRow
                    key={item.id}
                    item={item}
                    onStatusUpdate={async (status, note, qPrice, qNotes, pTime, pDate) => {
                      setSelectedItem(item);
                      return await (async () => {
                        if (!partnerToken) return false;
                        try {
                          const response = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-partner-item-status`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                              },
                              body: JSON.stringify({
                                partnerToken,
                                itemId: item.id,
                                status,
                                statusNote: note,
                                quotedPrice: qPrice,
                                quotedNotes: qNotes,
                                proposedTime: pTime,
                                proposedDate: pDate,
                              }),
                            }
                          );
                          if (!response.ok) {
                            const payload = await response
                              .json()
                              .catch(() => ({} as Record<string, unknown>));
                            throw new Error(
                              (payload.details as string) ||
                                (payload.error as string) ||
                                "Kon status niet bijwerken.",
                            );
                          }
                          toast({ title: "Status bijgewerkt" });
                          await refetch();
                          return true;
                        } catch (e) {
                          toast({
                            title: "Status niet bijgewerkt",
                            description: e instanceof Error ? e.message : "Kon status niet bijwerken.",
                            variant: "destructive",
                          });
                          return false;
                        }

                      })();
                    }}
                    onRegisterInvoice={() => {
                      setSelectedItem(item);
                      setShowInvoiceDialog(true);
                    }}
                    onOpenDetails={() => {
                      setSelectedItem(item);
                      setShowSheet(true);
                    }}
                  />
                ))
              )}
              {!isConceptProject && id && partnerId && (
                <PartnerPostChargesSection partnerId={partnerId} requestId={id} />
              )}
            </div>


            {!isConceptProject && (
              <div className="lg:sticky lg:top-6 lg:self-start">
                <ProjectChatPanel
                  partnerId={partnerId}
                  partnerName={partnerName}
                  partnerEmail={partnerEmail}
                  requestId={id}
                />
              </div>
            )}
          </div>
        </PartnerPage>

        <PartnerItemSheet
          item={selectedItem}
          isOpen={showSheet}
          onClose={() => {
            setShowSheet(false);
            setSelectedItem(null);
          }}
          onStatusUpdate={updateItemStatus}
          onRegisterInvoice={() => {
            setShowSheet(false);
            setShowInvoiceDialog(true);
          }}
          commissionPercentage={data?.partner.commission_percentage ?? 0}
        />

        {id && partnerToken && (
          <DismissProjectDialog
            open={showDismissProject}
            onOpenChange={setShowDismissProject}
            requestId={id}
            projectLabel={projectItems[0]?.program_requests?.reference_number || "dit project"}
            itemCount={closableCount}
            partnerToken={partnerToken}
            onDismissed={() => {
              void refetch();
            }}
          />
        )}


        <InvoiceRegistrationDialog
          isOpen={showInvoiceDialog}
          onClose={() => {
            setShowInvoiceDialog(false);
            setSelectedItem(null);
          }}
          onSubmit={handleInvoiceRegister}
          item={selectedItem}
          commissionPercentage={data?.partner.commission_percentage ?? 0}
          billingDetails={
            selectedItem && isPartnerInvoicingReleased(selectedItem.program_requests)
              ? {
                  billing_company_name: selectedItem.program_requests.billing_company_name,
                  billing_kvk_number: selectedItem.program_requests.billing_kvk_number,
                  billing_vat_number: selectedItem.program_requests.billing_vat_number,
                  billing_address_street: selectedItem.program_requests.billing_address_street,
                  billing_address_postal: selectedItem.program_requests.billing_address_postal,
                  billing_address_city: selectedItem.program_requests.billing_address_city,
                  billing_contact_name: selectedItem.program_requests.billing_contact_name,
                  billing_contact_email: selectedItem.program_requests.billing_contact_email,
                  billing_reference: selectedItem.program_requests.billing_reference,
                }
              : null
          }
        />
      </>
    );
  }

  // ---------- Accommodation project ----------
  if (!accommodationQuote) {
    return (
      <PartnerPage title="Logiesaanvraag" icon={<BedDouble />} back={{ to: backTo }} error="Deze logiesaanvraag is niet gevonden of hoort niet bij uw account." />
    );
  }

  const req = accommodationQuote.accommodation_requests;
  const customerLabel = req.customer_company || req.customer_name;
  const isBureauCentral = req.invoicing_mode === "bureau_central";

  const selectedRequest = {
    id: req.id,
    customer_name: req.customer_name,
    customer_email: req.customer_email,
    customer_phone: req.customer_phone,
    customer_company: req.customer_company,
    arrival_date: req.arrival_date,
    departure_date: req.departure_date,
    number_of_guests: req.number_of_guests,
    accommodation_type: req.accommodation_type,
    room_count: req.room_count,
    room_occupancy: null,
    room_types: req.room_types || [],
    location_preference: req.location_preference || [],
    budget_range: req.budget_range,
    special_requests: req.special_requests,
    wants_activities: false,
    status: req.status,
    created_at: req.created_at,
    linked_program_id: req.linked_program_id ?? null,
    invoicingMode: req.invoicing_mode ?? null,
    quote: {
      id: accommodationQuote.id,
      status: accommodationQuote.status,
      accommodation_name: accommodationQuote.accommodation_name,
      description: accommodationQuote.description,
      price_total: accommodationQuote.price_total,
      price_per_person_per_night: accommodationQuote.price_per_person_per_night,
      price_includes_vat: accommodationQuote.price_includes_vat,
      vat_rate: accommodationQuote.vat_rate,
      includes: accommodationQuote.includes,
      conditions: accommodationQuote.conditions,
      valid_until: accommodationQuote.valid_until,
      partner_notes: accommodationQuote.partner_notes,
      room_configuration: accommodationQuote.room_configuration as any,
      images: accommodationQuote.images ?? [],
      submitted_at: accommodationQuote.submitted_at,
      quote_attachment_path: accommodationQuote.quote_attachment_path,
      quote_attachment_filename: accommodationQuote.quote_attachment_filename,
      quote_external_url: accommodationQuote.quote_external_url,
      invoiced_amount: accommodationQuote.invoiced_amount,
      invoiced_number: accommodationQuote.invoiced_number,
      invoiced_date: accommodationQuote.invoiced_date,
      commission_percentage: accommodationQuote.commission_percentage,
      commission_amount: accommodationQuote.commission_amount,
    },
  };

  return (
    <>
      <PartnerPage
        title={customerLabel}
        icon={<BedDouble />}
        back={{ to: backTo }}
        description={`${format(parseISO(req.arrival_date), "EEEE d MMMM", { locale: nl })} tot ${format(parseISO(req.departure_date), "EEEE d MMMM yyyy", { locale: nl })}`}
      >

        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gasten</p>
              <p className="font-medium flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {req.number_of_guests}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Aankomst</p>
              <p className="font-medium">{format(parseISO(req.arrival_date), "d MMM", { locale: nl })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Vertrek</p>
              <p className="font-medium">{format(parseISO(req.departure_date), "d MMM", { locale: nl })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Type</p>
              <p className="font-medium">{req.accommodation_type}</p>
            </div>
          </div>

          {isBureauCentral && <BureauCentralBadge variant="compact" />}

          <GuestDetailsBlock
            guestNames={req.program_guest_names ?? null}
            roomAssignment={req.room_assignment ?? null}
            dietaryNotes={req.program_dietary_notes ?? req.special_requests}
          />

        </Card>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Offerte</h2>
            <Card className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">{accommodationQuote.accommodation_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Status:{" "}
                    {{
                      pending: "Nieuw — actie vereist",
                      submitted: "Verstuurd naar klant",
                      selected: "Gekozen door klant",
                      rejected: "Niet gekozen",
                      declined: "Door u afgewezen",
                      expired: "Verlopen",
                    }[accommodationQuote.status] || accommodationQuote.status}
                  </p>
                </div>
                <Button onClick={() => setShowQuoteSheet(true)} size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Openen
                </Button>
              </div>
              {accommodationQuote.price_total > 0 && (
                <p className="text-sm">
                  Totaal:{" "}
                  <span className="font-medium">
                    {formatEuro(accommodationQuote.price_total)}
                  </span>
                </p>
              )}
            </Card>

            {accommodationQuote.status === "selected" && partnerId && (
              <PartnerPostChargesSection
                partnerId={partnerId}
                accommodationRequestId={req.id}
              />
            )}
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <ProjectChatPanel
              partnerId={partnerId}
              partnerName={partnerName}
              partnerEmail={partnerEmail}
              accommodationId={req.id}
            />
          </div>
        </div>
      </PartnerPage>

      <PartnerAccommodationQuoteSheet
        isOpen={showQuoteSheet}
        onClose={() => setShowQuoteSheet(false)}
        request={selectedRequest}
        existingQuote={selectedRequest.quote}
        partnerToken={partnerToken || ""}
        partnerId={partnerId}
        partnerName={partnerName}
        onSubmit={handleQuoteSubmit}
        onDecline={handleQuoteDecline}
        onRefresh={refetch}
      />
    </>
  );
};

const PartnerProject = ({ mode }: Props) => (
  <PartnerLayout>
    <PartnerProjectContent mode={mode} />
  </PartnerLayout>
);

export { PartnerProjectContent };

export default PartnerProject;
