import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, TrendingUp, Clock, CheckCircle, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PartnerItem } from "@/types/partner";

interface PartnerFinancialSummaryProps {
  items: PartnerItem[];
  commissionPercentage: number;
  className?: string;
}

export const PartnerFinancialSummary = ({
  items,
  commissionPercentage,
  className,
}: PartnerFinancialSummaryProps) => {
  const financials = useMemo(() => {
    // Current year for YTD calculation
    const currentYear = new Date().getFullYear();
    
    // Items with invoices this year
    const invoicedItemsThisYear = items.filter(item => {
      if (!item.invoiced_date) return false;
      const invoiceYear = new Date(item.invoiced_date).getFullYear();
      return invoiceYear === currentYear;
    });

    // Total invoiced YTD
    const totalInvoicedYTD = invoicedItemsThisYear.reduce(
      (sum, item) => sum + (item.invoiced_amount || 0),
      0
    );

    // Commission calculations
    const pendingCommission = items
      .filter(item => item.commission_status === "pending")
      .reduce((sum, item) => sum + (item.commission_amount || 0), 0);

    const invoicedCommission = items
      .filter(item => item.commission_status === "invoiced")
      .reduce((sum, item) => sum + (item.commission_amount || 0), 0);

    const paidCommission = items
      .filter(item => item.commission_status === "paid")
      .reduce((sum, item) => sum + (item.commission_amount || 0), 0);

    // Items ready to invoice (confirmed but not yet invoiced)
    const readyToInvoice = items.filter(
      item => item.status === "confirmed" && !item.invoiced_number
    );

    // Expected revenue from confirmed items
    const expectedRevenue = readyToInvoice.reduce(
      (sum, item) => sum + (item.quoted_price || 0),
      0
    );

    return {
      totalInvoicedYTD,
      pendingCommission,
      invoicedCommission,
      paidCommission,
      totalCommission: pendingCommission + invoicedCommission + paidCommission,
      readyToInvoiceCount: readyToInvoice.length,
      expectedRevenue,
      invoiceCount: invoicedItemsThisYear.length,
    };
  }, [items]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    });
  };

  return (
    <Card className={cn("mb-6", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Financieel overzicht
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Invoiced YTD */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Gefactureerd (YTD)</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(financials.totalInvoicedYTD)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {financials.invoiceCount} facturen dit jaar
            </p>
          </div>

          {/* Ready to Invoice */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Te factureren</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(financials.expectedRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {financials.readyToInvoiceCount} activiteiten klaar
            </p>
          </div>

          {/* Pending Commission */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-muted-foreground">Openstaande commissie</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(financials.pendingCommission)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {commissionPercentage}% commissie
            </p>
          </div>

          {/* Paid Commission */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Betaalde commissie</span>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(financials.paidCommission)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Dit jaar afgerekend
            </p>
          </div>
        </div>

        {/* Commission breakdown if there's pending commission */}
        {financials.pendingCommission > 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Let op:</strong> Je hebt {formatCurrency(financials.pendingCommission)} aan openstaande commissie. 
              Bureau Vlieland stuurt je hiervoor een factuur.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
