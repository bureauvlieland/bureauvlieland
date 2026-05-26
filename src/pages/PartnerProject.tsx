import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Users, Calendar, Building2, Mail, Phone, MessageSquare } from "lucide-react";
import { GuestDetailsBlock } from "@/components/partner-portal/GuestDetailsBlock";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerProjectItemRow } from "@/components/partner-portal/PartnerProjectItemRow";
import { PartnerItemSheet } from "@/components/partner-portal/PartnerItemSheet";
import { PartnerAccommodationQuoteSheet } from "@/components/partner-portal/PartnerAccommodationQuoteSheet";
import { ProjectChatPanel } from "@/components/partner-portal/ProjectChatPanel";
import { InvoiceRegistrationDialog } from "@/components/partner-portal/InvoiceRegistrationDialog";
import { BureauCentralBadge } from "@/components/partner-portal/BureauCentralBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { PartnerItem, PartnerDashboardData, PartnerAccommodationQuote } from "@/types/partner";
import { cn } from "@/lib/utils";

type Mode = "activities" | "accommodation";

interface Props {
  mode: Mode;
}

const PartnerProjectContent = ({ mode }: Props) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const impersonate = searchParams.get("impersonate");
  const urlSuffix = impersonate ? `?impersonate=${impersonate}` : "";

  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [partnerToken, setPartnerToken] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<PartnerItem | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showQuoteSheet, setShowQuoteSheet] = useState(false);

  const fetchDashboard = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/partner/login");
      return;
    }

    let token: string | null = null;
    let pName = "";
    let pId = "";
    let pEmail = "";

    if (impersonate) {
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
      if (isAdmin) {
        const { data: partner } = await supabase
          .from("partners")
          .select("id, partner_token, name, email")
          .eq("id", impersonate)
          .single();
        if (partner) {
          token = partner.partner_token;
          pName = partner.name;
          pId = partner.id;
          pEmail = partner.email;
        }
      }
    }

    if (!token) {
      const { data: partner } = await supabase
        .from("partners")
        .select("id, partner_token, name, email")
        .eq("auth_user_id", session.user.id)
        .eq("is_active", true)
        .single();
      if (!partner) {
        setError("Je account is niet gekoppeld aan een partner.");
        setIsLoading(false);
        return;
      }
      token = partner.partner_token;
      pName = partner.name;
      pId = partner.id;
      pEmail = partner.email;
    }

    setPartnerToken(token);
    setPartnerId(pId);
    setPartnerName(pName);
    setPartnerEmail(pEmail);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-partner-dashboard?token=${token}`,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!response.ok) throw new Error("Kon project niet laden");
      const dashboard = await response.json();
      setData(dashboard);
    } catch (err) {
      console.error(err);
      setError("Er is een fout opgetreden bij het laden.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, impersonate]);

  const refetch = async () => {
    setIsLoading(true);
    await fetchDashboard();
  };

  // Find project data
  const projectItems = useMemo<PartnerItem[]>(() => {
    if (!data || mode !== "activities" || !id) return [];
    return data.items.filter((i) => i.request_id === id);
  }, [data, mode, id]);

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
      if (!response.ok) throw new Error("Failed");
      toast({ title: "Status bijgewerkt" });
      await refetch();
      return true;
    } catch {
      toast({ title: "Fout", description: "Kon status niet bijwerken.", variant: "destructive" });
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
      if (!response.ok) throw new Error();
      const result = await response.json();
      await refetch();
      setShowInvoiceDialog(false);
      setSelectedItem(null);
      return { success: true, commission: result.commission };
    } catch {
      toast({ title: "Fout", description: "Kon factuur niet registreren.", variant: "destructive" });
      return { success: false };
    }
  };

  const handleQuoteSubmit = async (quoteData: any) => {
    if (!accommodationQuote) return false;
    try {
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
          quote_external_url: quoteData.quoteExternalUrl || null,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", accommodationQuote.id);
      if (error) throw error;
      toast({ title: "Offerte ingediend" });
      await refetch();
      setShowQuoteSheet(false);
      return true;
    } catch {
      toast({ title: "Fout", description: "Kon offerte niet indienen.", variant: "destructive" });
      return false;
    }
  };

  const handleQuoteDecline = async (
    declineReason: string,
    _proposedArrival?: string,
    _proposedDeparture?: string
  ) => {
    if (!accommodationQuote) return false;
    try {
      const { error } = await supabase
        .from("accommodation_quotes")
        .update({
          status: "declined",
          partner_notes: declineReason || null,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", accommodationQuote.id);
      if (error) throw error;
      toast({ title: "Aanvraag afgewezen" });
      await refetch();
      setShowQuoteSheet(false);
      return true;
    } catch {
      toast({ title: "Fout", variant: "destructive" });
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => navigate(`/partner/dashboard${urlSuffix}`)} className="mt-4">
          Terug naar overzicht
        </Button>
      </div>
    );
  }

  // ---------- Activities project ----------
  if (mode === "activities") {
    if (projectItems.length === 0) {
      return (
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Project niet gevonden.</p>
          <Button onClick={() => navigate(`/partner/dashboard${urlSuffix}`)} className="mt-4">
            Terug naar overzicht
          </Button>
        </div>
      );
    }

    const first = projectItems[0];
    const req = first.program_requests;
    const dates = (req.selected_dates || []) as string[];
    const sorted = [...dates].sort();
    const arrival = sorted[0];
    const departure = sorted[sorted.length - 1];
    const isConceptProject = projectItems.every((i) => i.is_concept);
    const customerLabel = isConceptProject
      ? "Aanvraag in voorbereiding"
      : req.customer_company || req.customer_name;
    const isBureauCentral = req.invoicing_mode === "bureau_central";

    return (
      <>
        <div className="p-6 space-y-6 max-w-6xl">
          <Link
            to={`/partner/dashboard${urlSuffix}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Terug naar overzicht
          </Link>

          {/* Header */}
          <div>
            <h1 className={cn("text-2xl font-bold", isConceptProject && "italic text-muted-foreground")}>
              {customerLabel}
            </h1>
            <p className="text-muted-foreground mt-1">
              {arrival && format(parseISO(arrival), "EEE d MMM", { locale: nl })}
              {departure && departure !== arrival && (
                <> – {format(parseISO(departure), "EEE d MMM yyyy", { locale: nl })}</>
              )}
              {!departure || departure === arrival
                ? ` ${arrival ? format(parseISO(arrival), "yyyy", { locale: nl }) : ""}`
                : ""}
            </p>
          </div>

          {isConceptProject && (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-medium">Concept — nog niet vrijgegeven door Bureau Vlieland</p>
              <p className="mt-1">
                Deze aanvraag is in voorbereiding. Je kunt 'm vast bekijken; klantgegevens en acties komen
                pas vrij zodra Bureau Vlieland de aanvraag officieel naar je verstuurt.
              </p>
            </div>
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

            {!isBureauCentral && (
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

            {isBureauCentral && <BureauCentralBadge variant="compact" />}

          <GuestDetailsBlock
            guestNames={req.guest_names}
            dietaryNotes={req.dietary_notes}
          />

          </Card>

          {/* Items + chat in 2-col layout */}
          <div className="grid lg:grid-cols-[1fr_400px] gap-6">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Onderdelen ({projectItems.length})</h2>
              {projectItems.map((item) => (
                <PartnerProjectItemRow
                  key={item.id}
                  item={item}
                  onStatusUpdate={async (status, note, qPrice, qNotes, pTime, pDate) => {
                    setSelectedItem(item);
                    // Ensure selectedItem state is set before edge call uses it
                    return await (async () => {
                      // Inline the status update against this specific item
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
                        if (!response.ok) throw new Error("Failed");
                        toast({ title: "Status bijgewerkt" });
                        await refetch();
                        return true;
                      } catch {
                        toast({ title: "Fout", description: "Kon status niet bijwerken.", variant: "destructive" });
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
              ))}
            </div>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <ProjectChatPanel
                partnerId={partnerId}
                partnerName={partnerName}
                partnerEmail={partnerEmail}
                requestId={id}
              />
            </div>
          </div>
        </div>

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
            selectedItem?.program_requests.terms_accepted_at
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
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Logiesaanvraag niet gevonden.</p>
        <Button onClick={() => navigate(`/partner/dashboard${urlSuffix}`)} className="mt-4">
          Terug naar overzicht
        </Button>
      </div>
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
      <div className="p-6 space-y-6 max-w-6xl">
        <Link
          to={`/partner/dashboard${urlSuffix}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Terug naar overzicht
        </Link>

        <div>
          <h1 className="text-2xl font-bold">{customerLabel}</h1>
          <p className="text-muted-foreground mt-1">
            {format(parseISO(req.arrival_date), "EEE d MMM", { locale: nl })} –{" "}
            {format(parseISO(req.departure_date), "EEE d MMM yyyy", { locale: nl })}
          </p>
        </div>

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
            roomAssignment={(req as any).room_assignment}
            dietaryNotes={req.special_requests}
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
                    €{accommodationQuote.price_total.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                  </span>
                </p>
              )}
            </Card>
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
      </div>

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
    <Helmet>
      <title>Project | Partner Portal | Bureau Vlieland</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <PartnerProjectContent mode={mode} />
  </PartnerLayout>
);

export default PartnerProject;
