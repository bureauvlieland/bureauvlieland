import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerDashboardHeader } from "@/components/partner-portal/PartnerDashboardHeader";
import { PartnerItemCard } from "@/components/partner-portal/PartnerItemCard";
import { InvoiceRegistrationDialog } from "@/components/partner-portal/InvoiceRegistrationDialog";
import { StatusUpdateDialog } from "@/components/partner-portal/StatusUpdateDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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

  // Simplified tab structure: Nieuw, In behandeling, Bevestigd, Afgesloten
  const pendingItems = data.items.filter((i) => i.status === "pending");
  const alternativeItems = data.items.filter((i) => i.status === "alternative");
  const confirmedItems = data.items.filter((i) => i.status === "confirmed" && !i.invoiced_number);
  const closedItems = data.items.filter((i) => ["unavailable", "cancelled"].includes(i.status));

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <PartnerDashboardHeader partner={data.partner} summary={data.summary} />
          <div className="flex items-center gap-2">
            {pendingItems.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                <Bell className="h-4 w-4" />
                <span>{pendingItems.length} nieuw</span>
              </div>
            )}
            <Button onClick={refetchDashboard} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Vernieuwen
            </Button>
          </div>
        </div>

        {/* Simplified 4-tab structure */}
        <Tabs defaultValue="pending" className="mt-8">
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
              <TabsTrigger value="alternative" className="whitespace-nowrap">
                In behandeling
                {alternativeItems.length > 0 && (
                  <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {alternativeItems.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="whitespace-nowrap">
                Bevestigd
                {confirmedItems.length > 0 && (
                  <span className="ml-2 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                    {confirmedItems.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="closed" className="whitespace-nowrap">
                Afgesloten
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="pending" className="mt-6 space-y-4">
            {pendingItems.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Geen nieuwe aanvragen.
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

          <TabsContent value="alternative" className="mt-6 space-y-4">
            {alternativeItems.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Geen voorstellen in behandeling.
                </CardContent>
              </Card>
            ) : (
              alternativeItems.map((item) => (
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
                  Geen bevestigde activiteiten.
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

          <TabsContent value="closed" className="mt-6 space-y-4">
            {closedItems.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Geen afgesloten activiteiten.
                </CardContent>
              </Card>
            ) : (
              closedItems.map((item) => (
                <PartnerItemCard key={item.id} item={item} />
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