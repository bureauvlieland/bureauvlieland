import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Receipt, 
  Calendar,
  Building2,
  FileText,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import type { PartnerItem, PartnerDashboardData } from "@/types/partner";

const PartnerFinanceContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Calculate financial metrics
  const invoicedItems = data.items.filter((i) => i.invoiced_number !== null);
  const toBeInvoicedItems = data.items.filter(
    (i) => i.status === "executed" && !i.invoiced_number && i.program_requests.terms_accepted_at !== null
  );
  
  const totalInvoiced = invoicedItems.reduce((sum, i) => sum + (i.invoiced_amount || 0), 0);
  const totalToBeInvoiced = toBeInvoicedItems.reduce((sum, i) => sum + (i.quoted_price || 0), 0);
  const totalCommission = invoicedItems.reduce((sum, i) => sum + (i.commission_amount || 0), 0);
  const pendingCommission = invoicedItems
    .filter((i) => i.commission_status === "pending")
    .reduce((sum, i) => sum + (i.commission_amount || 0), 0);
  const paidCommission = invoicedItems
    .filter((i) => i.commission_status === "paid")
    .reduce((sum, i) => sum + (i.commission_amount || 0), 0);

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
                <p className="text-xs text-muted-foreground">{toBeInvoicedItems.length} {toBeInvoicedItems.length === 1 ? "activiteit" : "activiteiten"}</p>
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
                <p className="text-sm text-muted-foreground">Commissie ({data.partner.commission_percentage}%)</p>
                <p className="text-2xl font-bold">€{totalCommission.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground">
                  €{paidCommission.toFixed(2)} betaald • €{pendingCommission.toFixed(2)} open
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for invoice status */}
      <Tabs defaultValue="invoiced" className="mt-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="to-invoice" className="flex-1 sm:flex-none">
            Nog te factureren
            {toBeInvoicedItems.length > 0 && (
              <Badge variant="secondary" className="ml-2">{toBeInvoicedItems.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoiced" className="flex-1 sm:flex-none">
            Gefactureerd
            {invoicedItems.length > 0 && (
              <Badge variant="secondary" className="ml-2">{invoicedItems.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="to-invoice" className="mt-6">
          {toBeInvoicedItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Alles gefactureerd!</p>
                <p className="text-muted-foreground">Er zijn geen activiteiten die nog gefactureerd moeten worden.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {toBeInvoicedItems.map((item) => (
                <InvoiceItemCard key={item.id} item={item} variant="to-invoice" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoiced" className="mt-6">
          {invoicedItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Nog geen facturen</p>
                <p className="text-muted-foreground">Je hebt nog geen facturen geregistreerd.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {invoicedItems.map((item) => (
                <InvoiceItemCard key={item.id} item={item} variant="invoiced" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface InvoiceItemCardProps {
  item: PartnerItem;
  variant: "to-invoice" | "invoiced";
}

const InvoiceItemCard = ({ item, variant }: InvoiceItemCardProps) => {
  const request = item.program_requests;
  const dates = request.selected_dates || [];
  const activityDate = dates[item.day_index];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{item.block_name}</h3>
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
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Bevestigde prijs</p>
                <p className="font-semibold">€{item.quoted_price?.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p>
              </div>
            ) : (
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>{item.invoiced_number}</span>
                </div>
                <p className="font-semibold">€{item.invoiced_amount?.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p>
                {item.commission_amount && item.commission_amount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Commissie: €{item.commission_amount.toFixed(2)}
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
