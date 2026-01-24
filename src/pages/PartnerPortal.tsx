import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";
import { usePartnerDashboard } from "@/hooks/usePartnerDashboard";
import { PartnerDashboardHeader } from "@/components/partner-portal/PartnerDashboardHeader";
import { PartnerItemCard } from "@/components/partner-portal/PartnerItemCard";
import { InvoiceRegistrationDialog } from "@/components/partner-portal/InvoiceRegistrationDialog";
import { StatusUpdateDialog } from "@/components/partner-portal/StatusUpdateDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import type { PartnerItem } from "@/types/partner";

const PartnerPortal = () => {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error, updateItemStatus, registerInvoice } = usePartnerDashboard(token || "");

  const [selectedItem, setSelectedItem] = useState<PartnerItem | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

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
          <h1 className="text-2xl font-bold mb-2">Partner portal niet gevonden</h1>
          <p className="text-muted-foreground">
            {error || "De opgegeven link is ongeldig of verlopen."}
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const pendingItems = data.items.filter((i) => i.status === "pending");
  const confirmedItems = data.items.filter((i) => i.status === "confirmed" && !i.invoiced_number);
  const processedItems = data.items.filter((i) => ["alternative", "unavailable", "cancelled"].includes(i.status));
  const invoicedItems = data.items.filter((i) => i.invoiced_number !== null);

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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Partner Portal | Bureau Vlieland</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navigation />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <PartnerDashboardHeader partner={data.partner} summary={data.summary} />

        <Tabs defaultValue="pending" className="mt-8">
          <TabsList className="grid w-full grid-cols-4">
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
                  Geen afgehandelde aanvragen.
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

export default PartnerPortal;
