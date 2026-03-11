import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Building2, ExternalLink, BedDouble, Euro } from "lucide-react";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";
import { useAppSettings } from "@/hooks/useAppSettings";

interface InvoiceProvidersCardProps {
  items: ProgramRequestItem[];
  selectedAccommodationQuote?: AccommodationQuote | null;
  numberOfPeople: number;
  className?: string;
  invoicingMode?: string;
}

interface ProviderInfo {
  id: string;
  name: string;
  itemCount: number;
  blockType: string;
  totalAmount: number;
  itemNames: string[];
}

export const InvoiceProvidersCard = ({ items, selectedAccommodationQuote, numberOfPeople, className, invoicingMode }: InvoiceProvidersCardProps) => {
  const isBureauCentral = invoicingMode === "bureau_central";
  const { getCoordinationFee } = useAppSettings();
  const { providers, selfArrangedItems, bureauTotal, partnerProviders, coordinationFee } = useMemo(() => {
    // Group items by provider, excluding cancelled and self-arranged
    const providerMap = items
      .filter((item) => item.status !== "cancelled" && item.block_type === "partner")
      .reduce((acc, item) => {
        const key = item.provider_id;
        if (!acc[key]) {
          acc[key] = {
            id: item.provider_id,
            name: item.provider_name,
            itemCount: 0,
            blockType: item.block_type,
            totalAmount: 0,
            itemNames: [],
          };
        }
        acc[key].itemCount++;
        // Use quoted_price if available, otherwise use admin_price_override as preliminary price
        const itemPrice = item.quoted_price ?? item.admin_price_override ?? 0;
        acc[key].totalAmount += itemPrice;
        acc[key].itemNames.push(item.block_name);
        return acc;
      }, {} as Record<string, ProviderInfo>);

    const providerList = Object.values(providerMap);

    // Bureau items total (calculated directly from items)
    const bureauItemsTotal = items
      .filter((item) => item.status !== "cancelled" && item.block_type === "bureau")
      .reduce((sum, item) => sum + (item.quoted_price ?? item.admin_price_override ?? 0), 0);

    // Partner providers list
    const partnerItems = providerList;

    // Self-arranged items
    const selfArranged = items.filter(
      (item) => item.status !== "cancelled" && item.block_type === "self_arranged"
    );

    // Coordination fee based on actual group size
    const fee = getCoordinationFee(numberOfPeople);

    return {
      providers: providerList,
      selfArrangedItems: selfArranged,
      bureauTotal: bureauItemsTotal,
      partnerProviders: partnerItems,
      coordinationFee: fee,
    };
  }, [items, numberOfPeople]);

  const formatPrice = (amount: number) => {
    return amount.toLocaleString("nl-NL", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  if (providers.length === 0 && selfArrangedItems.length === 0 && !selectedAccommodationQuote) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Facturatie per onderdeel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Bureau Vlieland verzorgt de volledige facturatie voor uw programma.
        </p>

        <div className="space-y-3">
          {/* Accommodation invoice */}
          {selectedAccommodationQuote && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
                <BedDouble className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{selectedAccommodationQuote.partner?.name || "Logiesaanbieder"}</p>
                  <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                    <Euro className="h-3.5 w-3.5" />
                    <span>{formatPrice(selectedAccommodationQuote.price_total)}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedAccommodationQuote.accommodation_name}
                </p>
              </div>
            </div>
          )}

          {/* Bureau Vlieland items */}
          {(bureauTotal > 0 || true) && (
            <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">Bureau Vlieland</p>
                  <div className="flex items-center gap-1 text-primary font-semibold">
                    <Euro className="h-3.5 w-3.5" />
                    <span>{formatPrice(isBureauCentral 
                      ? bureauTotal + coordinationFee + partnerProviders.reduce((s, p) => s + p.totalAmount, 0)
                      : bureauTotal + coordinationFee
                    )}</span>
                  </div>
                </div>
                {/* Individual bureau items */}
                {(() => {
                  const bureauItems = items.filter(i => i.block_type === "bureau" && i.status !== "cancelled");
                  return bureauItems.length > 0 ? (
                    <div className="mt-1 space-y-0.5">
                      {bureauItems.map(item => {
                        const itemPrice = item.quoted_price ?? item.admin_price_override ?? 0;
                        const isPreliminary = !item.quoted_price && item.admin_price_override;
                        const priceTypeLabel = item.price_type === "per_person" ? "p.p." : item.price_type === "total" ? "totaal" : null;
                        return (
                          <div key={item.id} className="text-sm text-muted-foreground">
                            <div className="flex items-start justify-between gap-2">
                              <span>{item.block_name}</span>
                              {itemPrice > 0 && (
                                <span className="text-xs whitespace-nowrap shrink-0">
                                  {isPreliminary && "ca. "}€{formatPrice(itemPrice)}
                                  {priceTypeLabel && ` ${priceTypeLabel}`}
                                </span>
                              )}
                            </div>
                            {item.admin_price_notes && (
                              <p className="text-xs text-muted-foreground/70 break-words">{item.admin_price_notes}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null;
                })()}
                {/* Coordination fee line */}
                <div className="mt-1 text-sm text-muted-foreground flex items-center justify-between gap-2">
                  <span>Coördinatie & handling fee</span>
                  <span className="text-xs whitespace-nowrap">€{formatPrice(coordinationFee)}</span>
                </div>
                {/* In bureau_central, show partner items under Bureau */}
                {isBureauCentral && (() => {
                  const partnerItems = items.filter(i => i.block_type === "partner" && i.status !== "cancelled");
                  return partnerItems.length > 0 ? (
                    <div className="mt-1 space-y-0.5">
                      {partnerItems.map(item => {
                        const itemPrice = item.quoted_price ?? item.admin_price_override ?? 0;
                        const isPreliminary = !item.quoted_price && item.admin_price_override;
                        const priceTypeLabel = item.price_type === "per_person" ? "p.p." : item.price_type === "total" ? "totaal" : null;
                        return (
                          <div key={item.id} className="text-sm text-muted-foreground">
                            <div className="flex items-center justify-between gap-2">
                              <span>{item.block_name}</span>
                              {itemPrice > 0 && (
                                <span className="text-xs whitespace-nowrap">
                                  {isPreliminary && "ca. "}€{formatPrice(itemPrice)}
                                  {priceTypeLabel && ` ${priceTypeLabel}`}
                                </span>
                              )}
                            </div>
                            {item.admin_price_notes && (
                              <p className="text-xs text-muted-foreground/70 break-words">{item.admin_price_notes}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null;
                })()}
                <p className="text-xs text-muted-foreground mt-1">
                  Factuur door: Bureau Vlieland
                </p>
              </div>
            </div>
          )}

          {/* Partner items - only show individually in partner_direct mode */}
          {!isBureauCentral && partnerProviders.map((provider) => {
            const providerItems = items.filter(i => i.provider_id === provider.id && i.status !== "cancelled" && i.block_type === "partner");
            const hasPreliminaryPrice = providerItems.some(i => !i.quoted_price && i.admin_price_override);
            
            return (
              <div
                key={provider.id}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{provider.name}</p>
                    {provider.totalAmount > 0 && (
                      <div className="flex items-center gap-1 font-semibold">
                        {hasPreliminaryPrice && <span className="text-xs text-muted-foreground mr-1">ca.</span>}
                        <Euro className="h-3.5 w-3.5" />
                        <span>{formatPrice(provider.totalAmount)}</span>
                      </div>
                    )}
                  </div>
                  {/* Detailed item list with price type and notes */}
                  <div className="mt-1 space-y-0.5">
                    {providerItems.map((item) => {
                      const itemPrice = item.quoted_price ?? item.admin_price_override ?? 0;
                      const isPreliminary = !item.quoted_price && item.admin_price_override;
                      const priceTypeLabel = item.price_type === "per_person" ? "p.p." : item.price_type === "total" ? "totaal" : null;
                      return (
                        <div key={item.id} className="text-sm text-muted-foreground">
                          <div className="flex items-start justify-between gap-2">
                            <span>{item.block_name}</span>
                            {itemPrice > 0 && (
                              <span className="text-xs whitespace-nowrap shrink-0">
                                {isPreliminary && "ca. "}€{formatPrice(itemPrice)}
                                {priceTypeLabel && ` ${priceTypeLabel}`}
                              </span>
                            )}
                          </div>
                          {item.admin_price_notes && (
                            <p className="text-xs text-muted-foreground/70 break-words">{item.admin_price_notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uitvoering & factuur door: {provider.name}
                  </p>
                  {provider.totalAmount === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Prijs nog te bevestigen
                    </p>
                  )}
                  {hasPreliminaryPrice && provider.totalAmount > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Voorlopige prijsindicatie
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Self-arranged items info */}
          {selfArrangedItems.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-dashed">
              <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-muted-foreground">Zelf te regelen</p>
                <p className="text-sm text-muted-foreground">
                  {selfArrangedItems.map((item) => item.block_name).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Deze boek en betaal je zelf rechtstreeks bij de aanbieder.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> U ontvangt van elke partij een aparte factuur. 
            Bedragen zijn gebaseerd op bevestigde prijzen en kunnen wijzigen bij nog openstaande aanvragen.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
