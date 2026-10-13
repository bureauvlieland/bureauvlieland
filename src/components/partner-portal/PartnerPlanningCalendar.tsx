import { useMemo } from "react";
import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { Clock, Users } from "lucide-react";
import { LoadingState, Pill } from "@/components/system";
import type { PillTone } from "@/components/system";
import type { MapActivity } from "@/hooks/useMapActivities";
import type { PartnerItem } from "@/types/partner";
import { deriveItemDisplayStatusLoose, itemDisplayStatusConfig } from "@/lib/itemStatus";
import { cn } from "@/lib/utils";

/**
 * De weekplanning (partnerportaal fase 4): de onderdelen van Bureau
 * Vlieland naast de boekingen uit MijnActiviteitenplanner, op de tonen van
 * het ontwerpsysteem. De status van een onderdeel komt uit de
 * partnerwoordenlijst (`partnerLabel`, `partnerTone`); in de smalle
 * weekkolom is dat een gekleurde stip met de tekst voor hulptechnologie.
 */
interface CalendarEntry {
  type: "map" | "bv";
  time: string;
  name: string;
  booked: number;
  max: number;
  statusLabel?: string;
  statusTone?: PillTone;
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

const DOT: Record<PillTone, string> = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground",
  purple: "bg-primary",
  brand: "bg-primary",
};

export const PartnerPlanningCalendar = ({ weekStart, mapActivities, bvItems, isLoading, onItemClick }: PartnerPlanningCalendarProps) => {
  const days = useMemo(() => {
    const start = startOfWeek(weekStart, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    days.forEach((d) => map.set(format(d, "yyyy-MM-dd"), []));

    mapActivities.forEach((a) => {
      if (a.IsCancelled) return;
      const entries = map.get(a.Departure.split("T")[0]);
      entries?.push({ type: "map", time: format(parseISO(a.Departure), "HH:mm"), name: a.ActivityTypeName, booked: a.NumberOfPersonsBooked, max: a.MaxPersons, duration: a.Duration ? `${a.Duration} u` : null });
    });

    bvItems.forEach((item) => {
      if (item.status === "cancelled" || item.status === "unavailable") return;
      if (item.program_requests?.cancelled_at || item.program_requests?.status === "cancelled") return;
      const dates = item.program_requests?.selected_dates;
      if (!dates?.length) return;
      const entries = map.get(dates[item.day_index] || dates[0]);
      if (!entries) return;
      const status = itemDisplayStatusConfig[deriveItemDisplayStatusLoose(item, { audience: "partner" })];
      entries.push({
        type: "bv",
        time: item.confirmed_time || item.proposed_time || item.preferred_time || "flexibel",
        name: item.block_name,
        booked: item.override_people ?? item.program_requests.number_of_people,
        max: 0,
        statusLabel: status.partnerLabel,
        statusTone: status.partnerTone,
        itemId: item.id,
        requestRef: item.program_requests.reference_number || undefined,
        customerName: item.program_requests.customer_name,
        duration: item.duration,
      });
    });

    map.forEach((entries) => entries.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [days, mapActivities, bvItems]);

  if (isLoading) return <LoadingState label="Planning laden" />;

  const dayHeader = (day: Date, compact: boolean) => {
    const isToday = isSameDay(day, new Date());
    return (
      <div className={cn("rounded-t-md px-3 py-1.5 text-sm font-medium", compact && "text-center", isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
        {compact ? (
          <>
            <div>{format(day, "EEE", { locale: nl })}</div>
            <div className="text-xs">{format(day, "d MMM", { locale: nl })}</div>
          </>
        ) : (
          format(day, "EEEE d MMMM", { locale: nl })
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap items-center gap-4 text-sm" aria-label="Legenda">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-primary/40 bg-accent-soft" aria-hidden="true" />
          <span className="text-muted-foreground">Uw boekingen in MAP</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-warning/50 bg-warning-soft" aria-hidden="true" />
          <span className="text-muted-foreground">Onderdelen van Bureau Vlieland</span>
        </li>
      </ul>

      {/* Desktop: zeven kolommen */}
      <div className="hidden grid-cols-7 gap-2 md:grid">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const entries = entriesByDay.get(dateStr) || [];
          const totalBooked = entries.reduce((sum, e) => sum + e.booked, 0);
          return (
            <div key={dateStr} className="min-h-[120px]">
              {dayHeader(day, true)}
              {entries.length > 0 && (
                <div className="bg-muted/50 py-0.5 text-center text-xs text-muted-foreground">
                  {entries.length} {entries.length === 1 ? "item" : "items"} · {totalBooked} pers.
                </div>
              )}
              <div className="mt-1 space-y-1">
                {entries.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Niets gepland</p>}
                {entries.map((entry, idx) => (
                  <EntryCard key={`${dateStr}-${idx}`} entry={entry} compact onItemClick={onItemClick} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Telefoon: dagen onder elkaar */}
      <div className="space-y-3 md:hidden">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const entries = entriesByDay.get(dateStr) || [];
          if (entries.length === 0) return null;
          return (
            <div key={dateStr}>
              {dayHeader(day, false)}
              <div className="mt-1 space-y-1">
                {entries.map((entry, idx) => (
                  <EntryCard key={`${dateStr}-${idx}`} entry={entry} compact={false} onItemClick={onItemClick} />
                ))}
              </div>
            </div>
          );
        })}
        {days.every((d) => (entriesByDay.get(format(d, "yyyy-MM-dd")) || []).length === 0) && <p className="py-6 text-center text-sm text-muted-foreground">Niets gepland deze week.</p>}
      </div>
    </div>
  );
};

const EntryCard = ({ entry, compact, onItemClick }: { entry: CalendarEntry; compact: boolean; onItemClick?: (itemId: string) => void }) => {
  const isBv = entry.type === "bv";
  const clickable = isBv && !!entry.itemId && !!onItemClick;
  const occupancyPct = entry.max > 0 ? Math.round((entry.booked / entry.max) * 100) : 0;
  const Tag = clickable ? "button" : "div";

  return (
    <Tag
      type={clickable ? "button" : undefined}
      onClick={clickable ? () => onItemClick?.(entry.itemId!) : undefined}
      className={cn(
        "block w-full rounded-md border p-1.5 text-left text-xs",
        isBv ? "border-warning/50 bg-warning-soft/60" : "border-primary/20 bg-accent-soft/60",
        clickable && "cursor-pointer hover:border-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-center gap-1">
        <Clock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="font-medium">{entry.time}</span>
        {entry.duration && <span className="text-muted-foreground">({entry.duration})</span>}
      </div>
      <p className="mt-0.5 truncate font-medium">{entry.name}</p>
      {!compact && isBv && entry.customerName && <p className="truncate text-muted-foreground">{entry.customerName}</p>}

      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="flex items-center gap-1 text-muted-foreground" title={isBv ? "Aantal deelnemers" : "Geboekt van maximaal"}>
          <Users className="h-3 w-3" aria-hidden="true" />
          {entry.booked}
          {entry.max > 0 ? `/${entry.max}` : ""}
        </span>
        {isBv && entry.statusLabel && entry.statusTone && (compact ? (
          <span className="flex items-center" title={entry.statusLabel}>
            <span className={cn("h-2 w-2 rounded-full", DOT[entry.statusTone])} aria-hidden="true" />
            <span className="sr-only">{entry.statusLabel}</span>
          </span>
        ) : (
          <Pill tone={entry.statusTone} size="sm">
            {entry.statusLabel}
          </Pill>
        ))}
        {!isBv && entry.max > 0 && <span className={cn("text-[10px] font-medium", occupancyPct >= 90 ? "text-destructive" : occupancyPct >= 60 ? "text-warning-ink" : "text-success-ink")}>{occupancyPct}%</span>}
      </div>
      {isBv && entry.requestRef && <p className="mt-0.5 text-[10px] text-muted-foreground">{entry.requestRef}</p>}
    </Tag>
  );
};
