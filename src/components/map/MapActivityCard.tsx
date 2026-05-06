import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Ticket, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { MapActivity } from "@/hooks/useMapActivities";

export interface BundledTime {
  id: number;
  time: string; // HH:mm
  slotsLeft: number;
}

interface MapActivityCardProps {
  activity: MapActivity & {
    _partnerId?: string;
    _partnerName?: string;
    _partnerSlug?: string;
    _image?: string | null;
  };
  onBook?: (activity: MapActivity & { _partnerId?: string; _partnerSlug?: string }) => void;
  showPartner?: boolean;
  /** When provided, renders all departure times as chips and uses external booking link */
  times?: BundledTime[];
  /** Total spots remaining across all bundled times */
  totalSlotsLeft?: number;
}

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // MAP gebruikt 'en' i.p.v. '&' / '+' in zijn URL-slugs
    .replace(/&/g, " en ")
    .replace(/\+/g, " en ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const MapActivityCard = ({
  activity,
  onBook,
  showPartner = true,
  times,
  totalSlotsLeft,
}: MapActivityCardProps) => {
  const departureDate = new Date(activity.Departure);
  const displayPrice = activity.PricePerPerson;
  const childDisplayPrice = activity.PricePerChild || null;
  const spotsLeft = totalSlotsLeft ?? activity.RemainingSlots;
  const isAlmostFull = spotsLeft > 0 && spotsLeft <= 5;
  const isFull = spotsLeft <= 0;
  const activityName = activity.ActivityTypeName;
  const imageUrl = (activity as any)._image;
  const partnerSlug = (activity as any)._partnerSlug as string | undefined;

  const bookingUrl = partnerSlug
    ? `https://boeking.mijnactiviteitenplanner.nl/${partnerSlug}/${slugify(activityName)}/list`
    : null;

  const hasTimes = times && times.length > 0;

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
            {!hasTimes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(departureDate, "HH:mm")}
              </span>
            )}
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

          {hasTimes && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Vertrektijden</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {times!.map((t) => (
                  <Badge
                    key={t.id}
                    variant={t.slotsLeft <= 0 ? "outline" : "secondary"}
                    className="text-xs font-normal"
                    title={
                      t.slotsLeft <= 0
                        ? "Vol"
                        : `Nog ${t.slotsLeft} ${t.slotsLeft === 1 ? "plek" : "plekken"}`
                    }
                  >
                    {t.time}
                    {t.slotsLeft > 0 && t.slotsLeft <= 5 && (
                      <span className="ml-1 text-muted-foreground">· {t.slotsLeft}</span>
                    )}
                    {t.slotsLeft <= 0 && (
                      <span className="ml-1 text-muted-foreground">· vol</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

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
            {!isFull && bookingUrl ? (
              <Button size="sm" asChild>
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  Boeken
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </a>
              </Button>
            ) : (
              !isFull &&
              onBook && (
                <Button size="sm" onClick={() => onBook(activity)}>
                  Boeken
                </Button>
              )
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
};
