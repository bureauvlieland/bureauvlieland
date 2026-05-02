import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, Clock, FileText, AlertCircle, BedDouble } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";
import { useAppSettings } from "@/hooks/useAppSettings";
import { calculateExclVat, calculateVatAmount } from "@/lib/appSettings";
import { supabase } from "@/integrations/supabase/client";
import { useItemBillingLinesBatch } from "@/hooks/useItemBillingLines";
import { useQuoteExtras } from "@/hooks/useQuoteExtras";
import { calculateExtraTotal } from "@/types/accommodationExtras";
import { getDisplayUnitPrice, getDisplayLineTotal, getEffectivePeople, isPerPersonItem, isPerDayItem, hasOpenAdminPriceChange } from "@/lib/portalPricing";

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

  // Fetch definitive billing lines per item (admin-defined split-VAT lines + extras like koffie/thee)
  const itemIds = useMemo(() => items.map(i => i.id), [items]);
  const { linesByItem } = useItemBillingLinesBatch(itemIds);

  // Fetch lodging extras (breakfast, lunch, diner, etc.) for selected accommodation
  const { data: accommodationExtras = [] } = useQuoteExtras(selectedAccommodationQuote?.id);

  // Fetch VAT rates per building block (fallback when no billing lines)
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

    // Build order lines with unified pricing
    const orderLines = relevantItems.map(item => {
      const itemLines = linesByItem[item.id];
      const hasBillingLines = Array.isArray(itemLines) && itemLines.length > 0;

      // If admin has defined definitive billing lines (split-VAT, extras), use their sum.
      if (hasBillingLines) {
        const linesTotal = itemLines.reduce((s, l) => s + Number(l.amount_incl_vat || 0), 0);
        return {
          item,
          hasQuotedPrice: true,
          isPreliminary: false,
          isDefinitive: true,
          effectivePrice: linesTotal,
          unitPrice: null as number | null,
          isPerPerson: false,
          peopleCount: 1,
          isPerDay: false,
          dayCount: 1,
          billingLines: itemLines,
        };
      }

      const hasOpenChange = hasOpenAdminPriceChange(item);
      const hasQuotedPrice = item.quoted_price != null && !hasOpenChange;
      const isPreliminary = !hasQuotedPrice && item.admin_price_override != null;

      const effectivePeople = getEffectivePeople(item, numberOfPeople);
      const ppMultiplier = isPerPersonItem(item) ? effectivePeople : 1;
      const dayMultiplier = isPerDayItem(item) ? numberOfDays : 1;

      const effectivePrice = getDisplayLineTotal(item, numberOfPeople, numberOfDays);
      const unitPrice = getDisplayUnitPrice(item, numberOfPeople);

      const isPerDay = isPerDayItem(item);
      return {
        item,
        hasQuotedPrice,
        isPreliminary,
        isDefinitive: false,
        effectivePrice,
        unitPrice,
        isPerPerson: ppMultiplier > 1,
        peopleCount: ppMultiplier,
        isPerDay,
        dayCount: dayMultiplier,
        billingLines: undefined as typeof itemLines | undefined,
      };
    });

    const pricedLines = orderLines.filter(l => l.effectivePrice !== null);
    const pendingLines = orderLines.filter(l => l.effectivePrice === null);

    // Coordination fee
    const coordinationFee = getCoordinationFee(numberOfPeople);
    const centralSurcharge = isBureauCentral ? appSettings.bureau_central_surcharge_pp * numberOfPeople : 0;
    const standardVatRate = getVatRate("standard");

    // Tourist tax & nature contribution (0% VAT — levies)
    const touristTax = appSettings.tourist_tax_pp_per_day * numberOfPeople * numberOfDays;
    const natureContribution = appSettings.nature_contribution_pp * numberOfPeople;

    // Accommodation
    const accommodationTotal = selectedAccommodationQuote?.price_total || 0;
    // Keep accommodation VAT aligned with admin FinancialOverviewCard and lodging invoicing flow.
    const accommodationVatRate = 9;

    // Accommodation extras (breakfast, lunch, diner, etc.)
    const extrasWithTotals = accommodationExtras.map((extra) => {
      const total = calculateExtraTotal(extra);
      return { extra, total };
    });
    const accommodationExtrasTotal = extrasWithTotals.reduce((s, e) => s + e.total, 0);

    // VAT breakdown — includes ALL priced items (confirmed + preliminary)
    const allVatLines: Record<number, { exclVat: number; vatAmount: number }> = {};
    const addVat = (amount: number, rate: number) => {
      const bd = calcVatBreakdown(amount, rate);
      if (!allVatLines[rate]) allVatLines[rate] = { exclVat: 0, vatAmount: 0 };
      allVatLines[rate].exclVat += bd.exclVat;
      allVatLines[rate].vatAmount += bd.vatAmount;
    };
    const addZeroVat = (amount: number) => {
      if (!allVatLines[0]) allVatLines[0] = { exclVat: 0, vatAmount: 0 };
      allVatLines[0].exclVat += amount;
    };

    // Add all priced items to VAT breakdown — billing lines are split per VAT rate
    orderLines.forEach(l => {
      if (l.effectivePrice === null || l.effectivePrice === undefined) return;
      if (l.billingLines && l.billingLines.length > 0) {
        l.billingLines.forEach(bl => {
          const rate = Number(bl.vat_rate ?? 21);
          if (!allVatLines[rate]) allVatLines[rate] = { exclVat: 0, vatAmount: 0 };
          allVatLines[rate].exclVat += Number(bl.amount_excl_vat || 0);
          allVatLines[rate].vatAmount += Number(bl.vat_amount || 0);
        });
      } else {
        addVat(l.effectivePrice, getItemVatRate(l.item));
      }
    });
    addVat(coordinationFee + centralSurcharge, standardVatRate);
    if (accommodationTotal > 0) addVat(accommodationTotal, accommodationVatRate);
    // Each extra has its own VAT rate (often 9% for F&B, 21% for services)
    extrasWithTotals.forEach(({ extra, total }) => {
      if (total > 0) addVat(total, Number(extra.vat_rate ?? 9));
    });
    addZeroVat(touristTax + natureContribution);

    const totalExclVat = Object.values(allVatLines).reduce((s, v) => s + v.exclVat, 0);
    const totalVatAmount = Object.values(allVatLines).reduce((s, v) => s + v.vatAmount, 0);
    const itemsTotal = pricedLines.reduce((s, l) => s + (l.effectivePrice || 0), 0);
    const grandTotalInclVat = itemsTotal + coordinationFee + centralSurcharge + accommodationTotal + accommodationExtrasTotal + touristTax + natureContribution;
    const hasPreliminaryItems = orderLines.some(l => l.isPreliminary);

    return {
      orderLines,
      selfArrangedItems,
      pendingCount: pendingLines.length,
      hasPreliminaryItems,
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
      extrasWithTotals,
      accommodationExtrasTotal,
      allVatLines,
      totalExclVat,
      totalVatAmount,
      grandTotalInclVat,
      hasPrices: pricedLines.length > 0 || !!selectedAccommodationQuote,
    };
  }, [items, numberOfPeople, numberOfDays, selectedAccommodationQuote, accommodationExtras, getCoordinationFee, getVatRate, vatRateMap, linesByItem, appSettings.bureau_central_surcharge_pp, appSettings.tourist_tax_pp_per_day, appSettings.nature_contribution_pp, isBureauCentral]);

  // Don't show if there are no prices yet and no items at all
  if (!summary.hasPrices && summary.orderLines.length === 0 && !summary.hasAccommodation) {
    return null;
  }

  // Compact variant for sidebar
  if (variant === "compact") {
    const pricedActivityLines = summary.orderLines.filter(l => l.effectivePrice !== null);
    const activitiesTotal = pricedActivityLines.reduce((s, l) => s + (l.effectivePrice || 0), 0);

    return (
      <div className={cn("bg-muted/50 rounded-lg p-3", className)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Kostenspecificatie</span>
        </div>
        <div className="space-y-1.5 text-sm">
          {summary.hasAccommodation && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Logies
                {summary.accommodationExtrasTotal > 0 && (
                  <span className="text-xs ml-1 opacity-70">(incl. extra's)</span>
                )}
              </span>
              <span>€{formatPrice(summary.accommodationTotal + summary.accommodationExtrasTotal)}</span>
            </div>
          )}
          {pricedActivityLines.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Activiteiten ({pricedActivityLines.length})</span>
              <span>€{formatPrice(activitiesTotal)}</span>
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
          {numberOfPeople > 0 && summary.hasPrices && (
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
              {summary.extrasWithTotals.length > 0 && (
                <div className="ml-6 mt-2 space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Logies-extra's</p>
                  {summary.extrasWithTotals.map(({ extra, total }) => (
                    <div key={extra.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">
                        {extra.name}
                        {extra.pricing_type === "fixed"
                          ? <span className="ml-1 opacity-70">(vaste prijs)</span>
                          : extra.quantity > 1 && <span className="ml-1 opacity-70">({extra.quantity}× per persoon)</span>}
                        <span className="ml-1 opacity-70">— BTW {Number(extra.vat_rate ?? 9)}%</span>
                      </span>
                      <span className="whitespace-nowrap ml-2">€{formatPrice(total)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs font-medium pt-1">
                    <span>Subtotaal logies-extra's</span>
                    <span>€{formatPrice(summary.accommodationExtrasTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity / program item lines */}
          {summary.orderLines.map(({ item, isPreliminary, isDefinitive, effectivePrice, unitPrice, isPerPerson, peopleCount, isPerDay, dayCount, billingLines }) => {
            const showPrice = effectivePrice !== null;
            return (
              <div key={item.id} className="py-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm">
                    {item.block_name}
                    {item.override_people != null && item.override_people !== numberOfPeople && (
                      <span className="text-muted-foreground text-xs ml-1">({item.override_people} deelnemers)</span>
                    )}
                    {isPreliminary && <span className="text-muted-foreground text-xs ml-1">(voorlopig)</span>}
                  </span>
                  <span className="text-sm whitespace-nowrap shrink-0 text-right">
                    {showPrice ? (
                      isDefinitive ? (
                        <span>€{formatPrice(effectivePrice!)}</span>
                      ) : isPerPerson && unitPrice !== null ? (
                        <span className={isPreliminary ? "text-muted-foreground" : ""}>
                          €{formatPrice(unitPrice)} p.p. × {peopleCount}{isPerDay && dayCount > 1 ? ` × ${dayCount} dgn` : ""} = €{formatPrice(effectivePrice!)}
                        </span>
                      ) : (
                        <span className={isPreliminary ? "text-muted-foreground" : ""}>
                          €{formatPrice(effectivePrice!)}
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </div>
                {isDefinitive && billingLines && billingLines.length > 0 && (
                  <div className="ml-3 mt-1 space-y-0.5">
                    {billingLines.map(bl => (
                      <div key={bl.id} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate">
                          {bl.description}
                          {bl.quantity !== 1 && ` (${bl.quantity}×)`}
                          <span className="ml-1 opacity-70">— BTW {Number(bl.vat_rate)}%</span>
                        </span>
                        <span className="whitespace-nowrap ml-2">€{formatPrice(Number(bl.amount_incl_vat))}</span>
                      </div>
                    ))}
                  </div>
                )}
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

        {/* VAT breakdown + single total */}
        {summary.hasPrices && (
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
              <span className="font-medium">Totaal incl. BTW</span>
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
        {(summary.pendingCount > 0 || summary.hasPreliminaryItems) && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mt-3">
            <Clock className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              {summary.pendingCount > 0
                ? `${summary.pendingCount} onderde${summary.pendingCount > 1 ? "len" : "el"} nog te bevestigen — `
                : ""}
              {summary.hasPreliminaryItems
                ? "Onderdelen gemarkeerd als (voorlopig) zijn nog niet definitief. "
                : ""}
              Het definitieve totaal wordt bekend zodra alle prijzen zijn bevestigd.
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
