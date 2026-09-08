import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertCircle, Clock, Link2, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMapActivityTypes, type MapActivityType } from "@/hooks/useMapActivities";

interface LinkedBlock {
  id: string;
  name: string;
  status: string | null;
  map_activity_type_id: number | null;
}

interface MapOfferOverviewProps {
  tenantSlug: string;
  partnerId: string;
  /** Partnerportaal: activiteitstype aanbieden als bouwsteen. Zonder callback is het overzicht alleen-lezen (admin). */
  onOffer?: (type: MapActivityType) => void;
  /** Admin: link naar de bouwsteen in plaats van de partnerbewerking. */
  blockLinkBase?: string;
  /** Verandert als de bouwstenen zijn gewijzigd, zodat de koppelingen opnieuw geladen worden. */
  refreshKey?: number | string;
}

const mapImageUrl = (ref: string | null) =>
  ref ? `https://portal.mijnactiviteitenplanner.nl/File/Get?reference=${encodeURIComponent(ref)}` : null;

const STATUS_LABEL: Record<string, string> = {
  published: "gepubliceerd",
  active: "goedgekeurd",
  concept: "wacht op goedkeuring",
};

/**
 * Het volledige aanbod van een partner in MijnActiviteitenplanner, met per
 * activiteitstype of het al als bouwsteen bij Bureau Vlieland staat
 * (docs/plan-activiteitenaanbieders.md, fase 3). Gekoppelde bouwstenen volgen
 * 's nachts foto, tekst en duur uit MAP.
 */
export const MapOfferOverview = ({ tenantSlug, partnerId, onOffer, blockLinkBase, refreshKey }: MapOfferOverviewProps) => {
  const { data: types = [], isLoading, isError } = useMapActivityTypes(tenantSlug, !!tenantSlug, partnerId);
  const { data: blocks = [] } = useQuery({
    queryKey: ["map-offer-blocks", partnerId, refreshKey ?? 0],
    queryFn: async (): Promise<LinkedBlock[]> => {
      const { data, error } = await supabase
        .from("building_blocks")
        .select("id, name, status, map_activity_type_id")
        .eq("provider_id", partnerId)
        .not("map_activity_type_id", "is", null);
      if (error) throw error;
      return (data ?? []) as LinkedBlock[];
    },
    enabled: !!partnerId,
  });

  const blockByType = new Map<number, LinkedBlock>();
  for (const b of blocks) if (typeof b.map_activity_type_id === "number") blockByType.set(b.map_activity_type_id, b);
  const sorted = [...(types as MapActivityType[])].sort((a, b) => {
    const la = blockByType.has(a.Id) ? 0 : 1;
    const lb = blockByType.has(b.Id) ? 0 : 1;
    return la - lb || a.Name.localeCompare(b.Name);
  });
  const linkedCount = sorted.filter((t) => blockByType.has(t.Id)).length;

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        {onOffer ? "Uw activiteiten in MijnActiviteitenplanner" : "Activiteiten in MijnActiviteitenplanner"}
        {!isLoading && !isError && (
          <span className="font-normal normal-case tracking-normal">
            · {sorted.length} {sorted.length === 1 ? "type" : "types"}, {linkedCount} aangeboden bij Bureau Vlieland
          </span>
        )}
      </h2>
      <p className="text-xs text-muted-foreground mb-3">
        {onOffer
          ? "Kies wat u via Bureau Vlieland aan groepen wilt aanbieden. Een aangeboden activiteit volgt daarna elke nacht de foto, tekst en duur uit MAP; de prijs voor groepen bepaalt u samen met het bureau."
          : "Per activiteitstype staat of het als bouwsteen bij Bureau Vlieland is aangeboden. Koppelen kan de partner zelf in zijn portaal, of via de bouwsteen (MAP-activiteit kiezen)."}
      </p>
      {isLoading ? (
        <Card><CardContent className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Aanbod uit MAP laden…</CardContent></Card>
      ) : isError ? (
        <Card className="border-destructive/40"><CardContent className="py-6 flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />Het aanbod uit MAP kon niet worden geladen. Controleer de MAP-sleutel van deze partner, of probeer het later opnieuw.</CardContent></Card>
      ) : sorted.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Geen activiteitstypes gevonden in deze MAP-omgeving.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((type) => {
            const linked = blockByType.get(type.Id);
            const img = mapImageUrl(type.Image);
            return (
              <Card key={type.Id} className={linked ? "" : "border-dashed border-accent/50 bg-accent/5"}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {img ? (
                      <img src={img} alt={type.Name} className="h-14 w-20 rounded-md object-cover shrink-0 bg-muted" loading="lazy" />
                    ) : (
                      <div className="h-14 w-20 rounded-md bg-muted flex items-center justify-center shrink-0"><Sparkles className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{type.Name}</span>
                        {linked ? (
                          <Badge variant="secondary" className="gap-1 font-normal text-xs">
                            <Link2 className="h-3 w-3" />Aangeboden{linked.status && STATUS_LABEL[linked.status] ? ` · ${STATUS_LABEL[linked.status]}` : ""}
                          </Badge>
                        ) : (
                          <Badge className="bg-accent text-accent-foreground gap-1 font-normal text-xs"><Sparkles className="h-3 w-3" />Nog niet aangeboden</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-x-3 text-xs text-muted-foreground mt-0.5">
                        {type.Duration ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{type.Duration} uur</span> : null}
                        {linked && linked.name !== type.Name && <span className="truncate">bouwsteen: {linked.name}</span>}
                        {!linked && type.Description && <span className="truncate">{type.Description}</span>}
                      </div>
                    </div>
                    {linked ? (
                      blockLinkBase ? (
                        <Button asChild size="sm" variant="outline"><Link to={`${blockLinkBase}${linked.id}`}>Bouwsteen</Link></Button>
                      ) : null
                    ) : onOffer ? (
                      <Button size="sm" onClick={() => onOffer(type)}>
                        <Sparkles className="h-4 w-4 mr-2" />Aanbieden
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
