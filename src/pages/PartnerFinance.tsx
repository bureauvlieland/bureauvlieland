import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerMonthlyRevenueChart } from "@/components/partner-portal/PartnerMonthlyRevenueChart";
import { ExportInvoicesButton } from "@/components/partner-portal/ExportInvoicesButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InvoiceRegistrationDialog } from "@/components/partner-portal/InvoiceRegistrationDialog";
import { RegisterCollectivePartnerInvoiceDialog, type CollectiveInvoiceSubmitPayload } from "@/components/partner-portal/RegisterCollectivePartnerInvoiceDialog";
import { UploadInvoicePdfPartnerDialog } from "@/components/partner-portal/UploadInvoicePdfPartnerDialog";
import { MissingPdfBanner } from "@/components/partner-portal/MissingPdfBanner";
import { toast } from "sonner";
import { 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Receipt, 
  Calendar,
  Building2,
  FileText,
  BedDouble,
  Upload,
  Mail,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import type { PartnerItem, PartnerDashboardData, PartnerAccommodationQuote } from "@/types/partner";
import { getItemLineTotal } from "@/lib/portalPricing";
import { useAppSettings } from "@/hooks/useAppSettings";

/**
 * Bepaal het te-factureren bedrag voor een partner-item.
 * Valt terug op admin_price_override × pers × dagen wanneer de partner zelf nog
 * geen `quoted_price` heeft ingevuld maar de admin-inschatting bij bevestiging
 * is overgenomen. Sluit aan op de helper uit `portalPricing.ts` die zowel
 * klantportaal als admin-financiën gebruiken.
 */
const getBillableAmount = (item: PartnerItem): number => {
  const people = item.program_requests.number_of_people || 1;
  const days = Math.max((item.program_requests.selected_dates || []).length, 1);
  // getItemLineTotal is structureel compatibel (gebruikt alleen prijsvelden)
  return getItemLineTotal(item as unknown as Parameters<typeof getItemLineTotal>[0], people, days) ?? 0;
};
const isEstimatedAmount = (item: PartnerItem): boolean =>
  item.quoted_price == null && item.admin_price_override != null;

interface AccommodationQuoteWithInvoice extends PartnerAccommodationQuote {
  invoiced_amount: number | null;
  invoiced_number: string | null;
  invoiced_date: string | null;
  commission_percentage: number | null;
  commission_amount: number | null;
  commission_status: string | null;
}

const PartnerFinanceContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerToken, setPartnerToken] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PartnerItem | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [uploadPdfItem, setUploadPdfItem] = useState<PartnerItem | null>(null);
  const [collectiveRequestId, setCollectiveRequestId] = useState<string | null>(null);
  const [collectiveInitialIds, setCollectiveInitialIds] = useState<string[]>([]);
  const [collectiveMode, setCollectiveMode] = useState<"upload" | "email">("upload");
  const { getSetting } = useAppSettings();
  const bureauDetails = {
    companyName: getSetting<string>("bureau_company_name", "Bureau Vlieland"),
    legalName: getSetting<string>("bureau_legal_name", "Bureau Vlieland B.V."),
    street: getSetting<string>("bureau_street", ""),
    postalCode: getSetting<string>("bureau_postal_code", ""),
    city: getSetting<string>("bureau_city", ""),
    kvkNumber: getSetting<string>("bureau_kvk_number", ""),
    vatNumber: getSetting<string>("bureau_vat_number", ""),
    iban: getSetting<string>("bureau_iban", ""),
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/partner/login");
        return;
      }

      // Check if admin is impersonating
      const impersonatePartnerId = searchParams.get("impersonate");
      let token: string | null = null;

      if (impersonatePartnerId) {
        const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
        
        if (isAdmin) {
          const { data: partner } = await supabase
            .from("partners")
            .select("partner_token")
            .eq("id", impersonatePartnerId)
            .single();

          if (partner) {
            token = partner.partner_token;
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
      }

      setPartnerToken(token);

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
          throw new Error("Kon gegevens niet laden");
        }

        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        console.error("Error fetching dashboard:", err);
        setError("Er is een fout opgetreden bij het laden van je gegevens.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate, searchParams]);

  // Refetch function for after invoice registration
  const refetchData = useCallback(async () => {
    if (!partnerToken) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-partner-dashboard?token=${partnerToken}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (err) {
      console.error("Error refetching dashboard:", err);
    }
  }, [partnerToken]);

  // Invoice registration handler
  const handleInvoiceRegister = async (
    amount: number,
    invoiceNumber: string,
    date: string,
    notes?: string
  ): Promise<{ success: boolean; commission?: { percentage: number; amount: number } }> => {
    if (!selectedItem || !partnerToken) {
      return { success: false };
    }

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
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to register invoice");
      }

      const result = await response.json();
      toast.success("Factuur succesvol geregistreerd");
      setShowInvoiceDialog(false);
      setSelectedItem(null);
      await refetchData();
      return { success: true, commission: result.commission };
    } catch (err: any) {
      console.error("Error registering invoice:", err);
      toast.error(err?.message || "Er is een fout opgetreden bij het registreren van de factuur");
      return { success: false };
    }

  };

  // Collective (verzamelfactuur) registration: multiple items, one PDF, one invoice nr.
  const handleCollectiveInvoiceRegister = async (
    payload: CollectiveInvoiceSubmitPayload
  ): Promise<{ success: boolean }> => {
    if (!partnerToken) return { success: false };
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
            items: payload.items,
            invoicedNumber: payload.invoicedNumber,
            invoicedDate: payload.invoicedDate,
            notes: payload.notes,
            filePath: payload.filePath,
            viaEmail: payload.viaEmail,
          }),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success(
        payload.viaEmail
          ? "Bedankt — we koppelen je mail zodra hij binnen is"
          : payload.items.length > 1
            ? `Verzamelfactuur met ${payload.items.length} onderdelen geregistreerd`
            : "Factuur geregistreerd"
      );
      setCollectiveRequestId(null);
      setCollectiveInitialIds([]);
      await refetchData();
      return { success: true };
    } catch (err: any) {
      console.error("Error registering collective invoice:", err);
      toast.error(err?.message || "Er is een fout opgetreden bij het registreren van de factuur");
      return { success: false };
    }

  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center py-16">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Fout</h1>
        <p className="text-muted-foreground">{error || "Er is een fout opgetreden."}</p>
      </div>
    );
  }

  // Helper function to calculate expected commission
  const calculateExpectedActivityCommission = (quotedPrice: number, itemCommissionPercentage?: number | null) => {
    const vatRate = 21; // Activities use 21% VAT
    const amountExclVat = quotedPrice / (1 + vatRate / 100);
    const commissionRate = itemCommissionPercentage ?? data.partner.commission_percentage;
    return amountExclVat * (commissionRate / 100);
  };

  const calculateExpectedAccommodationCommission = (
    priceTotal: number, 
    priceIncludesVat: boolean | null, 
    vatRate: number | null,
    quoteCommissionPercentage?: number | null
  ) => {
    const vat = vatRate ?? 9; // Accommodations use 9% VAT by default
    const amountExclVat = (priceIncludesVat ?? true) 
      ? priceTotal / (1 + vat / 100)
      : priceTotal;
    const commissionRate = quoteCommissionPercentage ?? data.partner.accommodation_commission_percentage ?? 10;
    return amountExclVat * (commissionRate / 100);
  };

  // Helper function to determine effective status (same logic as dashboard)
  const getEffectiveStatus = (item: PartnerItem): string => {
    const hasCustomerAccepted = !!item.customer_accepted_at || !!item.customer_approved_at;
    return (item.status === "confirmed" && hasCustomerAccepted) ? "accepted" : item.status;
  };

  // Calculate financial metrics for activities
  const invoicedItems = data.items.filter((i) => i.invoiced_number !== null);
  // Show both "accepted" and "executed" items as "to be invoiced" once customer has accepted terms
  // Also include "confirmed" items where customer has accepted (effectiveStatus = accepted)
  const toBeInvoicedItems = data.items.filter((i) => {
    const effectiveStatus = getEffectiveStatus(i);
    return (effectiveStatus === "accepted" || effectiveStatus === "executed") && 
      !i.invoiced_number && 
      i.program_requests.terms_accepted_at !== null;
  });
  
  // Calculate financial metrics for accommodations
  const accommodationQuotes = (data.accommodationQuotes || []) as AccommodationQuoteWithInvoice[];
  const invoicedAccommodations = accommodationQuotes.filter((q) => q.invoiced_number !== null);
  const toBeInvoicedAccommodations = accommodationQuotes.filter(
    (q) => q.status === "selected" && !q.invoiced_number
  );

  // Combined totals
  const totalInvoiced = 
    invoicedItems.reduce((sum, i) => sum + (i.invoiced_amount || 0), 0) +
    invoicedAccommodations.reduce((sum, q) => sum + (q.invoiced_amount || 0), 0);
  
  const totalToBeInvoiced = 
    toBeInvoicedItems.reduce((sum, i) => sum + getBillableAmount(i), 0) +
    toBeInvoicedAccommodations.reduce((sum, q) => sum + (q.price_total || 0), 0);
  
  const totalCommission = 
    invoicedItems.reduce((sum, i) => sum + (i.commission_amount || 0), 0) +
    invoicedAccommodations.reduce((sum, q) => sum + (q.commission_amount || 0), 0);
  
  const pendingCommission = 
    invoicedItems.filter((i) => i.commission_status === "pending").reduce((sum, i) => sum + (i.commission_amount || 0), 0) +
    invoicedAccommodations.filter((q) => q.commission_status === "pending").reduce((sum, q) => sum + (q.commission_amount || 0), 0);
  
  const paidCommission = 
    invoicedItems.filter((i) => i.commission_status === "paid").reduce((sum, i) => sum + (i.commission_amount || 0), 0) +
    invoicedAccommodations.filter((q) => q.commission_status === "paid").reduce((sum, q) => sum + (q.commission_amount || 0), 0);

  // Calculate expected commission for items to be invoiced
  const expectedActivityCommission = toBeInvoicedItems.reduce((sum, i) => {
    const amount = getBillableAmount(i);
    if (!amount) return sum;
    return sum + calculateExpectedActivityCommission(amount, i.commission_percentage);
  }, 0);

  const expectedAccommodationCommission = toBeInvoicedAccommodations.reduce((sum, q) => {
    if (!q.price_total) return sum;
    return sum + calculateExpectedAccommodationCommission(q.price_total, q.price_includes_vat, q.vat_rate, q.commission_percentage);
  }, 0);

  const totalExpectedCommission = expectedActivityCommission + expectedAccommodationCommission;

  const toBeInvoicedCount = toBeInvoicedItems.length + toBeInvoicedAccommodations.length;
  const invoicedCount = invoicedItems.length + invoicedAccommodations.length;

  // Determine commission percentage display
  const commissionPercentage = data.partner.accommodation_commission_percentage 
    ? `${data.partner.commission_percentage}% / ${data.partner.accommodation_commission_percentage}%`
    : `${data.partner.commission_percentage}%`;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Facturatie Overzicht</h1>

      {/* Financial Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totaal gefactureerd</p>
                <p className="text-2xl font-bold">€{totalInvoiced.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nog te factureren</p>
                <p className="text-2xl font-bold">€{totalToBeInvoiced.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground">
                  {toBeInvoicedItems.length > 0 && `${toBeInvoicedItems.length} activiteit${toBeInvoicedItems.length !== 1 ? "en" : ""}`}
                  {toBeInvoicedItems.length > 0 && toBeInvoicedAccommodations.length > 0 && " • "}
                  {toBeInvoicedAccommodations.length > 0 && `${toBeInvoicedAccommodations.length} logies`}
                  {toBeInvoicedCount === 0 && "0 items"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commissie ({commissionPercentage})</p>
                <p className="text-2xl font-bold">€{totalCommission.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground">
                  €{paidCommission.toFixed(2)} betaald • €{pendingCommission.toFixed(2)} open
                  {totalExpectedCommission > 0 && (
                    <span className="text-amber-600"> • Verwacht: €{totalExpectedCommission.toFixed(2)}</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly revenue chart */}
      <PartnerMonthlyRevenueChart 
        items={data.items} 
        accommodationQuotes={accommodationQuotes}
      />

      {/* Tabs for invoice status */}
      <Tabs defaultValue="to-invoice" className="mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="to-invoice" className="flex-1 sm:flex-none">
              Nog te factureren
              {toBeInvoicedCount > 0 && (
                <Badge variant="secondary" className="ml-2">{toBeInvoicedCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="invoiced" className="flex-1 sm:flex-none">
              Gefactureerd
              {invoicedCount > 0 && (
                <Badge variant="secondary" className="ml-2">{invoicedCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <ExportInvoicesButton 
              items={toBeInvoicedItems} 
              accommodationQuotes={toBeInvoicedAccommodations}
              variant="to-invoice"
            />
            <ExportInvoicesButton 
              items={invoicedItems} 
              accommodationQuotes={invoicedAccommodations}
              variant="invoiced"
            />
          </div>
        </div>

        <TabsContent value="to-invoice" className="mt-6">
          {toBeInvoicedCount === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Alles gefactureerd!</p>
                <p className="text-muted-foreground">Er zijn geen items die nog gefactureerd moeten worden.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Inbox tip banner */}
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tip:</strong> je kunt je factuur ook gewoon mailen naar{" "}
                  <a href="mailto:inkoop@reply.bureauvlieland.nl" className="underline font-medium">
                    inkoop@reply.bureauvlieland.nl
                  </a>{" "}
                  — Bureau Vlieland verwerkt 'm dan automatisch (PDF wordt ingelezen en gekoppeld aan je project).
                </AlertDescription>
              </Alert>

              {/* Activities grouped per project — partner factureert per project één verzamelfactuur */}
              {Object.entries(
                toBeInvoicedItems.reduce<Record<string, PartnerItem[]>>((acc, it) => {
                  (acc[it.request_id] ||= []).push(it);
                  return acc;
                }, {})
              ).map(([requestId, items]) => {
                const project = items[0].program_requests;
                const total = items.reduce((s, i) => s + getBillableAmount(i), 0);
                return (
                  <Card key={requestId}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">
                              {project.customer_company || project.customer_name}
                            </h3>
                            {project.reference_number && (
                              <Badge variant="outline" className="text-xs">
                                {project.reference_number}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {items.length} onderdeel{items.length !== 1 ? "en" : ""}
                            </Badge>
                          </div>
                          {project.selected_dates?.[0] && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(project.selected_dates[0]), "d MMM yyyy", { locale: nl })}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Totaal te factureren</p>
                          <p className="text-lg font-bold">
                            €{total.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-md border divide-y text-sm">
                        {items.map((it) => {
                          const amount = getBillableAmount(it);
                          const estimated = isEstimatedAmount(it);
                          return (
                            <div key={it.id} className="flex items-center justify-between p-2 gap-2">
                              <span className="truncate flex items-center gap-2">
                                {it.block_name}
                                {estimated && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1 text-amber-700 border-amber-300">
                                    inschatting
                                  </Badge>
                                )}
                              </span>
                              <span className="font-medium whitespace-nowrap">
                                €{amount.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCollectiveMode("email");
                            setCollectiveRequestId(requestId);
                            setCollectiveInitialIds(items.map((i) => i.id));
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Gefactureerd via e-mail
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setCollectiveMode("upload");
                            setCollectiveRequestId(requestId);
                            setCollectiveInitialIds(items.map((i) => i.id));
                          }}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          {items.length > 1 ? "Verzamelfactuur registreren" : "Factuur registreren"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Accommodation items to invoice */}
              {toBeInvoicedAccommodations.map((quote) => (
                <AccommodationInvoiceCard key={quote.id} quote={quote} variant="to-invoice" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoiced" className="mt-6">
          {invoicedCount === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Nog geen facturen</p>
                <p className="text-muted-foreground">U hebt nog geen facturen geregistreerd.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Invoiced activity items */}
              {invoicedItems.map((item) => (
                <InvoiceItemCard
                  key={item.id}
                  item={item}
                  variant="invoiced"
                  onUploadPdf={() => setUploadPdfItem(item)}
                />
              ))}
              {/* Invoiced accommodation items */}
              {invoicedAccommodations.map((quote) => (
                <AccommodationInvoiceCard key={quote.id} quote={quote} variant="invoiced" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Invoice Registration Dialog */}
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

      <UploadInvoicePdfPartnerDialog
        item={uploadPdfItem}
        onClose={() => setUploadPdfItem(null)}
        onUploaded={refetchData}
      />

      <RegisterCollectivePartnerInvoiceDialog
        isOpen={!!collectiveRequestId}
        onClose={() => {
          setCollectiveRequestId(null);
          setCollectiveInitialIds([]);
          setCollectiveMode("upload");
        }}
        projectItems={
          collectiveRequestId
            ? data.items.filter(
                (i) =>
                  i.request_id === collectiveRequestId &&
                  !i.invoiced_number &&
                  (getEffectiveStatus(i) === "accepted" || getEffectiveStatus(i) === "executed") &&
                  i.program_requests.terms_accepted_at !== null
              )
            : []
        }
        initialSelectedIds={collectiveInitialIds}
        commissionPercentage={data.partner.commission_percentage}
        mode={collectiveMode}
        bureauDetails={bureauDetails}
        onSubmit={handleCollectiveInvoiceRegister}
      />
    </div>
  );
};

interface InvoiceItemCardProps {
  item: PartnerItem;
  variant: "to-invoice" | "invoiced";
  onInvoice?: () => void;
  onUploadPdf?: () => void;
}

const InvoiceItemCard = ({ item, variant, onInvoice, onUploadPdf }: InvoiceItemCardProps) => {
  const request = item.program_requests;
  const dates = request.selected_dates || [];
  const activityDate = dates[item.day_index];

  const billableAmount = getBillableAmount(item);
  const estimated = isEstimatedAmount(item);

  // Calculate expected commission for "to-invoice" items
  const calculateExpectedCommission = () => {
    if (variant !== "to-invoice" || !billableAmount) return null;

    const vatRate = 21; // Activities use 21% VAT
    const amountExclVat = billableAmount / (1 + vatRate / 100);
    const commissionPercentage = item.commission_percentage ?? 15;
    return amountExclVat * (commissionPercentage / 100);
  };

  const expectedCommission = calculateExpectedCommission();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{item.block_name}</h3>
              <Badge variant="outline" className="text-xs">Activiteit</Badge>
              {variant === "invoiced" && item.commission_status && (
                <Badge variant={item.commission_status === "paid" ? "default" : "outline"} className="text-xs">
                  {item.commission_status === "pending" && "Commissie open"}
                  {item.commission_status === "invoiced" && "Commissie gefactureerd"}
                  {item.commission_status === "paid" && "Commissie betaald"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {request.customer_company || request.customer_name}
              </div>
              {activityDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(activityDate), "d MMM yyyy", { locale: nl })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {variant === "to-invoice" ? (
              <>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {estimated ? "Geschatte prijs" : "Bevestigde prijs"}
                  </p>
                  <p className="font-semibold">€{billableAmount.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p>
                  {expectedCommission !== null && (
                    <p className="text-xs text-amber-600">
                      Verwachte commissie: €{expectedCommission.toFixed(2)}
                    </p>
                  )}
                </div>
                {onInvoice && (
                  <Button onClick={onInvoice} size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Factureren
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3">
                {!item.invoiced_file_path && onUploadPdf && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-500 text-amber-700 hover:bg-amber-50"
                    onClick={onUploadPdf}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    PDF toevoegen
                  </Button>
                )}
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>{item.invoiced_number}</span>
                    {!item.invoiced_file_path && (
                      <Badge variant="outline" className="text-xs border-amber-500 text-amber-700">
                        PDF ontbreekt
                      </Badge>
                    )}
                  </div>
                  <p className="font-semibold">€{item.invoiced_amount?.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p>
                  {item.commission_amount && item.commission_amount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Commissie: €{item.commission_amount.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface AccommodationInvoiceCardProps {
  quote: AccommodationQuoteWithInvoice;
  variant: "to-invoice" | "invoiced";
}

const AccommodationInvoiceCard = ({ quote, variant }: AccommodationInvoiceCardProps) => {
  const request = quote.accommodation_requests;

  // Calculate expected commission for "to-invoice" items
  const calculateExpectedCommission = () => {
    if (variant !== "to-invoice" || !quote.price_total) return null;
    
    const vatRate = quote.vat_rate ?? 9; // Accommodations use 9% VAT by default
    const amountExclVat = (quote.price_includes_vat ?? true)
      ? quote.price_total / (1 + vatRate / 100)
      : quote.price_total;
    
    const commissionPercentage = quote.commission_percentage ?? 10;
    const commissionAmount = amountExclVat * (commissionPercentage / 100);
    
    return commissionAmount;
  };

  const expectedCommission = calculateExpectedCommission();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{quote.accommodation_name}</h3>
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <BedDouble className="h-3 w-3" />
                Logies
              </Badge>
              {variant === "invoiced" && quote.commission_status && (
                <Badge variant={quote.commission_status === "paid" ? "default" : "outline"} className="text-xs">
                  {quote.commission_status === "pending" && "Commissie open"}
                  {quote.commission_status === "invoiced" && "Commissie gefactureerd"}
                  {quote.commission_status === "paid" && "Commissie betaald"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {request.customer_company || request.customer_name}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(request.arrival_date), "EEE d MMM", { locale: nl })} - {format(parseISO(request.departure_date), "EEE d MMM yyyy", { locale: nl })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {variant === "to-invoice" ? (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Offertebedrag</p>
                <p className="font-semibold">€{quote.price_total.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p>
                {expectedCommission !== null && (
                  <p className="text-xs text-amber-600">
                    Verwachte commissie: €{expectedCommission.toFixed(2)}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>{quote.invoiced_number}</span>
                </div>
                <p className="font-semibold">€{quote.invoiced_amount?.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p>
                {quote.commission_amount && quote.commission_amount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Commissie: €{quote.commission_amount.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PartnerFinance = () => {
  return (
    <PartnerLayout>
      <Helmet>
        <title>Facturatie | Partner Portal | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <PartnerFinanceContent />
    </PartnerLayout>
  );
};

export default PartnerFinance;