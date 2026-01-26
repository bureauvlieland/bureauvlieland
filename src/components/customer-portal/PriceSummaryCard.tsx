import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, CheckCircle, Clock, HelpCircle, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgramRequestItem } from "@/types/programRequest";

interface PriceSummaryCardProps {
  items: ProgramRequestItem[];
  numberOfPeople?: number;
  className?: string;
}

// Coordination fee tiers based on group size
const getCoordinationFee = (numberOfPeople: number): number => {
  if (numberOfPeople <= 10) return 50;
  if (numberOfPeople <= 25) return 100;
  if (numberOfPeople <= 100) return 250;
  if (numberOfPeople <= 150) return 350;
  return 500;
};

export const PriceSummaryCard = ({ items, numberOfPeople = 20, className }: PriceSummaryCardProps) => {
  const summary = useMemo(() => {
    // Filter out self-arranged and cancelled items
    const relevantItems = items.filter(
      (item) => item.block_type !== "self_arranged" && item.status !== "cancelled"
    );

    const confirmedItems = relevantItems.filter(
      (item) => item.status === "confirmed" && item.quoted_price !== null
    );
    
    const pendingItems = relevantItems.filter(
      (item) => item.status === "pending" || item.status === "alternative"
    );

    // Bureau items that are confirmed
    const confirmedBureauItems = confirmedItems.filter(
      (item) => item.block_type === "bureau"
    );

    // Partner items that are confirmed  
    const confirmedPartnerItems = confirmedItems.filter(
      (item) => item.block_type === "partner"
    );

    const bureauTotal = confirmedBureauItems.reduce(
      (sum, item) => sum + (item.quoted_price || 0),
      0
    );

    const partnerTotal = confirmedPartnerItems.reduce(
      (sum, item) => sum + (item.quoted_price || 0),
      0
    );

    const confirmedTotal = bureauTotal + partnerTotal;

    // Coordination fee
    const coordinationFee = getCoordinationFee(numberOfPeople);

    return {
      confirmedTotal,
      bureauTotal,
      partnerTotal,
      coordinationFee,
      grandTotal: bureauTotal + coordinationFee, // Only bureau items + fee are invoiced by Bureau Vlieland
      confirmedCount: confirmedItems.length,
      pendingCount: pendingItems.length,
      hasConfirmedPrices: confirmedItems.length > 0,
      hasBureauItems: confirmedBureauItems.length > 0,
      hasPartnerItems: confirmedPartnerItems.length > 0,
    };
  }, [items, numberOfPeople]);

  // Don't show if there are no confirmed prices yet
  if (!summary.hasConfirmedPrices) {
    return null;
  }

  const formatPrice = (amount: number) => {
    return amount.toLocaleString("nl-NL", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  return (
    <Card className={cn("mb-6", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Prijsoverzicht
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Confirmed prices */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>
              Bevestigde activiteiten ({summary.confirmedCount})
            </span>
          </div>
          <span className="font-semibold text-lg">
            €{formatPrice(summary.confirmedTotal)}
          </span>
        </div>

        {/* Pending prices */}
        {summary.pendingCount > 0 && (
          <div className="flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>
                Nog te bevestigen ({summary.pendingCount})
              </span>
            </div>
            <span className="text-sm italic">Prijs volgt</span>
          </div>
        )}

        {/* Divider and breakdown */}
        <div className="border-t pt-3 space-y-2">
          {/* Bureau Vlieland section */}
          {(summary.hasBureauItems || true) && (
            <div className="bg-primary/5 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4 text-primary" />
                <span>Factuur Bureau Vlieland</span>
              </div>
              
              {summary.hasBureauItems && (
                <div className="flex items-center justify-between text-sm pl-6">
                  <span className="text-muted-foreground">Activiteiten</span>
                  <span>€{formatPrice(summary.bureauTotal)}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm pl-6">
                <span className="text-muted-foreground">Coördinatie & handling fee</span>
                <span>€{formatPrice(summary.coordinationFee)}</span>
              </div>
              
              <div className="flex items-center justify-between font-medium pt-2 border-t border-primary/10 pl-6">
                <span>Subtotaal Bureau Vlieland</span>
                <span className="text-primary">€{formatPrice(summary.bureauTotal + summary.coordinationFee)}</span>
              </div>
            </div>
          )}

          {/* Partner invoices section */}
          {summary.hasPartnerItems && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>Facturen aanbieders</span>
              </div>
              
              <div className="flex items-center justify-between text-sm pl-6">
                <span className="text-muted-foreground">Partner activiteiten</span>
                <span>€{formatPrice(summary.partnerTotal)}</span>
              </div>
            </div>
          )}

          {/* Grand total */}
          <div className="flex items-center justify-between pt-2">
            <span className="font-medium">
              {summary.pendingCount > 0 ? "Bevestigd totaal" : "Totaal programma"}
            </span>
            <span className="font-bold text-xl text-primary">
              €{formatPrice(summary.confirmedTotal + summary.coordinationFee)}
            </span>
          </div>
        </div>

        {/* Note about pending items */}
        {summary.pendingCount > 0 && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Het definitieve totaalbedrag wordt bekend zodra alle activiteiten zijn bevestigd. 
              Je ontvangt bericht wanneer een aanbieder bevestigt.
            </p>
          </div>
        )}

        {/* Fee explanation */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p>
            💡 De coördinatiefee dekt de organisatie en afstemming van je programma door Bureau Vlieland.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
