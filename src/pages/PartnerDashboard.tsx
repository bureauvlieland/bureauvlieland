import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerStatsGrid } from "@/components/partner-portal/PartnerStatsGrid";
import { PartnerItemRow } from "@/components/partner-portal/PartnerItemRow";
import { PartnerItemSheet } from "@/components/partner-portal/PartnerItemSheet";
import { PartnerAccommodationTable } from "@/components/partner-portal/PartnerAccommodationTable";
import { PartnerAccommodationQuoteSheet } from "@/components/partner-portal/PartnerAccommodationQuoteSheet";
import { InvoiceRegistrationDialog } from "@/components/partner-portal/InvoiceRegistrationDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, Bell, Building2, Activity, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { PartnerItem, PartnerDashboardData } from "@/types/partner";

const PartnerDashboardContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PartnerItem | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [partnerToken, setPartnerToken] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>("");
  
  // For dual-type partners: segment toggle
  const [activeSegment, setActiveSegment] = useState<"activities" | "accommodation">("activities");
  
  // Accommodation quote sheet - using same pattern as PartnerAccommodation.tsx
  interface RequestWithQuote {
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
    quote: {
      id: string;
      status: string;
      accommodation_name: string;
      description: string | null;
      price_total: number;
      price_per_person_per_night: number | null;
      price_includes_vat: boolean;
      vat_rate: number;
      includes: unknown;
      conditions: string | null;
      valid_until: string;
      partner_notes: string | null;
      room_configuration: Record<string, unknown>[] | null;
      submitted_at: string | null;
      quote_attachment_path: string | null;
      quote_attachment_filename: string | null;
      quote_external_url: string | null;
      invoiced_amount: number | null;
      invoiced_number: string | null;
      invoiced_date: string | null;
      commission_percentage: number | null;
      commission_amount: number | null;
    } | null;
  }
  const [selectedRequest, setSelectedRequest] = useState<RequestWithQuote | null>(null);
  const [showQuoteSheet, setShowQuoteSheet] = useState(false);

  const fetchDashboard = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/partner/login");
      return;
    }

    // Check if admin is impersonating
    const impersonatePartnerId = searchParams.get("impersonate");
    let token: string | null = null;
    let pName = "";

    if (impersonatePartnerId) {
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
      
      if (isAdmin) {
        const { data: partner } = await supabase
          .from("partners")
          .select("partner_token, name")
          .eq("id", impersonatePartnerId)
          .single();

        if (partner) {
          token = partner.partner_token;
          pName = partner.name;
        }
      }
    }

    if (!token) {
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .eq("is_active", true)
        .single();

      if (partnerError || !partner) {
        setError("Je account is niet gekoppeld aan een partner.");
        setIsLoading(false);
        return;
      }

      token = partner.partner_token;
      pName = partner.name;
    }

    setPartnerToken(token);
    setPartnerName(pName);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-partner-dashboard?token=${token}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Kon dashboard niet laden");
      }

      const dashboardData = await response.json();
      setData(dashboardData);
      
      // Set initial segment based on partner type
      const partnerType = dashboardData.partner.partner_type || "activity_provider";
      if (partnerType === "accommodation") {
        setActiveSegment("accommodation");
      }
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setError("Er is een fout opgetreden bij het laden van je dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [navigate, searchParams]);

  const refetchDashboard = async () => {
    setIsLoading(true);
    await fetchDashboard();
  };

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
            partnerToken: partnerToken,
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
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      toast({
        title: "Status bijgewerkt",
        description: status === "confirmed" 
          ? "Activiteit bevestigd. De klant is op de hoogte gesteld."
          : status === "executed"
          ? "Activiteit gemarkeerd als uitgevoerd."
          : status === "alternative"
          ? "Alternatief voorstel verstuurd. De klant is op de hoogte gesteld."
          : "Status is bijgewerkt.",
      });

      await refetchDashboard();
      return true;
    } catch (err) {
      console.error("Error updating item status:", err);
      toast({
        title: "Fout",
        description: "Kon status niet bijwerken.",
        variant: "destructive",
      });
      return false;
    }
  };

  const registerInvoice = async (
    amount: number,
    invoiceNumber: string,
    date: string,
    notes?: string
  ): Promise<{ success: boolean; commission?: { percentage: number; amount: number } }> => {
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
            partnerToken: partnerToken,
            itemId: selectedItem.id,
            invoicedAmount: amount,
            invoicedNumber: invoiceNumber,
            invoicedDate: date,
            notes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to register invoice");
      }

      const result = await response.json();
      await refetchDashboard();
      return { success: true, commission: result.commission };
    } catch (err) {
      console.error("Error registering invoice:", err);
      toast({
        title: "Fout",
        description: "Kon factuur niet registreren.",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  // Handle accommodation quote submission
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
    roomConfiguration: { type: string; count: number; price_per_night: number; occupancy: number }[];
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

      await refetchDashboard();
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

  const handleInvoiceRegister = async (
    amount: number,
    invoiceNumber: string,
    date: string,
    notes?: string
  ) => {
    const result = await registerInvoice(amount, invoiceNumber, date, notes);
    if (result.success) {
      setShowInvoiceDialog(false);
      setSelectedItem(null);
    }
    return result;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center py-16">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Fout</h1>
        <p className="text-muted-foreground mb-6">
          {error || "Er is een fout opgetreden."}
        </p>
      </div>
    );
  }

  // Determine partner type
  const partnerType = data.partner.partner_type || "activity_provider";
  const isActivityPartner = partnerType === "activity_provider" || partnerType === "both";
  const isAccommodationPartner = partnerType === "accommodation" || partnerType === "both";
  const isBothPartner = partnerType === "both";

  // Activity items filtering
  const pendingItems = data.items.filter((i) => i.status === "pending");
  const proposalSentItems = data.items.filter((i) => i.status === "confirmed" || i.status === "alternative");
  const acceptedItems = data.items.filter((i) => i.status === "accepted" || i.status === "executed");
  const closedItems = data.items.filter((i) => 
    ["invoiced", "unavailable", "cancelled"].includes(i.status)
  );

  // Accommodation quotes filtering
  const accommodationQuotes = data.accommodationQuotes || [];
  const pendingQuotes = accommodationQuotes.filter((q) => q.status === "pending");
  const submittedQuotes = accommodationQuotes.filter((q) => q.status === "submitted");
  const closedQuotes = accommodationQuotes.filter((q) => 
    ["selected", "rejected", "expired"].includes(q.status)
  );

  // Calculate YTD financials (including accommodation)
  const currentYear = new Date().getFullYear();
  const ytdInvoicedItems = data.items.filter((i) => {
    if (!i.invoiced_date) return false;
    const invoiceYear = new Date(i.invoiced_date).getFullYear();
    return invoiceYear === currentYear;
  });
  const ytdActivityRevenue = ytdInvoicedItems.reduce((sum, i) => sum + (i.invoiced_amount || 0), 0);
  
  // Add accommodation revenue
  const ytdAccommodationRevenue = accommodationQuotes
    .filter((q) => q.status === "selected" && q.invoiced_amount && q.invoiced_date)
    .filter((q) => new Date(q.invoiced_date!).getFullYear() === currentYear)
    .reduce((sum, q) => sum + (q.invoiced_amount || 0), 0);
  
  const ytdRevenue = ytdActivityRevenue + ytdAccommodationRevenue;
  const ytdCommission = ytdInvoicedItems.reduce((sum, i) => sum + (i.commission_amount || 0), 0);
  const pendingCommission = data.items
    .filter((i) => i.commission_status === "pending")
    .reduce((sum, i) => sum + (i.commission_amount || 0), 0);

  const financials = {
    ytdRevenue,
    ytdCommission,
    pendingCommission,
  };

  const totalPending = pendingItems.length + pendingQuotes.length;

  const renderActivitiesTable = (items: PartnerItem[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Activiteit</TableHead>
              <TableHead className="hidden sm:table-cell">Klant</TableHead>
              <TableHead className="hidden md:table-cell">Datum</TableHead>
              <TableHead className="hidden lg:table-cell text-center">Pers.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <PartnerItemRow
                key={item.id}
                item={item}
                onClick={() => {
                  setSelectedItem(item);
                  setShowSheet(true);
                }}
              />
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  };

  return (
    <>
      <div className="p-6">
        {/* Header with partner info */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{data.partner.name}</h1>
              <p className="text-muted-foreground">{data.partner.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalPending > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                <Bell className="h-4 w-4" />
                <span>{totalPending} nieuw</span>
              </div>
            )}
            <Button onClick={refetchDashboard} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Vernieuwen
            </Button>
          </div>
        </div>

        {/* Stats Grid - adapts based on partner type */}
        <PartnerStatsGrid
          isActivityPartner={isActivityPartner}
          isAccommodationPartner={isAccommodationPartner}
          activitySummary={isActivityPartner ? data.summary : undefined}
          accommodationSummary={isAccommodationPartner ? data.accommodationSummary : undefined}
          financials={financials}
        />

        {/* Segment toggle for "both" partners */}
        {isBothPartner && (
          <div className="flex gap-2 mt-6">
            <Button
              variant={activeSegment === "activities" ? "default" : "outline"}
              onClick={() => setActiveSegment("activities")}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Activiteiten
              {pendingItems.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingItems.length}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeSegment === "accommodation" ? "default" : "outline"}
              onClick={() => setActiveSegment("accommodation")}
              className="flex items-center gap-2"
            >
              <BedDouble className="h-4 w-4" />
              Logies
              {pendingQuotes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingQuotes.length}
                </Badge>
              )}
            </Button>
          </div>
        )}

        {/* Content based on partner type */}
        {/* Activities view - for activity partners or "both" with activities segment */}
        {(isActivityPartner && !isBothPartner) || (isBothPartner && activeSegment === "activities") ? (
          <Tabs defaultValue="pending" className="mt-6">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
                <TabsTrigger value="pending" className="relative whitespace-nowrap">
                  Nieuw
                  {pendingItems.length > 0 && (
                    <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                      {pendingItems.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="waiting" className="whitespace-nowrap">
                  Voorstel verstuurd
                  {proposalSentItems.length > 0 && (
                    <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {proposalSentItems.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="accepted" className="whitespace-nowrap">
                  Akkoord
                  {acceptedItems.length > 0 && (
                    <span className="ml-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                      {acceptedItems.length}
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
              {renderActivitiesTable(pendingItems, "Geen nieuwe aanvragen.")}
            </TabsContent>

            <TabsContent value="waiting" className="mt-6">
              {renderActivitiesTable(proposalSentItems, "Geen voorstellen verstuurd.")}
            </TabsContent>

            <TabsContent value="accepted" className="mt-6">
              {renderActivitiesTable(acceptedItems, "Geen activiteiten met klantakkoord.")}
            </TabsContent>

            <TabsContent value="closed" className="mt-6">
              {renderActivitiesTable(closedItems, "Geen afgeronde activiteiten.")}
            </TabsContent>
          </Tabs>
        ) : null}

        {/* Accommodation view - for accommodation partners or "both" with accommodation segment */}
        {(isAccommodationPartner && !isBothPartner) || (isBothPartner && activeSegment === "accommodation") ? (
          <Tabs defaultValue="pending" className="mt-6">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
                <TabsTrigger value="pending" className="relative whitespace-nowrap">
                  Te beantwoorden
                  {pendingQuotes.length > 0 && (
                    <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                      {pendingQuotes.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="submitted" className="whitespace-nowrap">
                  Offerte verstuurd
                  {submittedQuotes.length > 0 && (
                    <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {submittedQuotes.length}
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
              <PartnerAccommodationTable
                quotes={pendingQuotes}
                emptyMessage="Geen openstaande logies aanvragen."
                onSelectQuote={(quote) => {
                  // Transform PartnerAccommodationQuote to RequestWithQuote format
                  const req = quote.accommodation_requests;
                  setSelectedRequest({
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
                    quote: {
                      id: quote.id,
                      status: quote.status,
                      accommodation_name: quote.accommodation_name,
                      description: quote.description,
                      price_total: quote.price_total,
                      price_per_person_per_night: quote.price_per_person_per_night,
                      price_includes_vat: quote.price_includes_vat,
                      vat_rate: quote.vat_rate,
                      includes: quote.includes,
                      conditions: quote.conditions,
                      valid_until: quote.valid_until,
                      partner_notes: quote.partner_notes,
                      room_configuration: quote.room_configuration as Record<string, unknown>[] | null,
                      submitted_at: quote.submitted_at,
                      quote_attachment_path: quote.quote_attachment_path,
                      quote_attachment_filename: quote.quote_attachment_filename,
                      quote_external_url: quote.quote_external_url,
                      invoiced_amount: quote.invoiced_amount,
                      invoiced_number: quote.invoiced_number,
                      invoiced_date: quote.invoiced_date,
                      commission_percentage: quote.commission_percentage,
                      commission_amount: quote.commission_amount,
                    },
                  });
                  setShowQuoteSheet(true);
                }}
              />
            </TabsContent>

            <TabsContent value="submitted" className="mt-6">
              <PartnerAccommodationTable
                quotes={submittedQuotes}
                emptyMessage="Geen ingediende offertes."
                onSelectQuote={(quote) => {
                  const req = quote.accommodation_requests;
                  setSelectedRequest({
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
                    quote: {
                      id: quote.id,
                      status: quote.status,
                      accommodation_name: quote.accommodation_name,
                      description: quote.description,
                      price_total: quote.price_total,
                      price_per_person_per_night: quote.price_per_person_per_night,
                      price_includes_vat: quote.price_includes_vat,
                      vat_rate: quote.vat_rate,
                      includes: quote.includes,
                      conditions: quote.conditions,
                      valid_until: quote.valid_until,
                      partner_notes: quote.partner_notes,
                      room_configuration: quote.room_configuration as Record<string, unknown>[] | null,
                      submitted_at: quote.submitted_at,
                      quote_attachment_path: quote.quote_attachment_path,
                      quote_attachment_filename: quote.quote_attachment_filename,
                      quote_external_url: quote.quote_external_url,
                      invoiced_amount: quote.invoiced_amount,
                      invoiced_number: quote.invoiced_number,
                      invoiced_date: quote.invoiced_date,
                      commission_percentage: quote.commission_percentage,
                      commission_amount: quote.commission_amount,
                    },
                  });
                  setShowQuoteSheet(true);
                }}
              />
            </TabsContent>

            <TabsContent value="closed" className="mt-6">
              <PartnerAccommodationTable
                quotes={closedQuotes}
                emptyMessage="Geen afgeronde logies aanvragen."
                onSelectQuote={(quote) => {
                  const req = quote.accommodation_requests;
                  setSelectedRequest({
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
                    quote: {
                      id: quote.id,
                      status: quote.status,
                      accommodation_name: quote.accommodation_name,
                      description: quote.description,
                      price_total: quote.price_total,
                      price_per_person_per_night: quote.price_per_person_per_night,
                      price_includes_vat: quote.price_includes_vat,
                      vat_rate: quote.vat_rate,
                      includes: quote.includes,
                      conditions: quote.conditions,
                      valid_until: quote.valid_until,
                      partner_notes: quote.partner_notes,
                      room_configuration: quote.room_configuration as Record<string, unknown>[] | null,
                      submitted_at: quote.submitted_at,
                      quote_attachment_path: quote.quote_attachment_path,
                      quote_attachment_filename: quote.quote_attachment_filename,
                      quote_external_url: quote.quote_external_url,
                      invoiced_amount: quote.invoiced_amount,
                      invoiced_number: quote.invoiced_number,
                      invoiced_date: quote.invoiced_date,
                      commission_percentage: quote.commission_percentage,
                      commission_amount: quote.commission_amount,
                    },
                  });
                  setShowQuoteSheet(true);
                }}
              />
            </TabsContent>
          </Tabs>
        ) : null}
      </div>

      {/* Item detail sheet */}
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
        commissionPercentage={data.partner.commission_percentage}
      />

      {/* Invoice dialog */}
      <InvoiceRegistrationDialog
        isOpen={showInvoiceDialog}
        onClose={() => {
          setShowInvoiceDialog(false);
          setSelectedItem(null);
        }}
        onSubmit={handleInvoiceRegister}
        item={selectedItem}
        commissionPercentage={data.partner.commission_percentage}
        billingDetails={selectedItem?.program_requests.terms_accepted_at ? {
          billing_company_name: selectedItem.program_requests.billing_company_name,
          billing_kvk_number: selectedItem.program_requests.billing_kvk_number,
          billing_vat_number: selectedItem.program_requests.billing_vat_number,
          billing_address_street: selectedItem.program_requests.billing_address_street,
          billing_address_postal: selectedItem.program_requests.billing_address_postal,
          billing_address_city: selectedItem.program_requests.billing_address_city,
          billing_contact_name: selectedItem.program_requests.billing_contact_name,
          billing_contact_email: selectedItem.program_requests.billing_contact_email,
          billing_reference: selectedItem.program_requests.billing_reference,
        } : null}
      />

      {/* Accommodation quote sheet */}
      <PartnerAccommodationQuoteSheet
        isOpen={showQuoteSheet}
        onClose={() => {
          setShowQuoteSheet(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        existingQuote={selectedRequest?.quote ?? null}
        partnerToken={partnerToken || ""}
        partnerName={partnerName}
        onSubmit={handleQuoteSubmit}
        onRefresh={refetchDashboard}
      />
    </>
  );
};

const PartnerDashboard = () => {
  return (
    <PartnerLayout>
      <Helmet>
        <title>Dashboard | Partner Portal | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <PartnerDashboardContent />
    </PartnerLayout>
  );
};

export default PartnerDashboard;
