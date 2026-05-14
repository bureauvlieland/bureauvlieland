import { useMemo } from "react";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Clock } from "lucide-react";
import type { MapActivity } from "@/hooks/useMapActivities";
import type { PartnerItem } from "@/types/partner";

interface CalendarEntry {
  type: "map" | "bv";
  time: string;
  name: string;
  booked: number;
  max: number;
  status?: string;
  itemId?: string;
  requestRef?: string;
  customerName?: string;
  duration?: string | null;
}

interface PartnerPlanningCalendarProps {
  weekStart: Date;
  mapActivities: MapActivity[];
  bvItems: PartnerItem[];
  isLoading: boolean;
  onItemClick?: (itemId: string) => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  accepted: "bg-green-100 text-green-800 border-green-200",
  executed: "bg-slate-100 text-slate-800 border-slate-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  unavailable: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels: Record<string, string> = {
  pending: "In afwachting",
  confirmed: "Bevestigd",
  accepted: "Akkoord klant",
  executed: "Uitgevoerd",
  cancelled: "Geannuleerd",
  unavailable: "Niet beschikbaar",
};

export const PartnerPlanningCalendar = ({
  weekStart,
  mapActivities,
  bvItems,
  isLoading,
  onItemClick,
}: PartnerPlanningCalendarProps) => {
  const days = useMemo(() => {
    const start = startOfWeek(weekStart, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  // Group entries by day
  const entriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    days.forEach((d) => map.set(format(d, "yyyy-MM-dd"), []));

    // MAP activities
    mapActivities.forEach((a) => {
      if (a.IsCancelled) return;
      const dateStr = a.Departure.split("T")[0];
      const timeStr = format(parseISO(a.Departure), "HH:mm");
      const entries = map.get(dateStr);
      if (entries) {
        entries.push({
          type: "map",
          time: timeStr,
          name: a.ActivityTypeName,
          booked: a.NumberOfPersonsBooked,
          max: a.MaxPersons,
          duration: a.Duration ? `${a.Duration}u` : null,
        });
      }
    });

    // BV items
    bvItems.forEach((item) => {
      if (!item.program_requests?.selected_dates?.length) return;
      const dates = item.program_requests.selected_dates;
      const dayDate = dates[item.day_index] || dates[0];
      if (!dayDate) return;
      const entries = map.get(dayDate);
      if (entries) {
        const time = item.confirmed_time || item.proposed_time || item.preferred_time || "TBD";
        entries.push({
          type: "bv",
          time,
          name: item.block_name,
          booked: item.override_people ?? item.program_requests.number_of_people,
          max: 0,
          status: item.status,
          itemId: item.id,
          requestRef: item.program_requests.reference_number || undefined,
          customerName: item.program_requests.customer_name,
          duration: item.duration,
        });
      }
    });

    // Sort each day by time
    map.forEach((entries) => {
      entries.sort((a, b) => a.time.localeCompare(b.time));
    });

    return map;
  }, [days, mapActivities, bvItems]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary/20 border border-primary/40" />
          <span className="text-muted-foreground">MAP activiteiten</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-300" />
          <span className="text-muted-foreground">Bureau Vlieland aanvragen</span>
        </div>
      </div>

      {/* Desktop: 7 columns */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const entries = entriesByDay.get(dateStr) || [];
          const isToday = isSameDay(day, new Date());
          const totalBooked = entries.reduce((sum, e) => sum + e.booked, 0);

          return (
            <div key={dateStr} className="min-h-[120px]">
              {/* Day header */}
              <div
                className={`text-center py-1.5 rounded-t-md text-sm font-medium ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <div>{format(day, "EEE", { locale: nl })}</div>
                <div className="text-xs">{format(day, "d MMM", { locale: nl })}</div>
              </div>

              {/* Summary */}
              {entries.length > 0 && (
                <div className="text-xs text-center py-0.5 bg-muted/50 text-muted-foreground">
                  {entries.length} items · {totalBooked} pers.
                </div>
              )}

              {/* Entries */}
              <div className="space-y-1 mt-1">
                {entries.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 italic">
                    Geen activiteiten
                  </p>
                )}
                {entries.map((entry, idx) => (
                  <EntryCard
                    key={`${dateStr}-${idx}`}
                    entry={entry}
                    compact
                    onItemClick={onItemClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: stacked */}
      <div className="md:hidden space-y-3">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const entries = entriesByDay.get(dateStr) || [];
          const isToday = isSameDay(day, new Date());
          if (entries.length === 0) return null;

          return (
            <div key={dateStr}>
              <div
                className={`px-3 py-1.5 rounded-t-md text-sm font-medium ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {format(day, "EEEE d MMMM", { locale: nl })}
              </div>
              <div className="space-y-1 mt-1">
                {entries.map((entry, idx) => (
                  <EntryCard
                    key={`${dateStr}-${idx}`}
                    entry={entry}
                    compact={false}
                    onItemClick={onItemClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EntryCard = ({
  entry,
  compact,
  onItemClick,
}: {
  entry: CalendarEntry;
  compact: boolean;
  onItemClick?: (itemId: string) => void;
}) => {
  const isBv = entry.type === "bv";
  const occupancyPct = entry.max > 0 ? Math.round((entry.booked / entry.max) * 100) : 0;

  return (
    <Card
      className={`p-1.5 text-xs border cursor-default ${
        isBv
          ? "bg-orange-50 border-orange-200 hover:border-orange-400"
          : "bg-primary/5 border-primary/20"
      } ${isBv && onItemClick ? "cursor-pointer" : ""}`}
      onClick={() => isBv && entry.itemId && onItemClick?.(entry.itemId)}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="font-medium">{entry.time}</span>
            {entry.duration && (
              <span className="text-muted-foreground">({entry.duration})</span>
            )}
          </div>
          <p className="font-medium truncate mt-0.5">{entry.name}</p>
          {!compact && isBv && entry.customerName && (
            <p className="text-muted-foreground truncate">{entry.customerName}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-1 gap-1">
        <div className="flex items-center gap-1 text-muted-foreground" title={isBv ? "Aantal deelnemers aan deze activiteit" : "Aantal geboekt / max"}>
          <Users className="h-3 w-3" />
          <span>
            {entry.booked}
            {entry.max > 0 ? `/${entry.max}` : " deelnemers"}
          </span>
        </div>

        {isBv && entry.status && (
          <Badge
            variant="outline"
            className={`text-[10px] px-1 py-0 ${statusColors[entry.status] || ""}`}
          >
            {compact
              ? (entry.status === "pending" ? "⏳" : entry.status === "confirmed" ? "✓" : entry.status === "accepted" ? "✓✓" : entry.status.charAt(0).toUpperCase())
              : statusLabels[entry.status] || entry.status}
          </Badge>
        )}

        {!isBv && entry.max > 0 && (
          <span
            className={`text-[10px] font-medium ${
              occupancyPct >= 90
                ? "text-red-600"
                : occupancyPct >= 60
                ? "text-amber-600"
                : "text-green-600"
            }`}
          >
            {occupancyPct}%
          </span>
        )}
      </div>

      {isBv && entry.requestRef && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{entry.requestRef}</p>
      )}
    </Card>
  );
};
