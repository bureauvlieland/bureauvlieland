import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";
import { PartnerDashboardHeader } from "@/components/partner-portal/PartnerDashboardHeader";
import { PartnerItemCard } from "@/components/partner-portal/PartnerItemCard";
import { InvoiceRegistrationDialog } from "@/components/partner-portal/InvoiceRegistrationDialog";
import { StatusUpdateDialog } from "@/components/partner-portal/StatusUpdateDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PartnerItem, PartnerDashboardData } from "@/types/partner";

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PartnerItem | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  // Check auth and fetch dashboard data
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/partner/login");
        return;
      }

      // Get partner data using auth user id
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

      // Fetch dashboard data using partner token
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-partner-dashboard?token=${partner.partner_token}`,
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

    checkAuthAndFetch();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/partner/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Uitgelogd",
      description: "Je bent succesvol uitgelogd.",
    });
    navigate("/partner/login");
  };

  const refetchDashboard = async () => {
    if (!data) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: partner } = await supabase
      .from("partners")
      .select("partner_token")
      .eq("auth_user_id", session.user.id)
      .single();

    if (!partner) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-partner-dashboard?token=${partner.partner_token}`,
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
  };

  const updateItemStatus = async (
    itemId: string,
    status: string,
    statusNote?: string,
    executedAt?: string,
    quotedPrice?: number,
    quotedNotes?: string
  ): Promise<boolean> => {
    if (!data) return false;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { data: partner } = await supabase
      .from("partners")
      .select("partner_token")
      .eq("auth_user_id", session.user.id)
      .single();

    if (!partner) return false;

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
            partnerToken: partner.partner_token,
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
    if (!data) return { success: false };
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false };

    const { data: partner } = await supabase
      .from("partners")
      .select("partner_token")
      .eq("auth_user_id", session.user.id)
      .single();

    if (!partner) return { success: false };

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
            partnerToken: partner.partner_token,
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
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <Skeleton className="h-32 w-full mb-6" />
          <Skeleton className="h-64 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16 max-w-2xl text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Fout</h1>
          <p className="text-muted-foreground mb-6">
            {error || "Er is een fout opgetreden."}
          </p>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Uitloggen
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const pendingItems = data.items.filter((i) => i.status === "pending");
  const confirmedItems = data.items.filter((i) => i.status === "confirmed" && !i.invoiced_number);
  const invoicedItems = data.items.filter((i) => i.invoiced_number !== null);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Partner Dashboard | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navigation />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex justify-between items-start mb-6">
          <PartnerDashboardHeader partner={data.partner} summary={data.summary} />
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Uitloggen
          </Button>
        </div>

        <Tabs defaultValue="pending" className="mt-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="relative">
              Te bevestigen
              {pendingItems.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {pendingItems.length}
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
      </main>

      <Footer />

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
    </div>
  );
};

export default PartnerDashboard;