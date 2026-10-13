import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerPortal } from "@/hooks/usePartnerPortal";
import { usePartnerContext } from "@/lib/partnerPortalContext";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { Button } from "@/components/ui/button";
import { EmptyState, PortalTabs, type PillTone, type PortalTab } from "@/components/system";
import { PARTNER_QUOTE_TABS, partnerQuoteTab, type PartnerQuoteTab } from "@/lib/accommodationQuoteStatus";
import { PartnerAccommodationRequestCard } from "@/components/partner-portal/PartnerAccommodationRequestCard";
import { PartnerAccommodationQuoteSheet } from "@/components/partner-portal/PartnerAccommodationQuoteSheet";
import { RefreshCw, BedDouble } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { reportError } from "@/lib/errorReporting";

interface AccommodationRequest {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
  arrival_date: string;
  departure_date: string;
  number_of_guests: number;
  accommodation_type: string;
  room_count: number | null;
  room_occupancy: string | null;
  room_types: string[];
  location_preference: string[];
  budget_range: string | null;
  special_requests: string | null;
  room_assignment: string | null;
  guest_details_updated_at: string | null;
  wants_activities: boolean;
  status: string;
  created_at: string;
  linked_program_id: string | null;
}

interface AccommodationQuote {
  id: string;
  request_id: string;
  partner_id: string;
  accommodation_name: string;
  description: string | null;
  room_configuration: Record<string, unknown>[] | null;
  images?: { url: string; alt?: string }[] | null;
  price_total: number;
  price_per_person_per_night: number | null;
  price_includes_vat: boolean;
  vat_rate: number;
  includes: unknown;
  conditions: string | null;
  valid_until: string;
  status: string;
  submitted_at: string | null;
  partner_notes: string | null;
  quote_attachment_path: string | null;
  quote_attachment_filename: string | null;
  quote_external_url: string | null;
  invoiced_amount: number | null;
  invoiced_number: string | null;
  invoiced_date: string | null;
  commission_percentage: number | null;
  commission_amount: number | null;
}

interface RequestWithQuote extends AccommodationRequest {
  quote: AccommodationQuote | null;
  invoicingMode?: string | null;
}

/** Lege staat per tabblad: wat hier zou staan en waarom het leeg is. */
const EMPTY: Record<PartnerQuoteTab, { title: string; description: string }> = {
  gevraagd: { title: "Geen offerte gevraagd", description: "Nieuwe logiesaanvragen van Bureau Vlieland verschijnen hier." },
  wacht: { title: "Geen offertes bij de klant", description: "Verstuurde offertes staan hier tot de klant kiest." },
  verlopen: { title: "Geen verlopen offertes", description: "Een offerte waarvan de geldigheid is verstreken kunt u hier verlengen." },
  gekozen: { title: "Nog geen gekozen offertes", description: "Zodra de klant uw offerte kiest, staat hij hier." },
  afgerond: { title: "Geen afgeronde aanvragen", description: "Niet gekozen, afgewezen en geannuleerde aanvragen komen hier." },
};

export const PartnerAccommodationContent = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<RequestWithQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { partner, partnerToken } = usePartnerPortal();
  const { demo } = usePartnerContext();
  const partnerId = partner.id;
  const partnerName = partner.name;
  const partnerEmail = partner.contact_email || partner.email;
  const partnerDescription = partner.accommodation_description || "";
  const [selectedRequest, setSelectedRequest] = useState<RequestWithQuote | null>(null);
  const [showQuoteSheet, setShowQuoteSheet] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    const currentPartnerId = partner.id;

    // Referentiepagina: de verzonnen logiesaanvragen uit het dashboard, niets ophalen.
    if (demo) {
      setRequests(
        (demo.dashboard.accommodationQuotes ?? []).map((q) => ({
          ...q.accommodation_requests,
          room_occupancy: null,
          room_assignment: q.accommodation_requests.room_assignment ?? null,
          guest_details_updated_at: null,
          linked_program_id: q.accommodation_requests.linked_program_id ?? null,
          wants_activities: false,
          invoicingMode: q.accommodation_requests.invoicing_mode ?? null,
          quote: { ...q, room_configuration: Array.isArray(q.room_configuration) ? (q.room_configuration as Record<string, unknown>[]) : [] },
        })),
      );
      setIsLoading(false);
      return;
    }

    // Fetch quotes for this partner
    const { data: quotes, error: quotesError } = await supabase
      .from("accommodation_quotes")
      .select("*")
      .eq("partner_id", currentPartnerId);

    if (quotesError) {
      reportError(quotesError, { where: "PartnerAccommodation: Error fetching quotes" });
      setError("Kon offertes niet laden.");
      setIsLoading(false);
      return;
    }

    // Get request IDs from quotes
    const requestIds = quotes?.map(q => q.request_id) || [];

    if (requestIds.length === 0) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    // Fetch the accommodation requests through the sanitized partner view
    // (excludes admin-only PII such as customer_token, admin_notes, attribution).
    const { data: requestsData, error: requestsError } = await (supabase as any)
      .from("partner_accommodation_requests_safe")
      .select("*")
      .in("id", requestIds)
      .order("created_at", { ascending: false });

    if (requestsError) {
      reportError(requestsError, { where: "PartnerAccommodation: Error fetching requests" });
      setError("Kon aanvragen niet laden.");
      setIsLoading(false);
      return;
    }

    // Fetch linked program invoicing modes via security-definer RPC (no PII exposure).
    const linkedProgramIds = (requestsData || [])
      .map((r: any) => r.linked_program_id)
      .filter((id: string | null): id is string => Boolean(id));

    const invoicingModeMap = new Map<string, string>();
    if (linkedProgramIds.length > 0) {
      const { data: programs } = await (supabase as any).rpc(
        "get_partner_linked_program_invoicing_modes",
        { p_program_ids: linkedProgramIds },
      );
      (programs || []).forEach((p: { id: string; invoicing_mode: string | null }) => {
        if (p.invoicing_mode) invoicingModeMap.set(p.id, p.invoicing_mode);
      });
    }

    // Combine requests with their quotes; cancelled/closed lodging requests are hidden from partner action views.
    const activeRequestsData = (requestsData || []).filter(
      (req) => req.status !== "cancelled" && req.status !== "completed"
    );
    const combined: RequestWithQuote[] = activeRequestsData.map((req) => {
      const matchingQuote = quotes?.find(q => q.request_id === req.id);
      const invoicingMode = req.linked_program_id
        ? invoicingModeMap.get(req.linked_program_id) ?? null
        : null;
      return {
        ...req,
        room_types: (req.room_types as string[]) || [],
        location_preference: (req.location_preference as string[]) || [],
        invoicingMode: invoicingMode,
        quote: matchingQuote ? {
          ...matchingQuote,
          room_configuration: Array.isArray(matchingQuote.room_configuration) 
            ? matchingQuote.room_configuration as Record<string, unknown>[]
            : [],
          includes: matchingQuote.includes,
        } : null,
      };
    });

    // invoicing_mode already resolved above for all requests

    setRequests(combined);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner.id]);

  const handleQuoteSubmit = async (quoteData: {
    accommodationName: string;
    description: string;
    priceTotal: number;
    pricePerPersonPerNight: number | null;
    priceIncludesVat: boolean;
    vatRate: number;
    includes: string[];
    conditions: string;
    boardType: string;
    boardNotes: string;
    validUntil: string;
    partnerNotes: string;
    roomConfiguration: any[];
    images?: { url: string; alt?: string }[];
    quoteExternalUrl: string;
    attachmentFile?: File | null;
  }) => {
    if (!selectedRequest?.quote) return false;

    try {
      // Upload attachment file if provided
      let attachmentPath: string | null = selectedRequest.quote?.quote_attachment_path ?? null;
      let attachmentFilename: string | null = selectedRequest.quote?.quote_attachment_filename ?? null;

      if (quoteData.attachmentFile && partnerId) {
        const file = quoteData.attachmentFile;
        const ext = file.name.split('.').pop() || 'pdf';
        const filePath = `${partnerId}/${selectedRequest.quote!.id}/${Date.now()}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from('accommodation-quote-attachments')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Store the raw storage path; signed URLs are generated on read.
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
          forwarded_at: null,
          reset_reason: null,
        } as any)
        .eq("id", selectedRequest.quote.id);

      if (error) throw error;

      // If the request was already accepted (partner resubmitting a revised quote),
      // reset the request status to processing so the customer can re-select
      if (selectedRequest.status === "accepted") {
        await supabase
          .from("accommodation_requests")
          .update({ status: "processing" })
          .eq("id", selectedRequest.id);
      }

      // Create auto-todo for admin to review the quote (instead of sending directly to customer)
      try {
        await supabase.functions.invoke("create-quote-review-todo", {
          body: { quoteId: selectedRequest.quote.id },
        });
      } catch (todoError) {
        reportError(todoError, { where: "PartnerAccommodation: Failed to create review todo" });
      }

      // Log to program_request_history so the activity feed picks it up
      if (selectedRequest.linked_program_id) {
        supabase.from("program_request_history").insert({
          request_id: selectedRequest.linked_program_id,
          action: "accommodation_quote_submitted",
          actor: "partner",
          actor_name: partnerName,
          notes: quoteData.accommodationName,
          new_value: {
            price_total: quoteData.priceTotal,
            accommodation_name: quoteData.accommodationName,
            quote_id: selectedRequest.quote.id,
          },
        }).then(() => {});
      }

      // De sheet blijft open met de bevestiging; sluiten maakt hem leeg.
      await fetchData();
      return true;
    } catch (err) {
      reportError(err, { where: "PartnerAccommodation: Error submitting quote" });
      toast({
        title: "Offerte niet ingediend",
        description: "Kon offerte niet indienen. Probeer het opnieuw.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleQuoteDecline = async (declineReason: string, proposedArrival?: string, proposedDeparture?: string) => {
    if (!selectedRequest?.quote) return false;

    try {
      // Status + werkbanktaak + historie + dossier-tijdlijn lopen via de edge
      // function (service role); de directe inserts hieronder faalden stilletjes
      // door RLS (admin_todos/historie zijn admin-only), waardoor afwijzingen
      // nooit bij het bureau aankwamen.
      const { data, error } = await supabase.functions.invoke("decline-accommodation-quote", {
        body: {
          quoteId: selectedRequest.quote.id,
          declineReason: declineReason || null,
          proposedArrival: proposedArrival || null,
          proposedDeparture: proposedDeparture || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await fetchData();
      return true;
    } catch (err) {
      reportError(err, { where: "PartnerAccommodation: Error declining quote" });
      toast({
        title: "Aanvraag niet verwerkt",
        description: "Kon aanvraag niet verwerken. Probeer het opnieuw.",
        variant: "destructive",
      });
      return false;
    }
  };

  const currentTab: PartnerQuoteTab = PARTNER_QUOTE_TABS.some((t) => t.id === searchParams.get("tab")) ? (searchParams.get("tab") as PartnerQuoteTab) : "gevraagd";
  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "gevraagd") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  // Eén woordenlijst voor de tabs en de kaarten (`accommodationQuoteStatus`).
  const byTab = new Map<PartnerQuoteTab, RequestWithQuote[]>(PARTNER_QUOTE_TABS.map((t) => [t.id, []]));
  for (const r of requests) byTab.get(partnerQuoteTab(r.quote?.status))?.push(r);
  const openCount = (byTab.get("gevraagd")?.length ?? 0) + (byTab.get("verlopen")?.length ?? 0);
  const visible = byTab.get(currentTab) ?? [];

  const tabs: PortalTab[] = PARTNER_QUOTE_TABS.map((t) => {
    const n = byTab.get(t.id)?.length ?? 0;
    const tone: PillTone = t.id === "gevraagd" || t.id === "verlopen" ? "warning" : "neutral";
    return { key: t.id, label: t.label, badge: n > 0 ? { label: String(n), tone } : null };
  });

  const openRequest = (request: RequestWithQuote) => {
    setSelectedRequest(request);
    setShowQuoteSheet(true);
  };

  return (
    <>
      <PartnerPage
        title="Logies"
        icon={<BedDouble />}
        description="Logiesaanvragen van Bureau Vlieland: beantwoord ze met een offerte en volg wat de klant kiest."
        status={openCount > 0 ? { label: openCount === 1 ? "1 aanvraag wacht op u" : `${openCount} aanvragen wachten op u`, tone: "warning" } : null}
        actions={
          <Button onClick={() => void fetchData()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Vernieuwen
          </Button>
        }
        loading={isLoading}
        error={error}
      >
        <PortalTabs tabs={tabs} current={currentTab} onChange={setTab} label="Logiesaanvragen" embedded />
        {visible.length === 0 ? (
          <EmptyState icon={<BedDouble />} title={EMPTY[currentTab].title} description={EMPTY[currentTab].description} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((request) => (
              <PartnerAccommodationRequestCard
                key={request.id}
                request={request}
                quote={request.quote}
                partnerId={partnerId}
                partnerName={partnerName}
                partnerEmail={partnerEmail}
                partnerToken={partnerToken}
                onOpen={() => openRequest(request)}
              />
            ))}
          </div>
        )}
      </PartnerPage>

      {/* Quote Sheet */}
      <PartnerAccommodationQuoteSheet
        isOpen={showQuoteSheet}
        onClose={() => {
          setShowQuoteSheet(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        existingQuote={selectedRequest?.quote ?? null}
        partnerToken={partnerToken || ""}
        partnerId={partnerId || ""}
        partnerName={partnerName}
        partnerDescription={partnerDescription}
        onSubmit={handleQuoteSubmit}
        onDecline={handleQuoteDecline}
        onRefresh={fetchData}
      />
    </>
  );
};

const PartnerAccommodation = () => {
  return (
    <PartnerLayout>
      <PartnerAccommodationContent />
    </PartnerLayout>
  );
};

export default PartnerAccommodation;
