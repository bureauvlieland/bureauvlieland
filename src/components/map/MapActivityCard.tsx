import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, MapPin, Ticket } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { MapActivity } from "@/hooks/useMapActivities";

interface MapActivityCardProps {
  activity: MapActivity & {
    _partnerId?: string;
    _partnerName?: string;
    _partnerSlug?: string;
  };
  onBook?: (activity: MapActivity & { _partnerId?: string; _partnerSlug?: string }) => void;
  showPartner?: boolean;
  commissionMarkup?: number; // e.g. 1.10 for 10%
}

export const MapActivityCard = ({
  activity,
  onBook,
  showPartner = true,
  commissionMarkup = 1.10,
}: MapActivityCardProps) => {
  const departureDate = new Date(activity.Departure);
  const displayPrice = Math.ceil(activity.Price * commissionMarkup * 100) / 100;
  const childDisplayPrice = activity.ChildPrice
    ? Math.ceil(activity.ChildPrice * commissionMarkup * 100) / 100
    : null;
  const spotsLeft = activity.RemainingSlots;
  const isAlmostFull = spotsLeft > 0 && spotsLeft <= 5;
  const isFull = spotsLeft <= 0;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        {activity.ImageUrl && (
          <div className="sm:w-48 h-40 sm:h-auto flex-shrink-0">
            <img
              src={activity.ImageUrl}
              alt={activity.Name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <CardContent className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold text-base leading-tight">{activity.Name}</h3>
              {showPartner && activity._partnerName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  door {activity._partnerName}
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
            {activity.StartTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {activity.StartTime}
                {activity.EndTime && ` – ${activity.EndTime}`}
              </span>
            )}
            {activity.MaxParticipants > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Max {activity.MaxParticipants} pers.
              </span>
            )}
            {activity.Location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {activity.Location}
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
