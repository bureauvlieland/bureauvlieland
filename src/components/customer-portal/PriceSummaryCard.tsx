import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, Clock, HelpCircle, FileText, AlertCircle, BedDouble } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";
import { useAppSettings } from "@/hooks/useAppSettings";
import { calculateExclVat, calculateVatAmount } from "@/lib/appSettings";
import { supabase } from "@/integrations/supabase/client";

interface PriceSummaryCardProps {
  items: ProgramRequestItem[];
  numberOfPeople: number;
  numberOfDays?: number;
  className?: string;
  variant?: "default" | "compact";
  termsAccepted?: boolean;
  selectedAccommodationQuote?: AccommodationQuote | null;
  invoicingMode?: string;
}

const calcVatBreakdown = (amountInclVat: number, vatRate: number = 21) => ({
  exclVat: calculateExclVat(amountInclVat, vatRate),
  vatAmount: calculateVatAmount(amountInclVat, vatRate),
});

export const PriceSummaryCard = ({
  items,
  numberOfPeople,
  numberOfDays = 1,
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

  const formatPrice = (amount: number) =>
    amount.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const summary = useMemo(() => {
    const relevantItems = items.filter(
      (item) => item.block_type !== "self_arranged" && item.status !== "cancelled"
    );

    const selfArrangedItems = items.filter(
      (item) => item.block_type === "self_arranged" && item.status !== "cancelled"
    );

    // All order lines: bureau + partner items (non-cancelled, non-self_arranged)
    const orderLines = relevantItems.map(item => {
      const hasPrice = item.status === "confirmed" && item.quoted_price !== null;
      const rawPrice = hasPrice ? (item.quoted_price || 0) : null;
      const isPreliminary = !item.quoted_price && item.admin_price_override;
      const rawPreliminaryPrice = isPreliminary ? item.admin_price_override : null;
      const multiplier = item.price_type === "per_person" ? numberOfPeople : 1;
      const price = rawPrice !== null ? rawPrice * multiplier : null;
      const preliminaryPrice = rawPreliminaryPrice ? rawPreliminaryPrice * multiplier : null;
      return { item, hasPrice, price, rawPrice, isPreliminary: !!isPreliminary, preliminaryPrice, rawPreliminaryPrice };
    });

    const confirmedLines = orderLines.filter(l => l.hasPrice);
    const pendingLines = orderLines.filter(l => !l.hasPrice);

    // Coordination fee
    const coordinationFee = getCoordinationFee(numberOfPeople);
    const centralSurcharge = isBureauCentral ? appSettings.bureau_central_surcharge_pp * numberOfPeople : 0;
    const standardVatRate = getVatRate("standard");

    // Tourist tax & nature contribution (0% VAT — levies, not services)
    const touristTax = appSettings.tourist_tax_pp_per_day * numberOfPeople * numberOfDays;
    const natureContribution = appSettings.nature_contribution_pp * numberOfPeople;

    // Accommodation
    const accommodationTotal = selectedAccommodationQuote?.price_total || 0;
    const accommodationVatRate = selectedAccommodationQuote?.vat_rate || 9;
    const accommodationVat = calcVatBreakdown(accommodationTotal, accommodationVatRate);

    // VAT calculation across all confirmed items
    const allVatLines: Record<number, { exclVat: number; vatAmount: number }> = {};
    const addVat = (amount: number, rate: number) => {
      const bd = calcVatBreakdown(amount, rate);
      if (!allVatLines[rate]) allVatLines[rate] = { exclVat: 0, vatAmount: 0 };
      allVatLines[rate].exclVat += bd.exclVat;
      allVatLines[rate].vatAmount += bd.vatAmount;
    };

    // 0% VAT items (levies) — add directly as excl amounts
    const addZeroVat = (amount: number) => {
      if (!allVatLines[0]) allVatLines[0] = { exclVat: 0, vatAmount: 0 };
      allVatLines[0].exclVat += amount;
    };

    // Add confirmed items to VAT breakdown
    confirmedLines.forEach(l => addVat(l.price!, getItemVatRate(l.item)));
    // Add preliminary items to a separate indicative VAT breakdown
    const preliminaryLines = orderLines.filter(l => l.isPreliminary && l.preliminaryPrice);
    
    addVat(coordinationFee + centralSurcharge, standardVatRate);
    if (accommodationTotal > 0) addVat(accommodationTotal, accommodationVatRate);
    addZeroVat(touristTax + natureContribution);

    const totalExclVat = Object.values(allVatLines).reduce((s, v) => s + v.exclVat, 0);
    const totalVatAmount = Object.values(allVatLines).reduce((s, v) => s + v.vatAmount, 0);
    const confirmedItemsTotal = confirmedLines.reduce((s, l) => s + (l.price || 0), 0);
    const preliminaryItemsTotal = preliminaryLines.reduce((s, l) => s + (l.preliminaryPrice || 0), 0);
    const grandTotalInclVat = confirmedItemsTotal + coordinationFee + centralSurcharge + accommodationTotal + touristTax + natureContribution;
    const indicativeTotalInclVat = grandTotalInclVat + preliminaryItemsTotal;

    return {
      orderLines,
      selfArrangedItems,
      confirmedCount: confirmedLines.length,
      pendingCount: pendingLines.length,
      preliminaryCount: preliminaryLines.length,
      coordinationFee,
      centralSurcharge,
      standardVatRate,
      touristTax,
      natureContribution,
      accommodationTotal,
      accommodationVatRate,
      accommodationName: selectedAccommodationQuote?.accommodation_name || "",
      accommodationPartnerName: selectedAccommodationQuote?.partner?.name || "",
      hasAccommodation: !!selectedAccommodationQuote,
      allVatLines,
      totalExclVat,
      totalVatAmount,
      grandTotalInclVat,
      indicativeTotalInclVat,
      preliminaryItemsTotal,
      hasConfirmedPrices: confirmedLines.length > 0 || !!selectedAccommodationQuote,
    };
  }, [items, numberOfPeople, numberOfDays, selectedAccommodationQuote, getCoordinationFee, getVatRate, vatRateMap, appSettings.bureau_central_surcharge_pp, appSettings.tourist_tax_pp_per_day, appSettings.nature_contribution_pp, isBureauCentral]);

  // Don't show if there are no confirmed prices yet and no items at all
  if (!summary.hasConfirmedPrices && summary.orderLines.length === 0 && !summary.hasAccommodation) {
    return null;
  }

  // Compact variant for sidebar
  if (variant === "compact") {
    return (
      <div className={cn("bg-muted/50 rounded-lg p-3", className)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Kostenspecificatie</span>
        </div>
        <div className="space-y-1.5 text-sm">
          {summary.hasAccommodation && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Logies</span>
              <span>€{formatPrice(summary.accommodationTotal)}</span>
            </div>
          )}
          {summary.confirmedCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Activiteiten ({summary.confirmedCount})</span>
              <span>€{formatPrice(summary.orderLines.filter(l => l.hasPrice).reduce((s, l) => s + (l.price || 0), 0))}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Toeristenbelasting</span>
            <span>€{formatPrice(summary.touristTax)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Natuurbijdrage</span>
            <span>€{formatPrice(summary.natureContribution)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Coördinatiefee</span>
            <span>€{formatPrice(summary.coordinationFee)}</span>
          </div>
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
              +{summary.pendingCount} onderde{summary.pendingCount > 1 ? "len" : "el"} nog te bevestigen
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
          Kostenspecificatie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {/* Order lines table */}
        <div className="divide-y divide-border">
          {/* Table header */}
          <div className="flex items-center justify-between py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Onderdeel</span>
            <span>Bedrag</span>
          </div>

          {/* Accommodation line */}
          {summary.hasAccommodation && (
            <div className="py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">Logies: {summary.accommodationName}</span>
                </div>
                <span className="text-sm font-medium whitespace-nowrap ml-4">
                  €{formatPrice(summary.accommodationTotal)}
                </span>
              </div>
              {summary.accommodationPartnerName && (
                <p className="text-xs text-muted-foreground ml-6 mt-0.5">
                  {summary.accommodationPartnerName}
                </p>
              )}
            </div>
          )}

          {/* Activity / program item lines */}
          {summary.orderLines.map(({ item, hasPrice, price, rawPrice, isPreliminary, preliminaryPrice, rawPreliminaryPrice }) => {
            return (
              <div key={item.id} className="py-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm">{item.block_name}</span>
                  <span className="text-sm whitespace-nowrap shrink-0 text-right">
                    {hasPrice ? (
                      item.price_type === "per_person" ? (
                        <span>€{formatPrice(rawPrice!)} p.p. = €{formatPrice(price!)}</span>
                      ) : (
                        <span>€{formatPrice(price!)}</span>
                      )
                    ) : isPreliminary ? (
                      item.price_type === "per_person" ? (
                        <span className="text-muted-foreground">ca. €{formatPrice(rawPreliminaryPrice!)} p.p. = €{formatPrice(preliminaryPrice!)}</span>
                      ) : (
                        <span className="text-muted-foreground">ca. €{formatPrice(preliminaryPrice!)}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </div>
                {item.admin_price_notes && (
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{item.admin_price_notes}</p>
                )}
              </div>
            );
          })}

          {/* Tourist tax line */}
          <div className="py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Toeristenbelasting ({numberOfPeople} pers. × {numberOfDays} dgn)</span>
              <span className="text-sm whitespace-nowrap">€{formatPrice(summary.touristTax)}</span>
            </div>
          </div>

          {/* Nature contribution line */}
          <div className="py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Natuurbijdrage Staatsbosbeheer ({numberOfPeople} pers.)</span>
              <span className="text-sm whitespace-nowrap">€{formatPrice(summary.natureContribution)}</span>
            </div>
          </div>

          {/* Coordination fee line */}
          <div className="py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Coördinatie & handling fee</span>
              <span className="text-sm whitespace-nowrap">€{formatPrice(summary.coordinationFee)}</span>
            </div>
          </div>

          {/* Central surcharge line */}
          {summary.centralSurcharge > 0 && (
            <div className="py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Opslag centrale facturatie</span>
                <span className="text-sm whitespace-nowrap">€{formatPrice(summary.centralSurcharge)}</span>
              </div>
            </div>
          )}

          {/* Self-arranged items */}
          {summary.selfArrangedItems.length > 0 && (
            <div className="py-2.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Zelf te regelen</p>
              {summary.selfArrangedItems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-0.5">
                  <span className="text-sm text-muted-foreground">{item.block_name}</span>
                  <span className="text-xs text-muted-foreground italic">eigen boeking</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VAT breakdown + totals */}
        {summary.hasConfirmedPrices && (
          <div className="bg-muted/30 rounded-lg p-3 mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotaal excl. BTW</span>
              <span>€{formatPrice(summary.totalExclVat)}</span>
            </div>
            {Object.entries(summary.allVatLines)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([rate, { vatAmount }]) => (
                <div key={rate} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">BTW {rate}%</span>
                  <span>€{formatPrice(vatAmount)}</span>
                </div>
              ))}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-medium">
                {summary.pendingCount > 0 ? "Bevestigd totaal incl. BTW" : "Totaal incl. BTW"}
              </span>
              <span className="font-bold text-lg text-primary">€{formatPrice(summary.grandTotalInclVat)}</span>
            </div>
            {numberOfPeople > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Per persoon incl. BTW</span>
                <span>€{formatPrice(summary.grandTotalInclVat / numberOfPeople)}</span>
              </div>
            )}
          </div>
        )}

        {/* Pending notice */}
        {summary.pendingCount > 0 && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mt-3">
            <Clock className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              {summary.pendingCount} onderde{summary.pendingCount > 1 ? "len" : "el"} nog te bevestigen — het definitieve totaal wordt bekend zodra alle prijzen zijn bevestigd.
            </p>
          </div>
        )}

        {/* Invoicing info */}
        <div className="border-t pt-3 mt-3 space-y-2">
          <div className="flex items-start gap-2 text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 rounded-lg p-3">
            <FileText className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Facturatie door Bureau Vlieland</p>
              <p>
                {termsAccepted
                  ? "U hebt de voorwaarden geaccepteerd. De factuur wordt binnenkort verstuurd."
                  : "Facturatie vindt pas plaats nadat u akkoord gaat met de algemene voorwaarden. Op dat moment worden de reserveringen definitief."}
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
      </CardContent>
    </Card>
  );
};
