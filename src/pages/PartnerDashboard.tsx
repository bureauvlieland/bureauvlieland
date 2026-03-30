import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerActionBanner } from "@/components/partner-portal/PartnerActionBanner";
import { PartnerCompactStats, type StatType } from "@/components/partner-portal/PartnerCompactStats";
import { PartnerYtdModule } from "@/components/partner-portal/PartnerYtdModule";
import { PartnerUnifiedList } from "@/components/partner-portal/PartnerUnifiedList";
import { PartnerItemSheet } from "@/components/partner-portal/PartnerItemSheet";
import { PartnerAccommodationQuoteSheet } from "@/components/partner-portal/PartnerAccommodationQuoteSheet";
import { PartnerUpcomingActivities } from "@/components/partner-portal/PartnerUpcomingActivities";
import { InvoiceRegistrationDialog } from "@/components/partner-portal/InvoiceRegistrationDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { PartnerItem, PartnerDashboardData, PartnerAccommodationQuote } from "@/types/partner";

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
  const [partnerId, setPartnerId] = useState<string>("");
  const [partnerName, setPartnerName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"action" | "in_progress" | "expired" | "accepted" | "completed">("action");

  // Accommodation quote sheet
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
    linked_program_id?: string | null;
    invoicingMode?: string | null;
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

    const impersonatePartnerId = searchParams.get("impersonate");
    let token: string | null = null;
    let pName = "";
    let pId = "";

    if (impersonatePartnerId) {
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });

      if (isAdmin) {
        const { data: partner } = await supabase
          .from("partners")
          .select("id, partner_token, name")
          .eq("id", impersonatePartnerId)
          .single();

        if (partner) {
          token = partner.partner_token;
          pName = partner.name;
          pId = partner.id;
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
      pId = partner.id;
    }

    setPartnerToken(token);
    setPartnerId(pId);
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
        description:
          status === "confirmed"
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

      toast({
        title: "Offerte ingediend",
        description: "Uw offerte is succesvol ingediend bij Bureau Vlieland. Zij nemen contact op met de klant.",
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

  const handleQuoteDecline = async (declineReason: string, proposedArrival?: string, proposedDeparture?: string) => {
    if (!selectedRequest?.quote) return false;

    const hasAlternativeDates = proposedArrival && proposedDeparture;

    try {
      const { error } = await supabase
        .from("accommodation_quotes")
        .update({
          status: "declined",
          partner_notes: declineReason || null,
          submitted_at: new Date().toISOString(),
          proposed_arrival_date: proposedArrival || null,
          proposed_departure_date: proposedDeparture || null,
        })
        .eq("id", selectedRequest.quote.id);

      if (error) throw error;

      // Resolve the quote_pending_partner todo for this quote
      supabase.from("admin_todos")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("auto_type", "quote_pending_partner")
        .eq("auto_entity_id", selectedRequest.quote.id)
        .neq("status", "done")
        .then(() => {});

      // Log to program_request_history
      if (selectedRequest.linked_program_id) {
        supabase.from("program_request_history").insert({
          request_id: selectedRequest.linked_program_id,
          action: hasAlternativeDates ? "accommodation_alternative_dates" : "accommodation_quote_declined",
          actor: "partner",
          actor_name: partnerName,
          notes: hasAlternativeDates
            ? `Alternatieve datums voorgesteld: ${proposedArrival} t/m ${proposedDeparture}${declineReason ? `. ${declineReason}` : ""}`
            : declineReason || null,
          new_value: {
            quote_id: selectedRequest.quote.id,
            ...(hasAlternativeDates ? { proposed_arrival_date: proposedArrival, proposed_departure_date: proposedDeparture } : {}),
          },
        }).then(() => {});
      }

      // Create admin todo + project communication for alternative dates
      if (hasAlternativeDates) {
        const customerLabel = selectedRequest.customer_company || selectedRequest.customer_name;
        supabase.from("admin_todos").insert({
          title: `Alternatieve datums: ${partnerName} voor ${customerLabel}`,
          description: `${partnerName} is niet beschikbaar van ${selectedRequest.arrival_date} t/m ${selectedRequest.departure_date}, maar stelt voor: ${proposedArrival} t/m ${proposedDeparture}.${declineReason ? ` Toelichting: ${declineReason}` : ""}`,
          priority: "high",
          auto_type: "accommodation_alternative_dates",
          auto_entity_id: selectedRequest.quote.id,
          related_partner_id: partnerId,
        }).then(() => {});

        if (selectedRequest.linked_program_id) {
          supabase.from("project_communications").insert({
            request_id: selectedRequest.linked_program_id,
            accommodation_id: selectedRequest.id,
            communication_type: "note",
            direction: "inbound",
            subject: `Alternatieve datums voorgesteld door ${partnerName}`,
            content: `${partnerName} is niet beschikbaar van ${selectedRequest.arrival_date} t/m ${selectedRequest.departure_date}, maar stelt voor: ${proposedArrival} t/m ${proposedDeparture}.${declineReason ? ` Toelichting: ${declineReason}` : ""}`,
            contact_name: partnerName,
          }).then(() => {});
        }
      } else {
        // Plain decline — also create admin todo + communication log
        const customerLabel = selectedRequest.customer_company || selectedRequest.customer_name;
        supabase.from("admin_todos").insert({
          title: `Logies afgewezen: ${partnerName} voor ${customerLabel}`,
          description: `${partnerName} heeft de logiesaanvraag voor ${customerLabel} afgewezen.${declineReason ? ` Reden: ${declineReason}` : ""}`,
          priority: "high",
          auto_type: "accommodation_quote_declined",
          auto_entity_id: selectedRequest.quote.id,
          related_partner_id: partnerId,
        }).then(() => {});

        if (selectedRequest.linked_program_id) {
          supabase.from("project_communications").insert({
            request_id: selectedRequest.linked_program_id,
            accommodation_id: selectedRequest.id,
            communication_type: "note",
            direction: "inbound",
            subject: `Logiesaanvraag afgewezen door ${partnerName}`,
            content: `${partnerName} heeft de logiesaanvraag afgewezen.${declineReason ? ` Reden: ${declineReason}` : ""}`,
            contact_name: partnerName,
          }).then(() => {});
        }
      }

      toast({
        title: hasAlternativeDates ? "Alternatieve datums voorgesteld" : "Aanvraag afgewezen",
        description: hasAlternativeDates
          ? "Bureau Vlieland ontvangt uw voorstel en neemt contact op met de klant."
          : "De aanvraag is gemarkeerd als niet beschikbaar.",
      });

      await refetchDashboard();
      setShowQuoteSheet(false);
      setSelectedRequest(null);
      return true;
    } catch (err) {
      console.error("Error declining quote:", err);
      toast({
        title: "Fout",
        description: "Kon aanvraag niet afwijzen. Probeer het opnieuw.",
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

  const handleSelectQuote = (quote: PartnerAccommodationQuote) => {
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
      linked_program_id: req.linked_program_id ?? null,
      invoicingMode: req.invoicing_mode ?? null,
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
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center py-16">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Fout</h1>
        <p className="text-muted-foreground mb-6">{error || "Er is een fout opgetreden."}</p>
      </div>
    );
  }

  // Calculate stats
  const accommodationQuotes = data.accommodationQuotes || [];

  // Helper to determine effective status - if customer has accepted but status is still confirmed,
  // treat it as "accepted" for display purposes
  const getEffectiveStatus = (item: PartnerItem) => {
    const hasCustomerAccepted = !!item.customer_accepted_at || !!item.customer_approved_at;
    return (item.status === "confirmed" && hasCustomerAccepted) ? "accepted" : item.status;
  };

  // Pending counts (need action)
  const pendingActivityCount = data.items.filter((i) => i.status === "pending").length;
  const pendingAccommodationCount = accommodationQuotes.filter((q) => q.status === "pending").length;
  const counterProposedCount = data.items.filter((i) => i.status === "counter_proposed").length;

  // To invoice count - includes items where customer has accepted (via customer_accepted_at)
  const toInvoiceCount = data.items.filter((i) => {
    const effectiveStatus = getEffectiveStatus(i);
    return (
      (effectiveStatus === "accepted" || effectiveStatus === "executed") &&
      !i.invoiced_number &&
      i.program_requests.terms_accepted_at
    );
  }).length;

  // Stats for compact grid
  const pendingTotal = pendingActivityCount + pendingAccommodationCount + counterProposedCount;
  
  // Waiting on customer: confirmed/alternative WITHOUT customer_accepted_at
  const waitingOnCustomer =
    data.items.filter((i) => 
      (i.status === "confirmed" || i.status === "alternative") && !i.customer_accepted_at && !i.customer_approved_at
    ).length +
    accommodationQuotes.filter((q) => q.status === "submitted").length;
  
  // Accepted: items where customer has accepted (either via status or customer_accepted_at)
  const acceptedTotal =
    data.items.filter((i) => {
      const effectiveStatus = getEffectiveStatus(i);
      return effectiveStatus === "accepted" || effectiveStatus === "executed";
    }).length +
    accommodationQuotes.filter((q) => q.status === "selected").length;

  // YTD financials
  const currentYear = new Date().getFullYear();
  const ytdInvoicedItems = data.items.filter((i) => {
    if (!i.invoiced_date) return false;
    return new Date(i.invoiced_date).getFullYear() === currentYear;
  });
  const ytdActivityRevenue = ytdInvoicedItems.reduce((sum, i) => sum + (i.invoiced_amount || 0), 0);
  const ytdAccommodationRevenue = accommodationQuotes
    .filter((q) => q.status === "selected" && q.invoiced_amount && q.invoiced_date)
    .filter((q) => new Date(q.invoiced_date!).getFullYear() === currentYear)
    .reduce((sum, q) => sum + (q.invoiced_amount || 0), 0);
  const ytdRevenue = ytdActivityRevenue + ytdAccommodationRevenue;
  const pendingCommission = data.items
    .filter((i) => i.commission_status === "pending")
    .reduce((sum, i) => sum + (i.commission_amount || 0), 0);

  // Tab counts for badges
  const actionCount = pendingTotal + toInvoiceCount;
  
  // In progress: confirmed/alternative/submitted (not accepted, not expired)
  const inProgressCount =
    data.items.filter((i) => {
      return ["confirmed", "alternative"].includes(i.status) && !i.customer_accepted_at && !i.customer_approved_at;
    }).length +
    accommodationQuotes.filter((q) => q.status === "submitted").length;

  // Expired count
  const expiredCount = accommodationQuotes.filter((q) => q.status === "expired").length;

  // Accepted/Akkoord count (not invoiceable)
  const acceptedCount =
    data.items.filter((i) => {
      const effectiveStatus = getEffectiveStatus(i);
      const canInvoice = (effectiveStatus === "accepted" || effectiveStatus === "executed") &&
        !i.invoiced_number && i.program_requests.terms_accepted_at;
      return ["accepted", "selected"].includes(effectiveStatus) && !canInvoice;
    }).length +
    accommodationQuotes.filter((q) => q.status === "selected").length;

  // Recently cancelled/rejected count (< 48 hours)
  const recentCancelledCount = (() => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const recentItems = data.items.filter(
      (i) => i.status === "cancelled" && new Date(i.updated_at).getTime() > cutoff
    ).length;
    const recentQuotes = accommodationQuotes.filter(
      (q) => q.status === "rejected" && new Date(q.updated_at).getTime() > cutoff
    ).length;
    return recentItems + recentQuotes;
  })();

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Compact header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welkom terug, {data.partner.name}</h1>
            <p className="text-muted-foreground">Partner Dashboard</p>
          </div>
          <Button onClick={refetchDashboard} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Vernieuwen
          </Button>
        </div>

        {/* Action banner */}
        <PartnerActionBanner
          pendingCount={pendingActivityCount + pendingAccommodationCount}
          counterProposedCount={counterProposedCount}
          toInvoiceCount={toInvoiceCount}
          onNavigate={(target) => {
            if (target === "action") {
              setActiveTab("action");
            } else {
              setActiveTab("action");
            }
          }}
        />

        {/* Stats + YTD in grid */}
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <PartnerCompactStats
            pending={pendingTotal}
            waitingOnCustomer={waitingOnCustomer}
            accepted={acceptedTotal}
            toInvoice={toInvoiceCount}
            onStatClick={(stat: StatType) => {
              if (stat === "invoice") {
                // Navigate to finance page, preserve impersonate param
                const impersonate = searchParams.get("impersonate");
                navigate(`/partner/finance${impersonate ? `?impersonate=${impersonate}` : ""}`);
              } else if (stat === "pending") {
                setActiveTab("action");
              } else {
                // waiting and accepted -> in_progress tab
                setActiveTab("in_progress");
              }
            }}
          />
          <PartnerYtdModule ytdRevenue={ytdRevenue} pendingCommission={pendingCommission} />
        </div>

        {/* Upcoming activities widget */}
        <PartnerUpcomingActivities
          items={data.items}
          onSelectItem={(item) => {
            setSelectedItem(item);
            setShowSheet(true);
          }}
        />

        {/* Workflow tabs with unified list */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
              <TabsTrigger value="action" className="relative whitespace-nowrap">
                Actie nodig
                {actionCount > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {actionCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="whitespace-nowrap">
                In behandeling
                {inProgressCount > 0 && (
                  <span className="ml-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                    {inProgressCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="expired" className="whitespace-nowrap">
                Verlopen
                {expiredCount > 0 && (
                  <span className="ml-2 bg-destructive/10 text-destructive text-xs px-2 py-0.5 rounded-full">
                    {expiredCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="accepted" className="whitespace-nowrap">
                Akkoord
                {acceptedCount > 0 && (
                  <span className="ml-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                    {acceptedCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="whitespace-nowrap">
                Afgerond
                {recentCancelledCount > 0 && (
                  <span className="ml-2 bg-destructive/10 text-destructive text-xs px-2 py-0.5 rounded-full">
                    {recentCancelledCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {(["action", "in_progress", "expired", "accepted", "completed"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-6">
              <PartnerUnifiedList
                items={data.items}
                accommodationQuotes={accommodationQuotes}
                filter={tab}
                onSelectItem={(item) => {
                  setSelectedItem(item);
                  setShowSheet(true);
                }}
                onSelectQuote={handleSelectQuote}
              />
            </TabsContent>
          ))}
        </Tabs>
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
        partnerId={partnerId}
        partnerName={partnerName}
        onSubmit={handleQuoteSubmit}
        onDecline={handleQuoteDecline}
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
