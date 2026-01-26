import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerDashboardHeader } from "@/components/partner-portal/PartnerDashboardHeader";
import { PartnerFinancialSummary } from "@/components/partner-portal/PartnerFinancialSummary";
import { PartnerItemCard } from "@/components/partner-portal/PartnerItemCard";
import { InvoiceRegistrationDialog } from "@/components/partner-portal/InvoiceRegistrationDialog";
import { StatusUpdateDialog } from "@/components/partner-portal/StatusUpdateDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [partnerToken, setPartnerToken] = useState<string | null>(null);

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
      // Verify user is an admin
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

    // Regular partner flow
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
    itemId: string,
    status: string,
    statusNote?: string,
    executedAt?: string,
    quotedPrice?: number,
    quotedNotes?: string
  ): Promise<boolean> => {
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
            partnerToken: partnerToken,
            itemId,
            status,
            statusNote,
            executedAt,
            quotedPrice,
            quotedNotes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

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
    itemId: string,
    invoicedAmount: number,
    invoicedNumber: string,
    invoicedDate: string,
    notes?: string
  ): Promise<{ success: boolean; commission?: { percentage: number; amount: number } }> => {
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
            partnerToken: partnerToken,
            itemId,
            invoicedAmount,
            invoicedNumber,
            invoicedDate,
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

  const handleStatusUpdate = async (status: string, note?: string, quotedPrice?: number, quotedNotes?: string) => {
    if (!selectedItem) return;
    const success = await updateItemStatus(selectedItem.id, status, note, undefined, quotedPrice, quotedNotes);
    if (success) {
      setShowStatusDialog(false);
      setSelectedItem(null);
    }
  };

  const handleInvoiceRegister = async (
    amount: number,
    invoiceNumber: string,
    date: string,
    notes?: string
  ) => {
    if (!selectedItem) return { success: false };
    const result = await registerInvoice(selectedItem.id, amount, invoiceNumber, date, notes);
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

  const pendingItems = data.items.filter((i) => i.status === "pending");
  const waitingItems = data.items.filter((i) => i.status === "alternative");
  const confirmedItems = data.items.filter((i) => i.status === "confirmed" && !i.invoiced_number);
  const processedItems = data.items.filter((i) => ["unavailable", "cancelled"].includes(i.status));
  const invoicedItems = data.items.filter((i) => i.invoiced_number !== null);

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <PartnerDashboardHeader partner={data.partner} summary={data.summary} />
          <div className="flex items-center gap-2">
            {pendingItems.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                <Bell className="h-4 w-4" />
                <span>{pendingItems.length} nieuwe aanvra{pendingItems.length === 1 ? "ag" : "gen"}</span>
              </div>
            )}
            <Button onClick={refetchDashboard} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Vernieuwen
            </Button>
          </div>
        </div>

        {/* Financial Summary */}
        <PartnerFinancialSummary
          items={data.items}
          commissionPercentage={data.partner.commission_percentage}
        />

        <Tabs defaultValue="pending" className="mt-8">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pending" className="relative">
              Te bevestigen
              {pendingItems.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {pendingItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="waiting">
              Wacht op klant
              {waitingItems.length > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {waitingItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Bevestigd
              {confirmedItems.length > 0 && (
                <span className="ml-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                  {confirmedItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="processed">
              Afgehandeld
              {processedItems.length > 0 && (
                <span className="ml-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                  {processedItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="invoiced">
              Gefactureerd
              {invoicedItems.length > 0 && (
                <span className="ml-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                  {invoicedItems.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6 space-y-4">
            {pendingItems.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Geen activiteiten om te bevestigen.
                </CardContent>
              </Card>
            ) : (
              pendingItems.map((item) => (
                <PartnerItemCard
                  key={item.id}
                  item={item}
                  onConfirm={() => {
                    setSelectedItem(item);
                    setShowStatusDialog(true);
                  }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="waiting" className="mt-6 space-y-4">
            {waitingItems.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Geen alternatieve voorstellen die wachten op klantreactie.
                </CardContent>
              </Card>
            ) : (
              waitingItems.map((item) => (
                <PartnerItemCard
                  key={item.id}
                  item={item}
                  onEditProposal={() => {
                    setSelectedItem(item);
                    setShowStatusDialog(true);
                  }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="mt-6 space-y-4">
            {confirmedItems.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Geen bevestigde activiteiten die nog gefactureerd moeten worden.
                </CardContent>
              </Card>
            ) : (
              confirmedItems.map((item) => (
                <PartnerItemCard
                  key={item.id}
                  item={item}
                  onRegisterInvoice={() => {
                    setSelectedItem(item);
                    setShowInvoiceDialog(true);
                  }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="processed" className="mt-6 space-y-4">
            {processedItems.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Geen niet-beschikbare of geannuleerde activiteiten.
                </CardContent>
              </Card>
            ) : (
              processedItems.map((item) => (
                <PartnerItemCard key={item.id} item={item} />
              ))
            )}
          </TabsContent>

          <TabsContent value="invoiced" className="mt-6 space-y-4">
            {invoicedItems.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nog geen gefactureerde activiteiten.
                </CardContent>
              </Card>
            ) : (
              invoicedItems.map((item) => (
                <PartnerItemCard key={item.id} item={item} showInvoiceDetails />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <StatusUpdateDialog
        isOpen={showStatusDialog}
        onClose={() => {
          setShowStatusDialog(false);
          setSelectedItem(null);
        }}
        onSubmit={handleStatusUpdate}
        item={selectedItem}
      />

      <InvoiceRegistrationDialog
        isOpen={showInvoiceDialog}
        onClose={() => {
          setShowInvoiceDialog(false);
          setSelectedItem(null);
        }}
        onSubmit={handleInvoiceRegister}
        item={selectedItem}
        commissionPercentage={data.partner.commission_percentage}
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
