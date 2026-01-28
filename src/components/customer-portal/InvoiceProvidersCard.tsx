import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Building2, ExternalLink, BedDouble, Euro } from "lucide-react";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";

interface InvoiceProvidersCardProps {
  items: ProgramRequestItem[];
  selectedAccommodationQuote?: AccommodationQuote | null;
  numberOfPeople?: number;
  className?: string;
}

interface ProviderInfo {
  id: string;
  name: string;
  itemCount: number;
  blockType: string;
  totalAmount: number;
  itemNames: string[];
}

// Coordination fee tiers based on group size
const getCoordinationFee = (numberOfPeople: number): number => {
  if (numberOfPeople <= 10) return 50;
  if (numberOfPeople <= 25) return 100;
  if (numberOfPeople <= 100) return 250;
  if (numberOfPeople <= 150) return 350;
  return 500;
};

export const InvoiceProvidersCard = ({ items, selectedAccommodationQuote, numberOfPeople = 20, className }: InvoiceProvidersCardProps) => {
  const { providers, selfArrangedItems, bureauTotal, partnerProviders, coordinationFee } = useMemo(() => {
    // Group items by provider, excluding cancelled and self-arranged
    const providerMap = items
      .filter((item) => item.status !== "cancelled" && item.block_type !== "self_arranged")
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
        acc[key].totalAmount += item.quoted_price || 0;
        acc[key].itemNames.push(item.block_name);
        return acc;
      }, {} as Record<string, ProviderInfo>);

    const providerList = Object.values(providerMap);

    // Separate Bureau Vlieland items from partner items
    const bureauItems = providerList.filter((p) => p.blockType === "bureau");
    const partnerItems = providerList.filter((p) => p.blockType === "partner");

    // Calculate bureau total
    const bureauItemsTotal = bureauItems.reduce((sum, p) => sum + p.totalAmount, 0);

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
          Wie stuurt je een factuur?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Voor dit programma ontvang je facturen van de volgende partijen:
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
                    <span>{formatPrice(bureauTotal + coordinationFee)}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {bureauTotal > 0 ? "Activiteiten + " : ""}Coördinatie & handling fee
                </p>
              </div>
            </div>
          )}

          {/* Partner items - each provider separately with amounts */}
          {partnerProviders.map((provider) => (
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
                      <Euro className="h-3.5 w-3.5" />
                      <span>{formatPrice(provider.totalAmount)}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {provider.itemNames.slice(0, 2).join(", ")}
                  {provider.itemNames.length > 2 && ` +${provider.itemNames.length - 2} meer`}
                </p>
                {provider.totalAmount === 0 && (
                  <p className="text-xs text-muted-foreground italic mt-0.5">
                    Prijs nog te bevestigen
                  </p>
                )}
              </div>
            </div>
          ))}

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
            💡 <strong>Tip:</strong> Je ontvangt van elke partij een aparte factuur. 
            Bedragen zijn gebaseerd op bevestigde prijzen en kunnen wijzigen bij nog openstaande aanvragen.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
