import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  Phone,
  Navigation,
  Sun,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Info,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";
import type { ProgramRequestItem } from "@/types/programRequest";

interface TodayViewProps {
  selectedDates: Date[];
  items: ProgramRequestItem[];
  currentDayIndex: number | null;
  isUpcoming: boolean;
  numberOfPeople: number;
  customerCompany?: string;
  customerName: string;
}

const getEffectiveTime = (i: ProgramRequestItem) =>
  i.confirmed_time || i.proposed_time || i.preferred_time || "";

const sortByTime = (a: ProgramRequestItem, b: ProgramRequestItem) => {
  const ta = getEffectiveTime(a);
  const tb = getEffectiveTime(b);
  if (!ta && !tb) return 0;
  if (!ta) return 1;
  if (!tb) return -1;
  return ta.localeCompare(tb);
};

const buildMapsUrl = (item: ProgramRequestItem) => {
  if (item.location_lat && item.location_lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${item.location_lat},${item.location_lng}`;
  }
  if (item.location_address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      item.location_address
    )}`;
  }
  return null;
};

export const TodayView = ({
  selectedDates,
  items,
  currentDayIndex,
  isUpcoming,
  numberOfPeople,
  customerCompany,
  customerName,
}: TodayViewProps) => {
  const dayIdx = currentDayIndex ?? 0;
  const todayDate = selectedDates[dayIdx];

  const todayItems = useMemo(
    () =>
      items
        .filter(
          (i) =>
            i.status !== "cancelled" &&
            i.day_index === dayIdx &&
            i.day_index >= 0
        )
        .sort(sortByTime),
    [items, dayIdx]
  );

  // Bepaal "nu" in minuten t.o.v. middernacht voor highlight van actief item.
  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  const isToday = todayDate ? isSameDay(todayDate, new Date()) : false;

  const findActiveIdx = () => {
    if (!isToday) return -1;
    let active = -1;
    todayItems.forEach((i, idx) => {
      const t = getEffectiveTime(i);
      if (!t) return;
      const [hh, mm] = t.split(":").map(Number);
      const start = hh * 60 + (mm || 0);
      const end = start + (Number(i.duration) || 60);
      if (nowMinutes >= start && nowMinutes < end) active = idx;
    });
    return active;
  };
  const activeIdx = findActiveIdx();

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {isToday ? "Vandaag" : isUpcoming ? "Binnenkort" : "Programma-dag"}
              </p>
              <h2 className="text-xl font-semibold mt-0.5">
                {todayDate
                  ? format(todayDate, "EEEE d MMMM", { locale: nl })
                  : "Geen dag geselecteerd"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {customerCompany || customerName} · {numberOfPeople} personen
              </p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Dag {dayIdx + 1} / {selectedDates.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {!isToday && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 text-sm">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <p className="text-blue-900 dark:text-blue-100">
            U kijkt vooruit naar het programma. Tijdens uw verblijf toont deze tab
            automatisch het actuele dagdeel.
          </p>
        </div>
      )}

      {/* Timeline */}
      {todayItems.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Geen geplande activiteiten op deze dag.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {todayItems.map((item, idx) => {
            const time = getEffectiveTime(item);
            const isActive = idx === activeIdx;
            const isPast = isToday && activeIdx >= 0 && idx < activeIdx;
            const mapsUrl = buildMapsUrl(item);
            return (
              <Card
                key={item.id}
                className={
                  isActive
                    ? "border-primary border-2 shadow-md"
                    : isPast
                    ? "opacity-60"
                    : ""
                }
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    {/* Time column */}
                    <div className="text-center shrink-0 w-14">
                      <div className="text-lg font-semibold leading-none">
                        {time || "—"}
                      </div>
                      {item.duration ? (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {item.duration} min
                        </div>
                      ) : null}
                      {isActive && (
                        <Badge variant="default" className="mt-1 text-[10px] px-1 py-0">
                          Nu
                        </Badge>
                      )}
                      {isPast && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground mx-auto mt-1" />
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium leading-snug">{item.block_name}</h3>
                      {item.provider_name && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.provider_name}
                        </p>
                      )}
                      {item.location_address && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="truncate">{item.location_address}</span>
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {mapsUrl && (
                          <a href={mapsUrl} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              <Navigation className="h-3 w-3 mr-1" />
                              Route
                            </Button>
                          </a>
                        )}
                        {item.provider_email && (
                          <a href={`mailto:${item.provider_email}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              <Phone className="h-3 w-3 mr-1" />
                              Contact
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Weather hint */}
      <Card className="bg-muted/30">
        <CardContent className="py-4 flex items-center gap-3">
          <Sun className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Weer & wind</p>
            <p className="text-muted-foreground text-xs">
              Bekijk het actuele eilandweer op{" "}
              <a
                href="https://www.knmi.nl/nederland-nu/weer/waarschuwingen-en-verwachtingen"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                knmi.nl
              </a>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
