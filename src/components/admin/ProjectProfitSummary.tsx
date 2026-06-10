import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Package, AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PurchaseInvoice } from "@/types/purchaseInvoice";

interface ProjectProfitSummaryProps {
  purchaseInvoices: PurchaseInvoice[];
  /** Totaal-omzet aan klant — INCL. BTW (komt uit financieel overzicht) */
  bureauInvoicedAmount: number;
  /** Coördinatiefee incl. BTW (zit al in bureauInvoicedAmount; alleen ter info) */
  coordinationFee: number;
  /** Partner-commissies (ex BTW) die in de omzet zitten — alleen ter info */
  totalCommissions?: number;
  /** Verwachte inkoopkosten incl. BTW (afgeleid uit quoted_price) als er nog geen
   *  inkoopfacturen zijn geboekt. quoted_price wordt in onze UI altijd incl. BTW
   *  ingevoerd, dus deze waarde is incl. BTW. */
  expectedPartnerCosts?: number;
  className?: string;
}

/**
 * Marge-berekening uitsluitend op incl. BTW basis — de hele UI (offerte,
 * inkoopfacturen-paneel, financieel overzicht) staat incl. BTW. Eerder
 * werd `amount_excl_vat` afgetrokken van een incl.-omzet, wat de marge
 * structureel te rooskleurig maakte. Coördinatiefee en commissies zitten
 * al in de omzet en worden hier NIET nogmaals opgeteld.
 */
export const ProjectProfitSummary = ({
  purchaseInvoices,
  bureauInvoicedAmount,
  coordinationFee,
  totalCommissions = 0,
  expectedPartnerCosts = 0,
  className,
}: ProjectProfitSummaryProps) => {
  const summary = useMemo(() => {
    const revenueInclVat = bureauInvoicedAmount;

    const totalPurchaseInclVat = purchaseInvoices.reduce(
      (sum, inv) => sum + Number(inv.amount_incl_vat ?? 0),
      0,
    );
    const totalPurchaseExclVat = purchaseInvoices.reduce(
      (sum, inv) => sum + Number(inv.amount_excl_vat ?? 0),
      0,
    );

    const hasInvoices = purchaseInvoices.length > 0;
    const effectiveCostsIncl = hasInvoices ? totalPurchaseInclVat : expectedPartnerCosts;
    const effectiveCostsExcl = hasInvoices ? totalPurchaseExclVat : expectedPartnerCosts; // bij benadering
    const costsAreEstimated = !hasInvoices && expectedPartnerCosts > 0;

    const grossMarginIncl = revenueInclVat - effectiveCostsIncl;
    // Indicatieve excl.-marge: omzet excl. (≈ /1.09 of /1.21 gemengd) is lastig zonder
    // per-regel BTW. We tonen daarom alleen de inkoop-zijde als info en de incl.-marge
    // als hoofdgetal. De afgeleide "≈ excl."-regel is omzet incl. − BTW-deel inkoop:
    // dat is geen exacte excl.-marge maar geeft het juiste ordegrootte-verschil.
    const purchaseVatPortion = effectiveCostsIncl - effectiveCostsExcl;
    const grossMarginExclApprox = grossMarginIncl - purchaseVatPortion;

    const marginPercentage = revenueInclVat > 0 ? (grossMarginIncl / revenueInclVat) * 100 : 0;

    return {
      revenueInclVat,
      effectiveCostsIncl,
      effectiveCostsExcl,
      costsAreEstimated,
      coordinationFee,
      totalCommissions,
      grossMarginIncl,
      grossMarginExclApprox,
      marginPercentage,
      invoiceCount: purchaseInvoices.length,
    };
  }, [purchaseInvoices, bureauInvoicedAmount, coordinationFee, totalCommissions, expectedPartnerCosts]);

  const formatPrice = (amount: number) =>
    amount.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isProfit = summary.grossMarginIncl >= 0;

  return (
    <TooltipProvider>
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
          {/* Omzet */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Omzet (gefactureerd aan klant, incl. BTW)</span>
              <span className="font-medium text-primary">€{formatPrice(summary.revenueInclVat)}</span>
            </div>
            {summary.coordinationFee > 0 && (
              <div className="flex items-center justify-between text-xs pl-4 text-muted-foreground">
                <span>· waarvan coördinatiefee</span>
                <span>€{formatPrice(summary.coordinationFee)}</span>
              </div>
            )}
            {summary.totalCommissions > 0 && (
              <div className="flex items-center justify-between text-xs pl-4 text-muted-foreground">
                <span>· waarvan partner-commissies (ex BTW)</span>
                <span>€{formatPrice(summary.totalCommissions)}</span>
              </div>
            )}
          </div>

          {/* Inkoopkosten */}
          <div className="space-y-1 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-3 w-3" />
                {summary.costsAreEstimated ? (
                  <>
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    Verwachte inkoopkosten (incl. BTW)
                  </>
                ) : (
                  <>Inkoopkosten partners ({summary.invoiceCount} facturen, incl. BTW)</>
                )}
              </span>
              <span className="font-medium text-destructive">−€{formatPrice(summary.effectiveCostsIncl)}</span>
            </div>
            {!summary.costsAreEstimated && summary.effectiveCostsExcl > 0 && (
              <div className="flex items-center justify-between text-xs pl-5 text-muted-foreground">
                <span>· waarvan excl. BTW</span>
                <span>€{formatPrice(summary.effectiveCostsExcl)}</span>
              </div>
            )}
            {summary.costsAreEstimated && (
              <p className="text-xs text-muted-foreground ml-5">
                Op basis van programma-items — nog geen inkoopfacturen geregistreerd
              </p>
            )}
          </div>

          {/* Bruto marge */}
          <div className="pt-3 border-t-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-2">
                {isProfit ? (
                  <TrendingUp className="h-4 w-4 text-primary" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                Bruto marge (incl. BTW){summary.costsAreEstimated ? " (indicatief)" : ""}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Omzet incl. BTW minus inkoopkosten incl. BTW. BTW loopt fiscaal door
                    (afdracht − vooraftrek), dus deze marge benadert de werkelijke winst
                    vóór algemene kosten. Coördinatiefee en commissies zitten al in de omzet.
                  </TooltipContent>
                </Tooltip>
              </span>
              <span className={`text-xl font-bold ${isProfit ? "text-primary" : "text-destructive"}`}>
                €{formatPrice(summary.grossMarginIncl)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pl-6 text-muted-foreground mt-1">
              <span>≈ excl. BTW</span>
              <span>€{formatPrice(summary.grossMarginExclApprox)}</span>
            </div>
          </div>

          {!isProfit && (
            <p className="text-xs text-destructive mt-2">
              ⚠️ Dit project heeft een negatieve marge. Controleer de inkoop- en verkoopprijzen.
            </p>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
