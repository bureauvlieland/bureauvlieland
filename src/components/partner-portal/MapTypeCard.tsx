import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Users, Euro, Link2 } from "lucide-react";
import type { MapActivityType } from "@/hooks/useMapActivities";

interface MapTypeCardProps {
  type: MapActivityType;
  onEnrich: (type: MapActivityType) => void;
}

const mapImageUrl = (ref: string | null) =>
  ref
    ? `https://portal.mijnactiviteitenplanner.nl/File/Get?reference=${encodeURIComponent(ref)}`
    : null;

export const MapTypeCard = ({ type, onEnrich }: MapTypeCardProps) => {
  const img = mapImageUrl(type.Image);
  const offline = type.IsAvailableOnline === false;

  return (
    <Card className="border-dashed border-accent/50 bg-accent/5">
      <div className="aspect-video relative overflow-hidden rounded-t-lg bg-muted">
        {img ? (
          <img src={img} alt={type.Name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Link2 className="h-10 w-10" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-2">
          <Badge className="bg-accent text-accent-foreground gap-1">
            <Sparkles className="h-3 w-3" />
            Vanuit MAP
          </Badge>
        </div>
        {offline && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-background/90">
              Niet online beschikbaar
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-1">{type.Name}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {type.Description || "Geen beschrijving in MAP."}
        </p>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
          {type.Duration ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {type.Duration} uur
            </span>
          ) : null}
        </div>

        <Button
          className="w-full"
          onClick={() => onEnrich(type)}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Verrijken & publiceren
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Wordt na opslaan beoordeeld door Bureau Vlieland.
        </p>
      </CardContent>
    </Card>
  );
};
