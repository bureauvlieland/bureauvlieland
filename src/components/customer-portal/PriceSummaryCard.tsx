import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, CheckCircle, Clock, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgramRequestItem } from "@/types/programRequest";

interface PriceSummaryCardProps {
  items: ProgramRequestItem[];
  className?: string;
}

export const PriceSummaryCard = ({ items, className }: PriceSummaryCardProps) => {
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

    const confirmedTotal = confirmedItems.reduce(
      (sum, item) => sum + (item.quoted_price || 0),
      0
    );

    return {
      confirmedTotal,
      confirmedCount: confirmedItems.length,
      pendingCount: pendingItems.length,
      hasConfirmedPrices: confirmedItems.length > 0,
    };
  }, [items]);

  // Don't show if there are no confirmed prices yet
  if (!summary.hasConfirmedPrices) {
    return null;
  }

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
            €{summary.confirmedTotal.toLocaleString("nl-NL", { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}
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

        {/* Divider */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {summary.pendingCount > 0 ? "Bevestigd subtotaal" : "Totaal"}
            </span>
            <span className="font-bold text-xl text-primary">
              €{summary.confirmedTotal.toLocaleString("nl-NL", { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
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
      </CardContent>
    </Card>
  );
};