import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Inbox,
  FileText,
  Loader2,
  Sparkles,
  AlertCircle,
  Trash2,
  CheckCircle,
  RefreshCw,
  Download,
  ArrowRight,
  Mail,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { usePurchaseInvoiceInbox } from "@/hooks/usePurchaseInvoiceInbox";
import { AddPurchaseInvoiceDialog } from "@/components/admin/AddPurchaseInvoiceDialog";
import type { InboxStatus, PurchaseInvoiceInboxItem } from "@/types/purchaseInvoiceInbox";

export default function AdminPurchaseInvoiceInbox() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<InboxStatus | "all">("new");
  const { items, isLoading, discard, rescan } = usePurchaseInvoiceInbox(tab);
  const [processingItem, setProcessingItem] = useState<PurchaseInvoiceInboxItem | null>(null);

  const handleDownload = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("partner-invoices")
      .createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const renderScanStatus = (item: PurchaseInvoiceInboxItem) => {
    switch (item.scan_status) {
      case "pending":
      case "scanning":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Scant…
          </Badge>
        );
      case "scanned":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Sparkles className="h-3 w-3 mr-1" /> Gescand
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" /> Mislukt
          </Badge>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Inbox className="h-8 w-8" />
              Inkoopfactuur-inbox
            </h1>
            <p className="text-muted-foreground">
              Mail je facturen naar <code className="bg-muted px-1.5 py-0.5 rounded text-sm">invoices@reply.bureauvlieland.nl</code> — ze worden automatisch gescand.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/admin/inkoopfacturen">
              <ArrowRight className="h-4 w-4 mr-2" />
              Naar inkoopfacturen
            </Link>
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as InboxStatus | "all")}>
          <TabsList>
            <TabsTrigger value="new">Nieuw</TabsTrigger>
            <TabsTrigger value="processed">Verwerkt</TabsTrigger>
            <TabsTrigger value="discarded">Genegeerd</TabsTrigger>
            <TabsTrigger value="all">Alle</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : !items || items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Geen items</p>
              <p className="text-sm mt-1">
                Stuur een e-mail met PDF-bijlage naar het inbox-adres om te beginnen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.subject || "(geen onderwerp)"}</span>
                        {renderScanStatus(item)}
                        {item.status === "processed" && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" /> Verwerkt
                          </Badge>
                        )}
                        {item.status === "discarded" && (
                          <Badge variant="outline" className="bg-slate-50 text-slate-600">
                            Genegeerd
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Van: <strong>{item.from_name || item.from_email}</strong> &lt;{item.from_email}&gt; ·{" "}
                        {format(new Date(item.created_at), "EEE d MMM yyyy HH:mm", { locale: nl })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {item.scan_result && (
                    <div className="bg-muted/40 rounded-md p-3 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Leverancier</div>
                        <div className="font-medium truncate">{item.scan_result.supplier_name || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Factuurnr.</div>
                        <div className="font-medium truncate">{item.scan_result.invoice_number || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Datum</div>
                        <div className="font-medium">{item.scan_result.invoice_date || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Excl. BTW</div>
                        <div className="font-mono font-semibold">
                          {item.scan_result.amount_excl_vat != null
                            ? `€${item.scan_result.amount_excl_vat.toFixed(2)}`
                            : "—"}
                        </div>
                      </div>
                    </div>
                  )}

                  {item.scan_status === "failed" && item.scan_error && (
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
                      {item.scan_error}
                    </div>
                  )}

                  {item.attachment_filename && (
                    <div className="text-xs text-muted-foreground">
                      📎 {item.attachment_filename}
                      {item.attachment_size && ` (${Math.round(item.attachment_size / 1024)} KB)`}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {item.attachment_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(item.attachment_path!)}
                      >
                        <Download className="h-3 w-3 mr-1" /> PDF bekijken
                      </Button>
                    )}
                    {item.scan_status === "failed" && item.attachment_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rescan.mutate(item)}
                        disabled={rescan.isPending}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Opnieuw scannen
                      </Button>
                    )}
                    {item.status === "new" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setProcessingItem(item)}
                          disabled={item.scan_status === "scanning" || item.scan_status === "pending"}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Verwerken
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => discard.mutate(item.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Negeren
                        </Button>
                      </>
                    )}
                    {item.status === "processed" && item.processed_invoice_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/admin/inkoopfacturen")}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" /> Bekijk factuur
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddPurchaseInvoiceDialog
        open={!!processingItem}
        onClose={() => setProcessingItem(null)}
        inboxItem={processingItem || undefined}
      />
    </AdminLayout>
  );
}
