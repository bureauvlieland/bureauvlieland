import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Download, Mail, Check, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { usePurchaseInvoicesByRequest } from "@/hooks/usePurchaseInvoices";
import { ForwardToAccountingDialog } from "@/components/admin/ForwardToAccountingDialog";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { PurchaseInvoiceWithRelations } from "@/types/purchaseInvoice";

interface PurchaseInvoicesCardProps {
  requestId: string;
}

export function PurchaseInvoicesCard({ requestId }: PurchaseInvoicesCardProps) {
  const { invoices, isLoading, stats, markAsPaid, getDownloadUrl } = usePurchaseInvoicesByRequest(requestId);
  const [forwardDialogInvoice, setForwardDialogInvoice] = useState<PurchaseInvoiceWithRelations | null>(null);

  const handleDownloadPdf = async (filePath: string) => {
    const url = await getDownloadUrl(filePath);
    if (url) {
      window.open(url, "_blank");
    }
  };

  const getStatusBadge = (invoice: PurchaseInvoiceWithRelations) => {
    switch (invoice.status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            In afwachting
          </Badge>
        );
      case "forwarded":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
            <ArrowRight className="h-3 w-3 mr-1" />
            Doorgestuurd
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Betaald
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inkoopfacturen Partners
          </CardTitle>
          <CardDescription>
            Facturen van partners aan Bureau Vlieland
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nog geen inkoopfacturen ontvangen</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary stats */}
              <div className="flex items-center gap-4 text-sm border-b pb-3">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Totaal:</span>
                  <span className="font-medium">
                    €{stats.totalAmount.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {stats.pending > 0 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                      {stats.pending} wachtend
                    </Badge>
                  )}
                  {stats.forwarded > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      {stats.forwarded} doorgestuurd
                    </Badge>
                  )}
                  {stats.paid > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                      {stats.paid} betaald
                    </Badge>
                  )}
                </div>
              </div>

              {/* Invoice list */}
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{invoice.invoice_number}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{invoice.partner?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: nl })}</span>
                        <span>•</span>
                        <span>€{Number(invoice.amount_excl_vat).toLocaleString("nl-NL", { minimumFractionDigits: 2 })} excl.</span>
                        {invoice.description && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">{invoice.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(invoice)}
                      <div className="flex items-center gap-1">
                        {invoice.file_path && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDownloadPdf(invoice.file_path!)}
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {invoice.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setForwardDialogInvoice(invoice)}
                            title="Doorsturen naar Snelstart"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {invoice.status !== "paid" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => markAsPaid.mutate(invoice.id)}
                            title="Markeer als betaald"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ForwardToAccountingDialog
        invoice={forwardDialogInvoice}
        onClose={() => setForwardDialogInvoice(null)}
      />
    </>
  );
}
