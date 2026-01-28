import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PartnerAccommodationRequestCard } from "@/components/partner-portal/PartnerAccommodationRequestCard";
import { PartnerAccommodationQuoteSheet } from "@/components/partner-portal/PartnerAccommodationQuoteSheet";
import { AlertCircle, RefreshCw, BedDouble, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  wants_activities: boolean;
  status: string;
  created_at: string;
}

interface AccommodationQuote {
  id: string;
  request_id: string;
  partner_id: string;
  accommodation_name: string;
  description: string | null;
  room_configuration: Record<string, unknown>[] | null;
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
}

const PartnerAccommodationContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestWithQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerToken, setPartnerToken] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithQuote | null>(null);
  const [showQuoteSheet, setShowQuoteSheet] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/partner/login");
      return;
    }

    // Check if admin is impersonating
    const impersonatePartnerId = searchParams.get("impersonate");
    let currentPartnerId: string | null = null;

    if (impersonatePartnerId) {
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
      
      if (isAdmin) {
        currentPartnerId = impersonatePartnerId;
      }
    }

    if (!currentPartnerId) {
      // Get partner ID and token from auth
      const { data: partner } = await supabase
        .from("partners")
        .select("id, partner_token")
        .eq("auth_user_id", session.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!partner) {
        setError("Je account is niet gekoppeld aan een partner.");
        setIsLoading(false);
        return;
      }

      currentPartnerId = partner.id;
      setPartnerToken(partner.partner_token);
    } else {
      // Admin impersonating - fetch the partner token
      const { data: impersonatedPartner } = await supabase
        .from("partners")
        .select("partner_token")
        .eq("id", currentPartnerId)
        .maybeSingle();
      if (impersonatedPartner) {
        setPartnerToken(impersonatedPartner.partner_token);
      }
    }

    setPartnerId(currentPartnerId);

    // Fetch quotes for this partner
    const { data: quotes, error: quotesError } = await supabase
      .from("accommodation_quotes")
      .select("*")
      .eq("partner_id", currentPartnerId);

    if (quotesError) {
      console.error("Error fetching quotes:", quotesError);
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

    // Fetch the accommodation requests
    const { data: requestsData, error: requestsError } = await supabase
      .from("accommodation_requests")
      .select("*")
      .in("id", requestIds)
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
      setError("Kon aanvragen niet laden.");
      setIsLoading(false);
      return;
    }

    // Combine requests with their quotes
    const combined: RequestWithQuote[] = (requestsData || []).map((req) => {
      const matchingQuote = quotes?.find(q => q.request_id === req.id);
      return {
        ...req,
        room_types: (req.room_types as string[]) || [],
        location_preference: (req.location_preference as string[]) || [],
        quote: matchingQuote ? {
          ...matchingQuote,
          room_configuration: Array.isArray(matchingQuote.room_configuration) 
            ? matchingQuote.room_configuration as Record<string, unknown>[]
            : [],
          includes: matchingQuote.includes,
        } : null,
      };
    });

    setRequests(combined);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [navigate, searchParams]);

  const handleQuoteSubmit = async (quoteData: {
    accommodationName: string;
    description: string;
    priceTotal: number;
    pricePerPersonPerNight: number | null;
    priceIncludesVat: boolean;
    vatRate: number;
    includes: string[];
    conditions: string;
    validUntil: string;
    partnerNotes: string;
    roomConfiguration: any[];
    quoteExternalUrl: string;
  }) => {
    if (!selectedRequest?.quote) return false;

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
        .eq("id", selectedRequest.quote.id);

      if (error) throw error;

      // Send notification email to customer
      try {
        await supabase.functions.invoke("notify-accommodation-quote", {
          body: { quoteId: selectedRequest.quote.id },
        });
      } catch (emailError) {
        console.error("Failed to send quote notification:", emailError);
      }

      toast({
        title: "Offerte ingediend",
        description: "Uw offerte is succesvol verstuurd naar Bureau Vlieland.",
      });

      await fetchData();
      setShowQuoteSheet(false);
      setSelectedRequest(null);
      return true;
    } catch (err) {
      console.error("Error submitting quote:", err);
      toast({
        title: "Fout",
        description: "Kon offerte niet indienen. Probeer het opnieuw.",
        variant: "destructive",
      });
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center py-16">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Fout</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
      </div>
    );
  }

  // Tab filtering
  const pendingRequests = requests.filter(r => r.quote?.status === "pending");
  const submittedRequests = requests.filter(r => r.quote?.status === "submitted");
  const closedRequests = requests.filter(r => 
    r.quote?.status === "selected" || r.quote?.status === "rejected" || r.quote?.status === "expired"
  );

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BedDouble className="h-6 w-6" />
              Logies Aanvragen
            </h1>
            <p className="text-muted-foreground mt-1">
              Bekijk en beantwoord logies aanvragen van Bureau Vlieland
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingRequests.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                <Bell className="h-4 w-4" />
                <span>{pendingRequests.length} nieuw</span>
              </div>
            )}
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Vernieuwen
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="mt-8">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
              <TabsTrigger value="pending" className="relative whitespace-nowrap">
                Te beantwoorden
                {pendingRequests.length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="submitted" className="whitespace-nowrap">
                Offerte verstuurd
                {submittedRequests.length > 0 && (
                  <span className="ml-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                    {submittedRequests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="closed" className="whitespace-nowrap">
                Afgerond
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="pending" className="mt-6">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BedDouble className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Geen openstaande logies aanvragen.</p>
                  <p className="text-sm mt-1">Nieuwe aanvragen verschijnen hier.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingRequests.map((request) => (
                  <PartnerAccommodationRequestCard
                    key={request.id}
                    request={request}
                    quote={request.quote}
                    onSubmitQuote={() => {
                      setSelectedRequest(request);
                      setShowQuoteSheet(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="submitted" className="mt-6">
            {submittedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>Geen verstuurde offertes.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {submittedRequests.map((request) => (
                  <PartnerAccommodationRequestCard
                    key={request.id}
                    request={request}
                    quote={request.quote}
                    onSubmitQuote={() => {
                      setSelectedRequest(request);
                      setShowQuoteSheet(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-6">
            {closedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>Geen afgeronde aanvragen.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {closedRequests.map((request) => (
                  <PartnerAccommodationRequestCard
                    key={request.id}
                    request={request}
                    quote={request.quote}
                    onSubmitQuote={() => {
                      setSelectedRequest(request);
                      setShowQuoteSheet(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

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
        onSubmit={handleQuoteSubmit}
        onRefresh={fetchData}
      />
    </>
  );
};

const PartnerAccommodation = () => {
  return (
    <PartnerLayout>
      <Helmet>
        <title>Logies Aanvragen | Partner Portal | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <PartnerAccommodationContent />
    </PartnerLayout>
  );
};

export default PartnerAccommodation;
