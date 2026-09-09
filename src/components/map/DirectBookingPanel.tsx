import { useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Ticket, Loader2 } from "lucide-react";
import { useMapActivities, type MapActivity } from "@/hooks/useMapActivities";
import { MapBookingDialog } from "@/components/map/MapBookingDialog";
import type { BundledTime } from "@/components/map/MapActivityCard";
import type { BookableBundle } from "@/lib/directBookable";

const WINDOW_DAYS = 90;
const VISIBLE_DAYS = 6;

type EnrichedActivity = MapActivity & {
  _partnerId?: string;
  _partnerName?: string;
  _partnerSlug?: string;
  _image?: string | null;
};

interface DayGroup {
  dateKey: string;
  representative: EnrichedActivity;
  times: BundledTime[];
}

/**
 * Directe boeking inline op de pagina: geen doorklik naar de losstaande
 * boekkalender met een voorgeselecteerde datum (verwarrend, voelt als een
 * andere pagina), maar de eerstvolgende data direct zichtbaar en boekbaar —
 * zelfde patroon als de activiteitpagina's op visitvlieland.nl.
 */
export const DirectBookingPanel = ({ bundle }: { bundle: BookableBundle }) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const until = format(addDays(new Date(), WINDOW_DAYS), "yyyy-MM-dd");

  const { data: rawActivities, isLoading } = useMapActivities(
    bundle.partnerSlug,
    today,
    until,
    true,
    bundle.partnerId ?? undefined,
  );

  const [bookingActivity, setBookingActivity] = useState<EnrichedActivity | null>(null);
  const [bookingTimes, setBookingTimes] = useState<BundledTime[]>([]);
  const [bookingTimeId, setBookingTimeId] = useState<number | null>(null);

  const days = useMemo<DayGroup[]>(() => {
    if (!rawActivities) return [];
    const now = Date.now();
    const byDate = new Map<string, DayGroup>();

    for (const raw of rawActivities) {
      if (raw.ActivityTypeId !== bundle.activityTypeId) continue;
      if (raw.IsCancelled || raw.IsActive === false) continue;
      const departure = new Date(raw.Departure);
      if (isNaN(departure.getTime()) || departure.getTime() <= now) continue;

      const enriched: EnrichedActivity = {
        ...raw,
        _partnerId: bundle.partnerId ?? undefined,
        _partnerName: bundle.partnerName ?? undefined,
        _partnerSlug: bundle.partnerSlug ?? undefined,
        _image: bundle.image,
      };
      const dateKey = format(departure, "yyyy-MM-dd");
      const time: BundledTime = {
        id: raw.Id,
        time: format(departure, "HH:mm"),
        slotsLeft: Math.max(0, raw.RemainingSlots ?? 0),
      };

      const existing = byDate.get(dateKey);
      if (existing) {
        existing.times.push(time);
      } else {
        byDate.set(dateKey, { dateKey, representative: enriched, times: [time] });
      }
    }

    return Array.from(byDate.values())
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map((day) => ({ ...day, times: day.times.sort((x, y) => x.time.localeCompare(y.time)) }));
  }, [rawActivities, bundle]);

  const openBooking = (day: DayGroup, timeId: number) => {
    setBookingActivity(day.representative);
    setBookingTimes(day.times);
    setBookingTimeId(timeId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Beschikbaarheid laden…
      </div>
    );
  }

  if (days.length === 0) {
    return null;
  }

  const firstBookable = days.find((d) => d.times.some((t) => t.slotsLeft > 0));

  return (
    <div className="space-y-3">
      {firstBookable && (
        <Button
          size="lg"
          className="w-full sm:w-auto gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() =>
            openBooking(
              firstBookable,
              firstBookable.times.find((t) => t.slotsLeft > 0)!.id,
            )
          }
        >
          <Ticket className="h-4 w-4" />
          Direct reserveren
        </Button>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Eerstvolgende data
        </p>
        <div className="flex flex-col gap-1.5">
          {days.slice(0, VISIBLE_DAYS).map((day) => (
            <div
              key={day.dateKey}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <span className="text-sm capitalize">
                {format(new Date(`${day.dateKey}T00:00:00`), "EEE d MMM", { locale: nl })}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {day.times.map((t) => (
                  <Button
                    key={t.id}
                    size="sm"
                    variant={t.slotsLeft > 0 ? "outline" : "ghost"}
                    disabled={t.slotsLeft <= 0}
                    className="h-7 px-2 text-xs"
                    onClick={() => openBooking(day, t.id)}
                  >
                    {t.time}
                    {t.slotsLeft > 0 && t.slotsLeft <= 5 && ` · ${t.slotsLeft}`}
                    {t.slotsLeft <= 0 && " · vol"}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <MapBookingDialog
        activity={bookingActivity}
        times={bookingTimes}
        selectedTimeId={bookingTimeId}
        open={!!bookingActivity}
        onOpenChange={(open) => {
          if (!open) {
            setBookingActivity(null);
            setBookingTimeId(null);
          }
        }}
      />
    </div>
  );
};
