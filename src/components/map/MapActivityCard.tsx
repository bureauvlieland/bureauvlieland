import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Ticket } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { MapActivity } from "@/hooks/useMapActivities";

interface MapActivityCardProps {
  activity: MapActivity & {
    _partnerId?: string;
    _partnerName?: string;
    _partnerSlug?: string;
    _image?: string | null;
  };
  onBook?: (activity: MapActivity & { _partnerId?: string; _partnerSlug?: string }) => void;
  showPartner?: boolean;
}

export const MapActivityCard = ({
  activity,
  onBook,
  showPartner = true,
}: MapActivityCardProps) => {
  const departureDate = new Date(activity.Departure);
  const displayPrice = activity.PricePerPerson;
  const childDisplayPrice = activity.PricePerChild || null;
  const spotsLeft = activity.RemainingSlots;
  const isAlmostFull = spotsLeft > 0 && spotsLeft <= 5;
  const isFull = spotsLeft <= 0;
  const activityName = activity.ActivityTypeName;
  const imageUrl = (activity as any)._image;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className={imageUrl ? "flex flex-col sm:flex-row" : ""}>
        {imageUrl && (
          <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0 overflow-hidden">
            <img
              src={imageUrl}
              alt={activityName}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className="p-4 flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold text-base leading-tight">{activityName}</h3>
              {showPartner && (activity as any)._partnerName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  door {(activity as any)._partnerName}
                </p>
              )}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                <Ticket className="h-3 w-3 mr-1" />
                Direct boekbaar
              </Badge>
              {isAlmostFull && !isFull && (
                <Badge variant="destructive" className="text-xs">
                  Nog {spotsLeft} plekken
                </Badge>
              )}
              {isFull && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Vol
                </Badge>
              )}
            </div>
          </div>

          {activity.Description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {activity.Description}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(departureDate, "EEEE d MMMM", { locale: nl })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(departureDate, "HH:mm")}
            </span>
            {activity.Duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {activity.Duration}u
              </span>
            )}
            {activity.MaxPersons > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Max {activity.MaxPersons} pers.
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold">
                € {displayPrice.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-xs text-muted-foreground ml-1">p.p.</span>
              {childDisplayPrice !== null && (
                <span className="text-xs text-muted-foreground ml-2">
                  Kind: € {childDisplayPrice.toFixed(2).replace(".", ",")}
                </span>
              )}
            </div>
            {onBook && !isFull && (
              <Button size="sm" onClick={() => onBook(activity)}>
                Boeken
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
};