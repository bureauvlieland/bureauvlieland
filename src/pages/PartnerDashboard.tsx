import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerDashboardHeader } from "@/components/partner-portal/PartnerDashboardHeader";
import { PartnerItemRow } from "@/components/partner-portal/PartnerItemRow";
import { PartnerItemSheet } from "@/components/partner-portal/PartnerItemSheet";
import { InvoiceRegistrationDialog } from "@/components/partner-portal/InvoiceRegistrationDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const [showSheet, setShowSheet] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
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
    quotedNotes?: string
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

  // Tab filtering with new status flow
  const pendingItems = data.items.filter((i) => i.status === "pending");
  const waitingItems = data.items.filter((i) => i.status === "confirmed"); // Waiting for customer
  const acceptedItems = data.items.filter((i) => i.status === "accepted" || i.status === "executed");
  const closedItems = data.items.filter((i) => 
    ["invoiced", "unavailable", "cancelled"].includes(i.status)
  );

  const renderItemsTable = (items: PartnerItem[], emptyMessage: string) => {
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

        {/* 4-tab structure */}
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
              <TabsTrigger value="waiting" className="whitespace-nowrap">
                Wacht op klant
                {waitingItems.length > 0 && (
                  <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {waitingItems.length}
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
            {renderItemsTable(pendingItems, "Geen nieuwe aanvragen.")}
          </TabsContent>

          <TabsContent value="waiting" className="mt-6">
            {renderItemsTable(waitingItems, "Geen activiteiten wachtend op klant.")}
          </TabsContent>

          <TabsContent value="accepted" className="mt-6">
            {renderItemsTable(acceptedItems, "Geen activiteiten met klantakkoord.")}
          </TabsContent>

          <TabsContent value="closed" className="mt-6">
            {renderItemsTable(closedItems, "Geen afgeronde activiteiten.")}
          </TabsContent>
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
