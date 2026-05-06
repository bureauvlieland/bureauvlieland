import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  Users,
  Ticket,
  ExternalLink,
  Bed,
  Sparkles,
  UtensilsCrossed,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import type { MapActivity } from "@/hooks/useMapActivities";
import type { BundledTime } from "./MapActivityCard";

type EnrichedActivity = MapActivity & {
  _partnerId?: string;
  _partnerName?: string;
  _partnerSlug?: string;
  _image?: string | null;
};

interface Props {
  activity: EnrichedActivity | null;
  times: BundledTime[];
  totalSlotsLeft: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " en ")
    .replace(/\+/g, " en ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .split("-")
    .map((segment) => encodeURIComponent(segment))
    .join("-");

const trackEvent = (event: string, payload: Record<string, unknown>) => {
  try {
    (window as any).dataLayer?.push({ event, ...payload });
  } catch {
    // noop
  }
};

export const MapActivityDetailSheet = ({
  activity,
  times,
  totalSlotsLeft,
  open,
  onOpenChange,
}: Props) => {
  if (!activity) return null;

  const departureDate = new Date(activity.Departure);
  const partnerSlug = activity._partnerSlug;
  const partnerName = activity._partnerName;
  const bookingBaseUrl = partnerSlug
    ? `https://boeking.mijnactiviteitenplanner.nl/${partnerSlug}/${slugify(activity.ActivityTypeName)}/list`
    : null;

  const isFull = totalSlotsLeft <= 0;

  const handleBookClick = (time: string) => {
    trackEvent("activity_book_click", {
      activity: activity.ActivityTypeName,
      partner: partnerName,
      time,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl lg:max-w-2xl overflow-y-auto p-0">
        {/* Hero image */}
        {activity._image && (
          <div className="w-full h-56 sm:h-64 overflow-hidden bg-muted">
            <img
              src={activity._image}
              alt={activity.ActivityTypeName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-6">
          <SheetHeader className="space-y-2 text-left">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs">
                <Ticket className="h-3 w-3 mr-1" />
                Direct boekbaar
              </Badge>
              {!isFull && totalSlotsLeft <= 5 && (
                <Badge variant="destructive" className="text-xs">
                  Nog {totalSlotsLeft} plekken
                </Badge>
              )}
              {isFull && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Vol
                </Badge>
              )}
            </div>
            <SheetTitle className="text-2xl leading-tight">
              {activity.ActivityTypeName}
            </SheetTitle>
            {partnerName && (
              <p className="text-sm text-muted-foreground">
                door <span className="font-medium text-foreground">{partnerName}</span>
              </p>
            )}
          </SheetHeader>

          {/* Description */}
          {activity.Description && (
            <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
              {activity.Description}
            </p>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Datum</p>
                <p className="font-medium capitalize">
                  {format(departureDate, "EEEE d MMMM", { locale: nl })}
                </p>
              </div>
            </div>
            {activity.Duration && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Duur</p>
                  <p className="font-medium">{activity.Duration} uur</p>
                </div>
              </div>
            )}
            {activity.MaxPersons > 0 && (
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Max. personen</p>
                  <p className="font-medium">{activity.MaxPersons}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Ticket className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Prijs</p>
                <p className="font-medium">
                  € {activity.PricePerPerson.toFixed(2).replace(".", ",")} p.p.
                </p>
                {activity.PricePerChild !== null && (
                  <p className="text-xs text-muted-foreground">
                    Kind: € {activity.PricePerChild.toFixed(2).replace(".", ",")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {activity.Notes && (
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground flex gap-2">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="whitespace-pre-line">{activity.Notes}</p>
            </div>
          )}

          {/* Departure times */}
          {times.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Kies een vertrektijd
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {times.map((t) => {
                  const timeFull = t.slotsLeft <= 0;
                  const url = bookingBaseUrl;
                  return (
                    <Button
                      key={t.id}
                      variant={timeFull ? "outline" : "default"}
                      disabled={timeFull || !url}
                      asChild={!timeFull && !!url}
                      className="h-auto py-3 flex-col gap-0.5"
                      onClick={() => !timeFull && handleBookClick(t.time)}
                    >
                      {!timeFull && url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <span className="text-base font-semibold">{t.time}</span>
                          <span className="text-[10px] opacity-90">
                            {t.slotsLeft <= 5 ? `nog ${t.slotsLeft}` : "boeken"}
                          </span>
                        </a>
                      ) : (
                        <>
                          <span className="text-base font-semibold">{t.time}</span>
                          <span className="text-[10px] text-muted-foreground">vol</span>
                        </>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          {bookingBaseUrl && partnerName && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>
                U boekt rechtstreeks bij <span className="font-medium text-foreground">{partnerName}</span>.
                De boekingspagina opent in een nieuw venster.
              </p>
            </div>
          )}

          {/* Cross-sell */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Maak het compleet</h3>
            <div className="grid sm:grid-cols-3 gap-2">
              <Link to="/logies-aanvragen" className="block">
                <Card className="p-3 h-full hover:bg-accent/50 transition-colors border">
                  <Bed className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium leading-tight">Ook overnachten?</p>
                  <p className="text-xs text-muted-foreground mt-1">Logies aanvragen</p>
                </Card>
              </Link>
              <Link to="/programma-samenstellen" className="block">
                <Card className="p-3 h-full hover:bg-accent/50 transition-colors border">
                  <Sparkles className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium leading-tight">Compleet programma?</p>
                  <p className="text-xs text-muted-foreground mt-1">Stel zelf samen</p>
                </Card>
              </Link>
              <Link to="/onze-werkwijze" className="block">
                <Card className="p-3 h-full hover:bg-accent/50 transition-colors border">
                  <UtensilsCrossed className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium leading-tight">Hoe werken wij?</p>
                  <p className="text-xs text-muted-foreground mt-1">Onze werkwijze</p>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
