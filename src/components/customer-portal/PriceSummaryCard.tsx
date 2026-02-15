import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, CheckCircle, Clock, HelpCircle, Building2, FileText, AlertCircle, BedDouble } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";
import { useAppSettings } from "@/hooks/useAppSettings";
import { calculateExclVat, calculateVatAmount } from "@/lib/appSettings";
import { supabase } from "@/integrations/supabase/client";

interface PriceSummaryCardProps {
  items: ProgramRequestItem[];
  numberOfPeople: number;
  className?: string;
  variant?: "default" | "compact";
  termsAccepted?: boolean;
  selectedAccommodationQuote?: AccommodationQuote | null;
  invoicingMode?: string;
}

// Calculate VAT breakdown
const calculateVatBreakdown = (amountInclVat: number, vatRate: number = 21) => {
  const exclVat = calculateExclVat(amountInclVat, vatRate);
  const vatAmount = calculateVatAmount(amountInclVat, vatRate);
  return { exclVat, vatAmount };
};

export const PriceSummaryCard = ({ 
  items, 
  numberOfPeople, 
  className, 
  variant = "default",
  termsAccepted = false,
  selectedAccommodationQuote,
  invoicingMode,
}: PriceSummaryCardProps) => {
  const isBureauCentral = invoicingMode === "bureau_central";
  const { getCoordinationFee, getVatRate, settings: appSettings } = useAppSettings();

  // Fetch VAT rates per building block
  const [vatRateMap, setVatRateMap] = useState<Record<string, number>>({});
  useEffect(() => {
    const blockIds = items.map(i => i.block_id).filter(Boolean) as string[];
    if (blockIds.length === 0) return;
    supabase
      .from("building_blocks")
      .select("id, vat_rate")
      .in("id", blockIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, number> = {};
          data.forEach(b => { map[b.id] = b.vat_rate ?? 21; });
          setVatRateMap(map);
        }
      });
  }, [items]);

  const getItemVatRate = (item: ProgramRequestItem): number => {
    if (item.block_id && vatRateMap[item.block_id] !== undefined) {
      return vatRateMap[item.block_id];
    }
    return 21;
  };
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
    const coordinationFeeAmount = getCoordinationFee(numberOfPeople);
    const standardVatRate = getVatRate("standard");

    // Central invoicing surcharge
    const centralSurcharge = isBureauCentral ? appSettings.bureau_central_surcharge_pp * numberOfPeople : 0;

    // Calculate per-item VAT using actual building block rates
    let bureauExclVat = 0;
    let bureauVatAmount = 0;
    const bureauVatLines: Record<number, { exclVat: number; vatAmount: number }> = {};
    confirmedBureauItems.forEach(item => {
      const rate = getItemVatRate(item);
      const price = item.quoted_price || 0;
      const breakdown = calculateVatBreakdown(price, rate);
      bureauExclVat += breakdown.exclVat;
      bureauVatAmount += breakdown.vatAmount;
      if (!bureauVatLines[rate]) bureauVatLines[rate] = { exclVat: 0, vatAmount: 0 };
      bureauVatLines[rate].exclVat += breakdown.exclVat;
      bureauVatLines[rate].vatAmount += breakdown.vatAmount;
    });
    // Add coordination fee + surcharge (always 21%)
    const feeVat = calculateVatBreakdown(coordinationFeeAmount + centralSurcharge, standardVatRate);
    bureauExclVat += feeVat.exclVat;
    bureauVatAmount += feeVat.vatAmount;
    if (!bureauVatLines[standardVatRate]) bureauVatLines[standardVatRate] = { exclVat: 0, vatAmount: 0 };
    bureauVatLines[standardVatRate].exclVat += feeVat.exclVat;
    bureauVatLines[standardVatRate].vatAmount += feeVat.vatAmount;

    let partnerExclVat = 0;
    let partnerVatAmount = 0;
    const partnerVatLines: Record<number, { exclVat: number; vatAmount: number }> = {};
    confirmedPartnerItems.forEach(item => {
      const rate = getItemVatRate(item);
      const price = item.quoted_price || 0;
      const breakdown = calculateVatBreakdown(price, rate);
      partnerExclVat += breakdown.exclVat;
      partnerVatAmount += breakdown.vatAmount;
      if (!partnerVatLines[rate]) partnerVatLines[rate] = { exclVat: 0, vatAmount: 0 };
      partnerVatLines[rate].exclVat += breakdown.exclVat;
      partnerVatLines[rate].vatAmount += breakdown.vatAmount;
    });

    const totalExclVat = bureauExclVat + partnerExclVat + accommodationVat.exclVat;
    const totalVatAmount = bureauVatAmount + partnerVatAmount + accommodationVat.vatAmount;

    // Merged VAT lines for grand total display
    const allVatLines: Record<number, number> = {};
    Object.entries(bureauVatLines).forEach(([r, v]) => { allVatLines[Number(r)] = (allVatLines[Number(r)] || 0) + v.vatAmount; });
    Object.entries(partnerVatLines).forEach(([r, v]) => { allVatLines[Number(r)] = (allVatLines[Number(r)] || 0) + v.vatAmount; });
    if (accommodationVat.vatAmount > 0) {
      allVatLines[accommodationVatRate] = (allVatLines[accommodationVatRate] || 0) + accommodationVat.vatAmount;
    }

    return {
      confirmedTotal,
      bureauTotal,
      partnerTotal,
      coordinationFee: coordinationFeeAmount,
      centralSurcharge,
      grandTotal: bureauTotal + coordinationFeeAmount + centralSurcharge,
      bureauExclVat,
      bureauVatAmount,
      bureauVatLines,
      partnerExclVat,
      partnerVatAmount,
      partnerVatLines,
      standardVatRate,
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
      allVatLines,
      grandTotalInclVat: confirmedTotal + coordinationFeeAmount + centralSurcharge + accommodationTotal,
      confirmedCount: confirmedItems.length,
      pendingCount: pendingItems.length,
      hasConfirmedPrices: confirmedItems.length > 0 || !!selectedAccommodationQuote,
      hasBureauItems: confirmedBureauItems.length > 0,
      hasPartnerItems: confirmedPartnerItems.length > 0,
    };
  }, [items, numberOfPeople, selectedAccommodationQuote, getCoordinationFee, getVatRate, vatRateMap, appSettings.bureau_central_surcharge_pp, isBureauCentral]);

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
              <span className="text-primary">€{formatPrice(
                isBureauCentral 
                  ? summary.bureauTotal + summary.coordinationFee + summary.centralSurcharge + summary.partnerTotal
                  : summary.bureauTotal + summary.coordinationFee + summary.centralSurcharge
              )}</span>
            </div>
          )}
          
          {/* Partner activiteiten - muted - only in partner_direct */}
          {!isBureauCentral && summary.hasPartnerItems && (
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
          
          {numberOfPeople > 0 && summary.hasConfirmedPrices && (
            <p className="text-xs text-muted-foreground">
              ca. €{formatPrice(summary.grandTotalInclVat / numberOfPeople)} p.p.
            </p>
          )}
          
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

          {/* Bureau Vlieland section - in bureau_central include partner costs */}
          {(summary.hasBureauItems || true) && (
            <div className="bg-primary/5 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4 text-primary" />
                <span>Factuur Bureau Vlieland</span>
              </div>
              
              {summary.hasBureauItems && (
                <div className="flex items-center justify-between text-sm pl-6">
                  <span className="text-muted-foreground">{isBureauCentral ? "Bureau activiteiten" : "Activiteiten"}</span>
                  <span>€{formatPrice(summary.bureauTotal)}</span>
                </div>
              )}

              {/* In bureau_central, partner costs go under Bureau Vlieland */}
              {isBureauCentral && summary.hasPartnerItems && (
                <div className="flex items-center justify-between text-sm pl-6">
                  <span className="text-muted-foreground">Activiteiten aanbieders</span>
                  <span>€{formatPrice(summary.partnerTotal)}</span>
                </div>
              )}
              
                <div className="flex items-center justify-between text-sm pl-6">
                  <span className="text-muted-foreground">Coördinatie & handling fee</span>
                  <span>€{formatPrice(summary.coordinationFee)}</span>
                </div>

                {summary.centralSurcharge > 0 && (
                  <div className="flex items-center justify-between text-sm pl-6">
                    <span className="text-muted-foreground">Opslag centrale facturatie</span>
                    <span>€{formatPrice(summary.centralSurcharge)}</span>
                  </div>
                )}

              {/* VAT breakdown for Bureau - in bureau_central include partner VAT */}
              <div className="border-t border-primary/10 pt-2 mt-2 space-y-1 pl-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotaal excl. BTW</span>
                  <span>€{formatPrice(summary.bureauExclVat + (isBureauCentral ? summary.partnerExclVat : 0))}</span>
                </div>
                {(() => {
                  const combined: Record<number, number> = {};
                  Object.entries(summary.bureauVatLines).forEach(([r, v]) => { combined[Number(r)] = (combined[Number(r)] || 0) + v.vatAmount; });
                  if (isBureauCentral) {
                    Object.entries(summary.partnerVatLines).forEach(([r, v]) => { combined[Number(r)] = (combined[Number(r)] || 0) + v.vatAmount; });
                  }
                  return Object.entries(combined).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, amount]) => (
                    <div key={rate} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>BTW ({rate}%)</span>
                      <span>€{formatPrice(amount)}</span>
                    </div>
                  ));
                })()}
              </div>
              
                <div className="flex items-center justify-between font-medium pt-2 border-t border-primary/10 pl-6">
                  <span>Subtotaal incl. BTW</span>
                  <span className="text-primary">€{formatPrice(
                    summary.bureauTotal + summary.coordinationFee + summary.centralSurcharge + (isBureauCentral ? summary.partnerTotal : 0)
                  )}</span>
                </div>
            </div>
          )}

          {/* Partner invoices section - only in partner_direct mode */}
          {!isBureauCentral && summary.hasPartnerItems && (
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
                {Object.entries(summary.partnerVatLines).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, v]) => (
                  <div key={rate} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>BTW ({rate}%)</span>
                    <span>€{formatPrice(v.vatAmount)}</span>
                  </div>
                ))}
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
            {numberOfPeople > 0 && summary.hasConfirmedPrices && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Gemiddeld per persoon</span>
                <span>€{formatPrice(summary.grandTotalInclVat / numberOfPeople)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Note about pending items */}
        {summary.pendingCount > 0 && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Het definitieve totaalbedrag wordt bekend zodra alle activiteiten zijn bevestigd. 
              U ontvangt bericht wanneer een aanbieder bevestigt.
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
                  ? "U hebt de voorwaarden geaccepteerd. De facturen worden binnenkort verstuurd."
                  : "Facturatie vindt pas plaats nadat u akkoord gaat met de algemene voorwaarden. Op dat moment worden de reserveringen definitief en is kosteloos annuleren niet meer mogelijk."}
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
            💡 De coördinatiefee dekt de organisatie en afstemming van uw programma door Bureau Vlieland.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
