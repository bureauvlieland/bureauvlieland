import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, CheckCircle, Clock, HelpCircle, Building2, FileText, AlertCircle, BedDouble } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";

interface PriceSummaryCardProps {
  items: ProgramRequestItem[];
  numberOfPeople?: number;
  className?: string;
  variant?: "default" | "compact";
  termsAccepted?: boolean;
  // Accommodation data
  selectedAccommodationQuote?: AccommodationQuote | null;
}

// Coordination fee tiers based on group size
const getCoordinationFee = (numberOfPeople: number): number => {
  if (numberOfPeople <= 10) return 50;
  if (numberOfPeople <= 25) return 100;
  if (numberOfPeople <= 100) return 250;
  if (numberOfPeople <= 150) return 350;
  return 500;
};

// Calculate VAT breakdown
const calculateVatBreakdown = (amountInclVat: number, vatRate: number = 21) => {
  const exclVat = amountInclVat / (1 + vatRate / 100);
  const vatAmount = amountInclVat - exclVat;
  return { exclVat, vatAmount };
};

export const PriceSummaryCard = ({ 
  items, 
  numberOfPeople = 20, 
  className, 
  variant = "default",
  termsAccepted = false,
  selectedAccommodationQuote,
}: PriceSummaryCardProps) => {
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

    // Accommodation pricing
    const accommodationTotal = selectedAccommodationQuote?.price_total || 0;
    const accommodationVatRate = selectedAccommodationQuote?.vat_rate || 9;
    const accommodationVat = calculateVatBreakdown(accommodationTotal, accommodationVatRate);

    const confirmedTotal = bureauTotal + partnerTotal;

    // Coordination fee (includes VAT)
    const coordinationFee = getCoordinationFee(numberOfPeople);

    // Calculate VAT breakdown
    const bureauVat = calculateVatBreakdown(bureauTotal);
    const partnerVat = calculateVatBreakdown(partnerTotal);
    const feeVat = calculateVatBreakdown(coordinationFee);

    const totalExclVat = bureauVat.exclVat + partnerVat.exclVat + feeVat.exclVat + accommodationVat.exclVat;
    const totalVatAmount = bureauVat.vatAmount + partnerVat.vatAmount + feeVat.vatAmount + accommodationVat.vatAmount;

    return {
      confirmedTotal,
      bureauTotal,
      partnerTotal,
      coordinationFee,
      grandTotal: bureauTotal + coordinationFee, // Only bureau items + fee are invoiced by Bureau Vlieland
      bureauExclVat: bureauVat.exclVat + feeVat.exclVat,
      bureauVatAmount: bureauVat.vatAmount + feeVat.vatAmount,
      partnerExclVat: partnerVat.exclVat,
      partnerVatAmount: partnerVat.vatAmount,
      // Accommodation
      accommodationTotal,
      accommodationExclVat: accommodationVat.exclVat,
      accommodationVatAmount: accommodationVat.vatAmount,
      accommodationVatRate,
      hasAccommodation: !!selectedAccommodationQuote,
      accommodationName: selectedAccommodationQuote?.accommodation_name || "",
      accommodationPartnerName: selectedAccommodationQuote?.partner?.name || "",
      // Totals
      totalExclVat,
      totalVatAmount,
      grandTotalInclVat: confirmedTotal + coordinationFee + accommodationTotal,
      confirmedCount: confirmedItems.length,
      pendingCount: pendingItems.length,
      hasConfirmedPrices: confirmedItems.length > 0 || !!selectedAccommodationQuote,
      hasBureauItems: confirmedBureauItems.length > 0,
      hasPartnerItems: confirmedPartnerItems.length > 0,
    };
  }, [items, numberOfPeople, selectedAccommodationQuote]);

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

  // Compact variant for sidebar
  if (variant === "compact") {
    return (
      <div className={cn("bg-muted/50 rounded-lg p-3", className)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Prijsoverzicht</span>
        </div>
        <div className="space-y-1.5 text-sm">
          {/* Logies - amber accent */}
          {summary.hasAccommodation && (
            <div className="flex items-center justify-between">
              <span className="text-amber-700 dark:text-amber-400">Logies</span>
              <span className="text-amber-700 dark:text-amber-400">€{formatPrice(summary.accommodationTotal)}</span>
            </div>
          )}
          
          {/* Bureau Vlieland - primary accent */}
          {(summary.hasBureauItems || summary.coordinationFee > 0) && (
            <div className="flex items-center justify-between">
              <span className="text-primary">Bureau Vlieland</span>
              <span className="text-primary">€{formatPrice(summary.bureauTotal + summary.coordinationFee)}</span>
            </div>
          )}
          
          {/* Partner activiteiten - muted */}
          {summary.hasPartnerItems && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Aanbieders</span>
              <span className="text-muted-foreground">€{formatPrice(summary.partnerTotal)}</span>
            </div>
          )}
          
          {/* Totaal */}
          <div className="flex items-center justify-between pt-1.5 border-t">
            <span className="font-medium">Totaal incl. BTW</span>
            <span className="font-semibold text-primary">€{formatPrice(summary.grandTotalInclVat)}</span>
          </div>
          
          {summary.pendingCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              +{summary.pendingCount} activiteit{summary.pendingCount > 1 ? "en" : ""} nog te bevestigen
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Prijsoverzicht
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary header */}
        <div className="space-y-2">
          {summary.hasAccommodation && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <BedDouble className="h-4 w-4 text-green-600" />
                <span>Logies ({summary.accommodationName})</span>
              </div>
              <span className="font-semibold">€{formatPrice(summary.accommodationTotal)}</span>
            </div>
          )}
          
          {summary.confirmedCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Bevestigde activiteiten ({summary.confirmedCount})</span>
              </div>
              <span className="font-semibold">€{formatPrice(summary.confirmedTotal)}</span>
            </div>
          )}
        </div>

        {/* Pending prices */}
        {summary.pendingCount > 0 && (
          <div className="flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>Nog te bevestigen ({summary.pendingCount})</span>
            </div>
            <span className="text-sm italic">Prijs volgt</span>
          </div>
        )}

        {/* Divider and breakdown */}
        <div className="border-t pt-3 space-y-2">
          {/* Accommodation section */}
          {summary.hasAccommodation && (
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BedDouble className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Factuur {summary.accommodationPartnerName}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm pl-6">
                <span className="text-muted-foreground">{summary.accommodationName}</span>
                <span>€{formatPrice(summary.accommodationTotal)}</span>
              </div>

              {/* VAT breakdown for Accommodation */}
              <div className="border-t border-amber-200 dark:border-amber-800 pt-2 mt-2 space-y-1 pl-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotaal excl. BTW</span>
                  <span>€{formatPrice(summary.accommodationExclVat)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>BTW ({summary.accommodationVatRate}%)</span>
                  <span>€{formatPrice(summary.accommodationVatAmount)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between font-medium pt-2 border-t border-amber-200 dark:border-amber-800 pl-6">
                <span>Subtotaal incl. BTW</span>
                <span className="text-amber-700 dark:text-amber-400">€{formatPrice(summary.accommodationTotal)}</span>
              </div>
            </div>
          )}

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

              {/* VAT breakdown for Bureau */}
              <div className="border-t border-primary/10 pt-2 mt-2 space-y-1 pl-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotaal excl. BTW</span>
                  <span>€{formatPrice(summary.bureauExclVat)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>BTW (21%)</span>
                  <span>€{formatPrice(summary.bureauVatAmount)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between font-medium pt-2 border-t border-primary/10 pl-6">
                <span>Subtotaal incl. BTW</span>
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
                <span className="text-muted-foreground">Activiteiten aanbieders</span>
                <span>€{formatPrice(summary.partnerTotal)}</span>
              </div>

              {/* VAT breakdown for Partners */}
              <div className="border-t pt-2 mt-2 space-y-1 pl-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotaal excl. BTW</span>
                  <span>€{formatPrice(summary.partnerExclVat)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>BTW (21%)</span>
                  <span>€{formatPrice(summary.partnerVatAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Grand total with VAT */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Totaal excl. BTW</span>
              <span>€{formatPrice(summary.totalExclVat)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Totaal BTW</span>
              <span>€{formatPrice(summary.totalVatAmount)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-medium">
                {summary.pendingCount > 0 ? "Bevestigd totaal incl. BTW" : "Totaal incl. BTW"}
              </span>
              <span className="font-bold text-xl text-primary">
                €{formatPrice(summary.grandTotalInclVat)}
              </span>
            </div>
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

        {/* Workflow explanation */}
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-start gap-2 text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 rounded-lg p-3">
            <FileText className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Wanneer wordt er gefactureerd?</p>
              <p>
                {termsAccepted 
                  ? "Je hebt de voorwaarden geaccepteerd. De facturen worden binnenkort verstuurd."
                  : "Facturatie vindt pas plaats nadat je akkoord gaat met de algemene voorwaarden. Op dat moment worden de reserveringen definitief en is kosteloos annuleren niet meer mogelijk."}
              </p>
            </div>
          </div>

          {!termsAccepted && (
            <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Let op: meerdere voorwaarden van toepassing</p>
                <p>
                  Naast de algemene voorwaarden van Bureau Vlieland zijn ook de voorwaarden van de individuele aanbieders van toepassing op hun activiteiten.
                </p>
              </div>
            </div>
          )}
        </div>

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
