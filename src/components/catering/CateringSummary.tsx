import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { BuildingBlock } from "@/types/buildingBlock";

export type CateringSelection = {
  type: string | null;
  date: Date | null;
  startTime: string;
  locationText: string;
  hasHorecaOnSite: boolean | null;
  guests: number;
  mainBlockId: string | null;
  addonBlockIds: string[];
};

const fmtPrice = (v: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(v);

const priceForBlock = (b: BuildingBlock, guests: number): { value: number; label: string; indicative: boolean } => {
  if (b.price_adult == null) {
    return { value: 0, label: b.price_display_override || "Op aanvraag", indicative: true };
  }
  switch (b.price_type) {
    case "per_person":
    case "per_person_per_day":
      return { value: b.price_adult * guests, label: `${fmtPrice(b.price_adult)} p.p.`, indicative: false };
    case "total":
      return { value: b.price_adult, label: `${fmtPrice(b.price_adult)} totaal`, indicative: false };
    default:
      return { value: 0, label: "Op aanvraag", indicative: true };
  }
};

export const calculateTotal = (selection: CateringSelection, blocks: BuildingBlock[]): { total: number; hasIndicative: boolean } => {
  const ids = [selection.mainBlockId, ...selection.addonBlockIds].filter(Boolean) as string[];
  let total = 0;
  let hasIndicative = false;
  ids.forEach((id) => {
    const b = blocks.find((x) => x.id === id);
    if (!b) return;
    const { value, indicative } = priceForBlock(b, selection.guests);
    total += value;
    if (indicative) hasIndicative = true;
  });
  return { total, hasIndicative };
};

interface CateringSummaryProps {
  selection: CateringSelection;
  blocks: BuildingBlock[];
}

const typeLabels: Record<string, string> = {
  lunch: "Lunch",
  borrel: "Borrel & receptie",
  bbq: "BBQ",
  diner: "Diner",
  ontbijt: "Ontbijt",
  maatwerk: "Maatwerk",
};

export const CateringSummary = ({ selection, blocks }: CateringSummaryProps) => {
  const mainBlock = selection.mainBlockId ? blocks.find((b) => b.id === selection.mainBlockId) : null;
  const addons = selection.addonBlockIds
    .map((id) => blocks.find((b) => b.id === id))
    .filter(Boolean) as BuildingBlock[];
  const { total, hasIndicative } = calculateTotal(selection, blocks);

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="text-lg">Uw aanvraag</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          {selection.type && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Type</span>
              <Badge variant="secondary">{typeLabels[selection.type] || selection.type}</Badge>
            </div>
          )}
          {selection.date && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Datum</span>
              <span>{selection.date.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          )}
          {selection.startTime && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Starttijd</span>
              <span>{selection.startTime}</span>
            </div>
          )}
          {selection.locationText && (
            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">Locatie</span>
              <span className="text-right">{selection.locationText}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Gasten</span>
            <span>{selection.guests}</span>
          </div>
        </div>

        {(mainBlock || addons.length > 0) && (
          <>
            <Separator />
            <div className="space-y-2">
              {mainBlock && (
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{mainBlock.name}</span>
                  <span className="text-muted-foreground whitespace-nowrap">{priceForBlock(mainBlock, selection.guests).label}</span>
                </div>
              )}
              {addons.map((a) => (
                <div key={a.id} className="flex justify-between gap-2 text-xs">
                  <span>+ {a.name}</span>
                  <span className="text-muted-foreground whitespace-nowrap">{priceForBlock(a, selection.guests).label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <Separator />
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Indicatief totaal (incl. BTW)</span>
            <span className="text-xl font-semibold">{fmtPrice(total)}</span>
          </div>
          {hasIndicative && (
            <p className="mt-1 text-xs text-muted-foreground">
              Eén of meer items zijn op aanvraag — definitieve prijs in de offerte.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
