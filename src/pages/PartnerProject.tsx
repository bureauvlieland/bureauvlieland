import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Users, Calendar, Building2, Mail, Phone, MessageSquare, Archive, FolderOpen, BedDouble } from "lucide-react";
import { GuestDetailsBlock } from "@/components/partner-portal/GuestDetailsBlock";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { usePartnerPortal } from "@/hooks/usePartnerPortal";
import { PartnerItemCard } from "@/components/partner-portal/PartnerItemCard";
import { DayBar, type DayBarDay, type DayStatus } from "@/components/customer-portal/DayBar";
import { EmptyState, FactList, Notice, Pill } from "@/components/system";
import { deriveItemDisplayStatusLoose } from "@/lib/itemStatus";
import { OTHER_TURN_STATUSES, PARTNER_TURN_STATUSES } from "@/lib/partnerProjectStatus";
import { PartnerItemSheet } from "@/components/partner-portal/PartnerItemSheet";
import { PartnerAccommodationQuoteSheet } from "@/components/partner-portal/PartnerAccommodationQuoteSheet";
import { ProjectChatPanel } from "@/components/partner-portal/ProjectChatPanel";
import { InvoiceRegistrationDialog } from "@/components/partner-portal/InvoiceRegistrationDialog";
import { BureauCentralBadge } from "@/components/partner-portal/BureauCentralBadge";
import { PartnerPostChargesSection } from "@/components/partner-portal/PartnerPostChargesSection";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const { data, partner, partnerToken, urlSuffix, isLoading, error, refetch, isDemo } = usePartnerPortal();
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
  const [activeDay, setActiveDay] = useState(0);

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

  const postItemStatus = async (
    itemId: string,
    status: string,
    statusNote?: string,
    quotedPrice?: number,
    quotedNotes?: string,
    proposedTime?: string,
    proposedDate?: string,
  ): Promise<boolean> => {
    if (!partnerToken) return false;
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-partner-item-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ partnerToken, itemId, status, statusNote, quotedPrice, quotedNotes, proposedTime, proposedDate }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}) as Record<string, unknown>);
        throw new Error((payload.details as string) || (payload.error as string) || "Kon status niet bijwerken.");
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

  const updateItemStatus = (status: string, statusNote?: string, quotedPrice?: number, quotedNotes?: string, proposedTime?: string, proposedDate?: string) =>
    selectedItem ? postItemStatus(selectedItem.id, status, statusNote, quotedPrice, quotedNotes, proposedTime, proposedDate) : Promise.resolve(false);

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
    const customerLabel = isConceptProject ? "Aanvraag in voorbereiding" : req.customer_company || req.customer_name;
    const isBureauCentral = req.invoicing_mode === "bureau_central";

    // Dezelfde dagindeling als de klant: één tijdlijn met dagkoppen en een dagbalk.
    const dayCount = Math.max(sorted.length, 1);
    const timeOf = (i: PartnerItem) => i.confirmed_time || i.proposed_time || i.preferred_time || "99:99";
    const days: (DayBarDay & { items: PartnerItem[] })[] = Array.from({ length: dayCount }, (_, index) => {
      const items = projectItems.filter((i) => Math.min(i.day_index, dayCount - 1) === index).sort((a, b) => timeOf(a).localeCompare(timeOf(b)));
      const statuses = items.map((i) => deriveItemDisplayStatusLoose(i, { audience: "partner" }));
      const openCount = statuses.filter((st) => PARTNER_TURN_STATUSES.has(st)).length;
      const waitingCount = statuses.filter((st) => OTHER_TURN_STATUSES.has(st)).length;
      const status: DayStatus = items.length === 0 ? "empty" : openCount > 0 ? "open" : waitingCount > 0 ? "waiting" : "done";
      return { index, date: sorted[index] ? parseISO(sorted[index]) : new Date(NaN), count: items.length, status, openCount, waitingCount, items };
    });
    const selectDay = (index: number) => {
      setActiveDay(index);
      document.getElementById(`partner-dag-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const facts = [
      { label: "Personen", value: `${req.number_of_people}`, icon: Users },
      ...(arrival && departure && departure !== arrival
        ? [
            { label: "Aankomst", value: format(parseISO(arrival), "EEEE d MMMM", { locale: nl }), icon: Calendar },
            { label: "Vertrek", value: format(parseISO(departure), "EEEE d MMMM", { locale: nl }), icon: Calendar },
          ]
        : [{ label: "Datum", value: arrival ? format(parseISO(arrival), "EEEE d MMMM yyyy", { locale: nl }) : "Nog niet bekend", icon: Calendar }]),
      ...(req.reference_number ? [{ label: "Referentie", value: req.reference_number }] : []),
    ];

    const renderItems = (items: PartnerItem[]) =>
      items.map((item) => (
        <PartnerItemCard
          key={item.id}
          item={item}
          showDate={dayCount <= 1}
          onOpen={() => {
            setSelectedItem(item);
            setShowSheet(true);
          }}
          onRegisterInvoice={() => {
            setSelectedItem(item);
            setShowInvoiceDialog(true);
          }}
          onStatusUpdate={(status, note, qPrice, qNotes) => postItemStatus(item.id, status, note, qPrice, qNotes)}
        />
      ));

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
          actions={
            !isConceptProject && canCloseProject ? (
              <Button variant="outline" size="sm" onClick={() => setShowDismissProject(true)}>
                <Archive className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Project sluiten
              </Button>
            ) : undefined
          }
        >
          {isConceptProject &&
            (isCancelledProject ? (
              <Notice tone="danger" title="Deze aanvraag is geannuleerd">
                <p>Geannuleerd voordat Bureau Vlieland hem aan u had vrijgegeven. U hoeft niets te doen.</p>
              </Notice>
            ) : (
              <Notice tone="info" title="Concept: nog niet vrijgegeven door Bureau Vlieland">
                <p>Deze aanvraag is in voorbereiding. U kunt hem vast bekijken; de klantgegevens en de acties komen vrij zodra Bureau Vlieland de aanvraag naar u verstuurt.</p>
              </Notice>
            ))}

          <div className={cn("grid gap-6", !isConceptProject && "lg:grid-cols-[1fr_320px]")}>
            <div className="space-y-4">
              {isConceptProject ? (
                <ul className="divide-y rounded-lg border bg-card">
                  {projectItems.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 p-4 opacity-70">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.block_name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[item.duration, item.preferred_time ? `voorkeur ${item.preferred_time}` : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <Pill tone={isCancelledProject ? "danger" : "neutral"} className="shrink-0">
                        {isCancelledProject ? "Geannuleerd" : "Concept"}
                      </Pill>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-xl font-medium">Uw onderdelen ({projectItems.length})</h2>
                  </div>
                  {dayCount > 1 && <DayBar days={days} activeIndex={activeDay} onSelect={selectDay} className="top-0" />}
                  {dayCount > 1 ? (
                    days.map((day) => (
                      <section key={day.index} id={`partner-dag-${day.index}`} aria-labelledby={`partner-dag-${day.index}-kop`} className="scroll-mt-24 space-y-3">
                        <div>
                          <h3 id={`partner-dag-${day.index}-kop`} className="font-display text-lg font-medium leading-tight">
                            {Number.isNaN(day.date.getTime()) ? `Dag ${day.index + 1}` : format(day.date, "EEEE d MMMM", { locale: nl })}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            dag {day.index + 1} van {dayCount} · {day.count === 1 ? "1 onderdeel van u" : `${day.count} onderdelen van u`}
                          </p>
                        </div>
                        {day.items.length > 0 ? renderItems(day.items) : <EmptyState title="Geen onderdelen van u op deze dag" />}
                      </section>
                    ))
                  ) : (
                    renderItems(days[0].items)
                  )}
                  {id && partnerId && !isDemo && <PartnerPostChargesSection partnerId={partnerId} requestId={id} />}
                </>
              )}
            </div>

            {!isConceptProject && (
              <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                <FactList items={facts} />
                <div className="rounded-lg border bg-card p-4 text-sm">
                  <h3 className="mb-2 font-medium">Klant</h3>
                  {isBureauCentral ? (
                    <BureauCentralBadge variant="compact" />
                  ) : (
                    <ul className="space-y-1.5">
                      <li className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        {customerLabel}
                      </li>
                      {req.customer_email && (
                        <li className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <a href={`mailto:${req.customer_email}`} className="hover:underline">
                            {req.customer_email}
                          </a>
                        </li>
                      )}
                      {req.customer_phone && (
                        <li className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <a href={`tel:${req.customer_phone}`} className="hover:underline">
                            {req.customer_phone}
                          </a>
                        </li>
                      )}
                    </ul>
                  )}
                  <div className="mt-3 border-t pt-3">
                    <GuestDetailsBlock guestNames={req.guest_names} dietaryNotes={req.dietary_notes} />
                  </div>
                </div>
                {isDemo ? (
                  <EmptyState icon={<MessageSquare />} title="Berichten met Bureau Vlieland" description="In deze referentie staan geen berichten." />
                ) : (
                  <ProjectChatPanel partnerId={partnerId} partnerName={partnerName} partnerEmail={partnerEmail} requestId={id} />
                )}
              </aside>
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
