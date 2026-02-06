import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Receipt, Percent, Package } from "lucide-react";
import type { PurchaseInvoice } from "@/types/purchaseInvoice";

interface ProjectProfitSummaryProps {
  purchaseInvoices: PurchaseInvoice[];
  bureauInvoicedAmount: number;
  coordinationFee: number;
  totalCommissions?: number;
  className?: string;
}

export const ProjectProfitSummary = ({
  purchaseInvoices,
  bureauInvoicedAmount,
  coordinationFee,
  totalCommissions = 0,
  className,
}: ProjectProfitSummaryProps) => {
  const summary = useMemo(() => {
    // Calculate total revenue (what Bureau invoices to customer)
    const totalRevenue = bureauInvoicedAmount;

    // Calculate total purchase costs (partner invoices)
    const totalPurchaseCosts = purchaseInvoices
      .filter((inv) => inv.status !== "paid") // Include pending and forwarded
      .reduce((sum, inv) => sum + inv.amount_excl_vat, 0);

    // Gross margin = Revenue - Purchase costs
    const grossMargin = totalRevenue - totalPurchaseCosts;

    // Net margin includes coordination fee and commissions
    const netMargin = grossMargin + coordinationFee + totalCommissions;

    // Margin percentage
    const marginPercentage = totalRevenue > 0 ? (netMargin / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalPurchaseCosts,
      totalCommissions,
      coordinationFee,
      grossMargin,
      netMargin,
      marginPercentage,
      invoiceCount: purchaseInvoices.length,
    };
  }, [purchaseInvoices, bureauInvoicedAmount, coordinationFee, totalCommissions]);

  const formatPrice = (amount: number) => {
    return amount.toLocaleString("nl-NL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const isProfit = summary.netMargin >= 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Marge Overzicht
          <Badge variant={isProfit ? "default" : "destructive"} className="ml-auto">
            {summary.marginPercentage.toFixed(1)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Omzet (gefactureerd aan klant)</span>
            <span className="font-medium text-primary">€{formatPrice(summary.totalRevenue)}</span>
          </div>
        </div>

        {/* Costs Section */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-3 w-3" />
              Inkoopkosten ({summary.invoiceCount} facturen)
            </span>
            <span className="font-medium text-destructive">-€{formatPrice(summary.totalPurchaseCosts)}</span>
          </div>
        </div>

        {/* Gross Margin */}
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">Bruto marge</span>
          <span className={`font-medium ${summary.grossMargin >= 0 ? "text-primary" : "text-destructive"}`}>
            €{formatPrice(summary.grossMargin)}
          </span>
        </div>

        {/* Additional Income */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Receipt className="h-3 w-3" />
              Coördinatiefee
            </span>
            <span className="font-medium text-primary">+€{formatPrice(summary.coordinationFee)}</span>
          </div>
          {summary.totalCommissions > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Percent className="h-3 w-3" />
                Partner commissies
              </span>
              <span className="font-medium text-primary">+€{formatPrice(summary.totalCommissions)}</span>
            </div>
          )}
        </div>

        {/* Net Margin */}
        <div className="flex items-center justify-between pt-3 border-t-2">
          <span className="font-semibold flex items-center gap-2">
            {isProfit ? (
              <TrendingUp className="h-4 w-4 text-primary" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            Netto marge
          </span>
          <div className="text-right">
            <span className={`text-xl font-bold ${isProfit ? "text-primary" : "text-destructive"}`}>
              €{formatPrice(summary.netMargin)}
            </span>
          </div>
        </div>

        {!isProfit && (
          <p className="text-xs text-destructive mt-2">
            ⚠️ Dit project heeft een negatieve marge. Controleer de inkoopprijzen en verkoopprijzen.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
