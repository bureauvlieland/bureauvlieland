import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Receipt, Percent, Package, AlertTriangle } from "lucide-react";
import type { PurchaseInvoice } from "@/types/purchaseInvoice";

interface ProjectProfitSummaryProps {
  purchaseInvoices: PurchaseInvoice[];
  /** Total revenue incl. BTW (program items + coordination fee + extra costs) */
  bureauInvoicedAmount: number;
  coordinationFee: number;
  totalCommissions?: number;
  /** Expected partner costs (from item prices) when no purchase invoices exist */
  expectedPartnerCosts?: number;
  className?: string;
}

export const ProjectProfitSummary = ({
  purchaseInvoices,
  bureauInvoicedAmount,
  coordinationFee,
  totalCommissions = 0,
  expectedPartnerCosts = 0,
  className,
}: ProjectProfitSummaryProps) => {
  const summary = useMemo(() => {
    // Revenue excl. BTW (assume 21% weighted average — items already incl. BTW)
    // For a more precise calc we'd need per-item VAT, but this is a good approximation
    const totalRevenueInclVat = bureauInvoicedAmount;

    // Total purchase costs excl. BTW — count ALL invoices regardless of status
    const totalPurchaseCosts = purchaseInvoices.reduce(
      (sum, inv) => sum + inv.amount_excl_vat,
      0,
    );

    // Use expected costs when no purchase invoices registered yet
    const hasInvoices = purchaseInvoices.length > 0;
    const effectiveCosts = hasInvoices ? totalPurchaseCosts : expectedPartnerCosts;
    const costsAreEstimated = !hasInvoices && expectedPartnerCosts > 0;

    // Gross margin = Revenue - Purchase costs (both incl. BTW for consistency)
    const grossMargin = totalRevenueInclVat - effectiveCosts;

    // Net margin includes coordination fee (already in revenue) and commissions
    const netMargin = grossMargin + totalCommissions;

    // Margin percentage
    const marginPercentage =
      totalRevenueInclVat > 0 ? (netMargin / totalRevenueInclVat) * 100 : 0;

    return {
      totalRevenueInclVat,
      totalPurchaseCosts: effectiveCosts,
      costsAreEstimated,
      totalCommissions,
      coordinationFee,
      grossMargin,
      netMargin,
      marginPercentage,
      invoiceCount: purchaseInvoices.length,
    };
  }, [purchaseInvoices, bureauInvoicedAmount, coordinationFee, totalCommissions, expectedPartnerCosts]);

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
            <span className="font-medium text-primary">€{formatPrice(summary.totalRevenueInclVat)}</span>
          </div>
        </div>

        {/* Costs Section */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-3 w-3" />
              {summary.costsAreEstimated ? (
                <>
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  Verwachte inkoopkosten
                </>
              ) : (
                <>Inkoopkosten ({summary.invoiceCount} facturen)</>
              )}
            </span>
            <span className="font-medium text-destructive">-€{formatPrice(summary.totalPurchaseCosts)}</span>
          </div>
          {summary.costsAreEstimated && (
            <p className="text-xs text-muted-foreground ml-5">
              Op basis van programma-items — nog geen inkoopfacturen geregistreerd
            </p>
          )}
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
            <span className="font-medium text-primary">€{formatPrice(summary.coordinationFee)}</span>
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
            Netto marge{summary.costsAreEstimated ? " (indicatief)" : ""}
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
