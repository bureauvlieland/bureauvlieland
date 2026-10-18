import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, Clock, FileText, AlertCircle, BedDouble } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";
import { useAppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/integrations/supabase/client";
import { useItemBillingLinesBatch } from "@/hooks/useItemBillingLines";
import { useQuoteExtras } from "@/hooks/useQuoteExtras";
import { calculateExtraTotal } from "@/types/accommodationExtras";
import { isFeeExcluded } from "@/lib/excludedFees";
import { getDisplayUnitPrice, getEffectivePeople, isPerPersonItem, isPerDayItem } from "@/lib/portalPricing";
import { buildProjectInvoiceSpec, type SpecItemInput } from "@/lib/projectInvoiceSpec";
import type { FeeStructureSet } from "@/types/pricing";

interface PriceSummaryCardProps {
  items: ProgramRequestItem[];
  numberOfPeople: number;
  numberOfDays?: number;
  className?: string;
  variant?: "default" | "compact";
  termsAccepted?: boolean;
  selectedAccommodationQuote?: AccommodationQuote | null;
  invoicingMode?: string;
  // Pre-resolved data from get-customer-program edge function (preferred path).
  // When provided, falls back from anon DB hooks (needed once anon SELECT is removed).
  billingLinesByItem?: Record<string, any[]>;
  blockVatRates?: Record<string, number>;
  accommodationExtrasOverride?: any[];
  /** Per-project uitgesloten automatische kostenposten (program_requests.excluded_fees). */
  excludedFees?: string[] | null;
  /** Feestructuur van dit project (snapshot). Aanwezig → organisatiefee 2.0. */
  feeStructure?: FeeStructureSet | null;
  /** Datum van de aanvraag — bepaalt of de spoedtoeslag gold. */
  requestDate?: string | null;
  /** Eerste programmadag. */
  arrivalDate?: string | null;
  /** Gefactureerde wijzigingsrondes na klantakkoord. */
  revisionFeesTotal?: number;
}

export const PriceSummaryCard = ({
  items,
  numberOfPeople,
  numberOfDays = 1,
  className,
  variant = "default",
  termsAccepted = false,
  selectedAccommodationQuote,
  invoicingMode,
  billingLinesByItem: billingLinesByItemProp,
  blockVatRates: blockVatRatesProp,
  accommodationExtrasOverride,
  excludedFees,
  feeStructure,
  requestDate,
  arrivalDate,
  revisionFeesTotal = 0,
}: PriceSummaryCardProps) => {
  const isBureauCentral = invoicingMode === "bureau_central";
  const { settings: appSettings } = useAppSettings();

  // Prefer server-resolved data; only call the hook when not provided (admin/back-office contexts).
  const itemIds = useMemo(() => items.map(i => i.id), [items]);
  const { linesByItem: linesByItemFromHook } = useItemBillingLinesBatch(
    billingLinesByItemProp ? [] : itemIds,
  );
  const linesByItem = billingLinesByItemProp ?? linesByItemFromHook;

  // Fetch lodging extras for selected accommodation - prefer override prop
  const { data: extrasFromHook = [] } = useQuoteExtras(
    accommodationExtrasOverride ? undefined : selectedAccommodationQuote?.id,
  );
  const accommodationExtras = accommodationExtrasOverride ?? extrasFromHook;


  // Fetch VAT rates per building block (fallback when prop not provided)
  const [vatRateMap, setVatRateMap] = useState<Record<string, number>>({});
  useEffect(() => {
    if (blockVatRatesProp) return;
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
  }, [items, blockVatRatesProp]);

  const effectiveVatRates = blockVatRatesProp ?? vatRateMap;


  const formatPrice = (amount: number) =>
    amount.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Dezelfde berekening als het beheer (projectInvoiceSpec); hier alleen
  // vertaald naar de regels van deze kaart. Logies-extra's blijven los.
  const summary = useMemo(() => {
    const spec = buildProjectInvoiceSpec({
      request: {
        number_of_people: numberOfPeople,
        selected_dates: arrivalDate ? [arrivalDate] : null,
        invoicing_mode: invoicingMode,
        excluded_fees: excludedFees,
        created_at: requestDate,
      },
      numberOfDays,
      items: items as unknown as SpecItemInput[],
      linesByItem,
      blockVatRates: effectiveVatRates,
      accommodation: selectedAccommodationQuote
        ? {
            id: selectedAccommodationQuote.id,
            accommodation_name: selectedAccommodationQuote.accommodation_name,
            partner_name: selectedAccommodationQuote.partner?.name ?? null,
            price_total: Number(selectedAccommodationQuote.price_total) || 0,
            vat_rate: selectedAccommodationQuote.vat_rate,
            extras: accommodationExtras,
          }
        : null,
      settings: appSettings,
      feeStructure,
      revisionFeesTotal,
      bundleExtras: false,
    });

    const lineByItem = new Map(spec.lines.filter((l) => l.itemId).map((l) => [l.itemId!, l]));
    const relevantItems = items.filter(
      (item) => item.block_type !== "self_arranged" && item.status !== "cancelled"
    );
    const selfArrangedItems = items.filter(
      (item) => item.block_type === "self_arranged" && item.status !== "cancelled"
    );

    const orderLines = relevantItems.map((item) => {
      const line = lineByItem.get(item.id);
      const itemLines = linesByItem[item.id];
      if (line && line.subLines && line.subLines.length > 0) {
        return {
          item,
          hasQuotedPrice: true,
          isPreliminary: false,
          isDefinitive: true,
          effectivePrice: line.amountInclVat as number | null,
          unitPrice: null as number | null,
          isPerPerson: false,
          peopleCount: 1,
          isPerDay: false,
          dayCount: 1,
          billingLines: itemLines as typeof itemLines | undefined,
        };
      }
      const effectivePeople = getEffectivePeople(item, numberOfPeople);
      const ppMultiplier = isPerPersonItem(item) ? effectivePeople : 1;
      const isPerDay = isPerDayItem(item);
      return {
        item,
        hasQuotedPrice: item.quoted_price != null,
        isPreliminary: Boolean(line?.isPreliminary),
        isDefinitive: false,
        effectivePrice: line ? (line.amountInclVat as number | null) : null,
        unitPrice: line ? getDisplayUnitPrice(item, numberOfPeople) : null,
        isPerPerson: ppMultiplier > 1,
        peopleCount: ppMultiplier,
        isPerDay,
        dayCount: isPerDay ? numberOfDays : 1,
        billingLines: undefined as typeof itemLines | undefined,
      };
    });

    const accommodationBilledDirectly = spec.accommodationBilledDirectly;
    const billableAccommodationExtras = accommodationBilledDirectly ? [] : accommodationExtras;
    const extrasWithTotals = billableAccommodationExtras.map((extra) => ({ extra, total: calculateExtraTotal(extra) }));
    const lodgingLine = spec.lines.find((l) => l.kind === "lodging");

    const allVatLines: Record<number, { exclVat: number; vatAmount: number }> = {};
    for (const g of spec.vatGroups) allVatLines[g.rate] = { exclVat: g.exclVat, vatAmount: g.vatAmount };

    return {
      orderLines,
      selfArrangedItems,
      pendingCount: spec.unpricedItems.length,
      hasPreliminaryItems: orderLines.some((l) => l.isPreliminary),
      coordinationFee: spec.totals.coordinationFee,
      centralSurcharge: spec.totals.centralSurcharge,
      revisionFees: spec.totals.revisionFees,
      touristTax: spec.totals.touristTax,
      natureContribution: spec.totals.natureContribution,
      showTouristTax: !isFeeExcluded(excludedFees, "tourist_tax"),
      showNatureContribution: !isFeeExcluded(excludedFees, "nature_contribution"),
      showCoordinationFee: !isFeeExcluded(excludedFees, "coordination_fee"),
      accommodationTotal: spec.totals.lodging,
      accommodationVatRate: lodgingLine?.vatRate ?? Number(appSettings.accommodation_vat_rate ?? 9),
      accommodationName: selectedAccommodationQuote?.accommodation_name || "",
      accommodationPartnerName: selectedAccommodationQuote?.partner?.name || "",
      hasAccommodation: !!selectedAccommodationQuote,
      accommodationBilledDirectly,
      extrasWithTotals,
      accommodationExtrasTotal: spec.totals.lodgingExtras,
      allVatLines,
      totalExclVat: spec.totals.exclVat,
      totalVatAmount: spec.totals.vat,
      grandTotalInclVat: spec.totals.inclVat,
      hasPrices: orderLines.some((l) => l.effectivePrice !== null) || !!selectedAccommodationQuote,
    };
  }, [items, numberOfPeople, numberOfDays, selectedAccommodationQuote, accommodationExtras, effectiveVatRates, linesByItem, appSettings, invoicingMode, excludedFees, feeStructure, requestDate, arrivalDate, revisionFeesTotal]);

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
              {summary.accommodationBilledDirectly ? (
                <span className="text-xs text-muted-foreground">rechtstreeks via de accommodatie</span>
              ) : (
                <span>€{formatPrice(summary.accommodationTotal + summary.accommodationExtrasTotal)}</span>
              )}
            </div>
          )}
          {pricedActivityLines.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Activiteiten ({pricedActivityLines.length})</span>
              <span>€{formatPrice(activitiesTotal)}</span>
            </div>
          )}
          {summary.showTouristTax && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Toeristenbelasting</span>
              <span>€{formatPrice(summary.touristTax)}</span>
            </div>
          )}
          {summary.showNatureContribution && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Natuurbijdrage</span>
              <span>€{formatPrice(summary.natureContribution)}</span>
            </div>
          )}
          {summary.showCoordinationFee && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Coördinatiefee</span>
              <span>€{formatPrice(summary.coordinationFee)}</span>
            </div>
          )}
          {summary.revisionFees > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Programmawijzigingen</span>
              <span>€{formatPrice(summary.revisionFees)}</span>
            </div>
          )}
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
          <div className="flex items-center justify-between py-2 font-medium text-muted-foreground uppercase text-eyebrow">
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
                {summary.accommodationBilledDirectly ? (
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">rechtstreeks via de accommodatie</span>
                ) : (
                  <span className="text-sm font-medium whitespace-nowrap ml-4">
                    €{formatPrice(summary.accommodationTotal)}
                  </span>
                )}
              </div>
              {summary.accommodationPartnerName && (
                <p className="text-xs text-muted-foreground ml-6 mt-0.5">
                  {summary.accommodationPartnerName}
                </p>
              )}
              {summary.accommodationBilledDirectly && (
                <p className="text-xs text-muted-foreground ml-6 mt-0.5">
                  De accommodatie factureert het logies rechtstreeks aan u; het staat niet op de factuur van Bureau Vlieland.
                </p>
              )}
              {summary.extrasWithTotals.length > 0 && (
                <div className="ml-6 mt-2 space-y-0.5">
                  <p className="font-medium text-muted-foreground uppercase text-eyebrow mb-1">Logies-extra's</p>
                  {summary.extrasWithTotals.map(({ extra, total }) => (
                    <div key={extra.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">
                        {extra.name}
                        {extra.pricing_type === "fixed"
                          ? <span className="ml-1 opacity-70">(vaste prijs)</span>
                          : extra.quantity > 1 && <span className="ml-1 opacity-70">({extra.quantity}× per persoon)</span>}
                        <span className="ml-1 opacity-70">· BTW {Number(extra.vat_rate ?? 9)}%</span>
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
                      <span className="text-muted-foreground">nog geen prijs</span>
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
                          <span className="ml-1 opacity-70">· BTW {Number(bl.vat_rate)}%</span>
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
          {summary.showTouristTax && (
            <div className="py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Toeristenbelasting ({numberOfPeople} pers. × {numberOfDays} dgn)</span>
                <span className="text-sm whitespace-nowrap">€{formatPrice(summary.touristTax)}</span>
              </div>
            </div>
          )}

          {/* Nature contribution line */}
          {summary.showNatureContribution && (
            <div className="py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Natuurbijdrage ({numberOfPeople} pers.)</span>
                <span className="text-sm whitespace-nowrap">€{formatPrice(summary.natureContribution)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Bijdrage natuurbeheer Staatsbosbeheer</p>
            </div>
          )}

          {/* Coordination fee line */}
          {summary.showCoordinationFee && (
            <div className="py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Coördinatiefee</span>
                <span className="text-sm whitespace-nowrap">€{formatPrice(summary.coordinationFee)}</span>
              </div>
            </div>
          )}

          {/* Central surcharge line */}
          {summary.centralSurcharge > 0 && (
            <div className="py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Opslag centrale facturatie</span>
                <span className="text-sm whitespace-nowrap">€{formatPrice(summary.centralSurcharge)}</span>
              </div>
            </div>
          )}

          {/* Revision fees line (wijzigingsrondes na akkoord) */}
          {summary.revisionFees > 0 && (
            <div className="py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Programmawijzigingen</span>
                <span className="text-sm whitespace-nowrap">€{formatPrice(summary.revisionFees)}</span>
              </div>
            </div>
          )}

          {/* Self-arranged items */}
          {summary.selfArrangedItems.length > 0 && (
            <div className="py-2.5">
              <p className="font-medium text-muted-foreground uppercase text-eyebrow mb-1">Zelf te regelen</p>
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
                ? `${summary.pendingCount} onderde${summary.pendingCount > 1 ? "len" : "el"} nog te bevestigen. `
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
          <div className="flex items-start gap-2 text-xs bg-info-soft text-info-ink rounded-lg p-3">
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
            <div className="flex items-start gap-2 text-xs bg-warning-soft text-warning-ink rounded-lg p-3">
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
