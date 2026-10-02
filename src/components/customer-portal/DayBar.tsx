import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/system";

/**
 * De dagbalk (klantportaal fase 2, voorstel A): plakt onder de tabbalk en
 * toont per dag weekdag en datum, het aantal onderdelen en één status:
 * "n open" (u moet nog iets goedkeuren), "wacht op n" (de aanbieder is aan
 * zet) of een vinkje (rond). Klik scrolt naar de dag; bij scrollen licht de
 * zichtbare dag op. Op een telefoon scrolt de balk horizontaal met vaste
 * stappen.
 */
export type DayStatus = "open" | "waiting" | "done" | "empty";

export interface DayBarDay {
  index: number;
  date: Date;
  count: number;
  status: DayStatus;
  openCount: number;
  waitingCount: number;
  isToday?: boolean;
}

interface DayBarProps {
  days: DayBarDay[];
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}

export const DayBar = ({ days, activeIndex, onSelect, className }: DayBarProps) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-day="${activeIndex}"]`);
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeIndex]);

  if (days.length <= 1) return null;

  return (
    <nav
      aria-label="Dagen"
      className={cn(
        "sticky top-14 z-30 -mt-2 border-b bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85",
        className,
      )}
    >
      <div
        ref={listRef}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((day) => {
          const active = day.index === activeIndex;
          return (
            <button
              key={day.index}
              type="button"
              data-day={day.index}
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect(day.index)}
              className={cn(
                "min-w-[9rem] shrink-0 snap-start rounded-sm border px-3 py-2 text-left transition-colors duration-fast coarse:min-h-11",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active ? "border-primary bg-accent-soft" : "border-border bg-card hover:bg-muted",
              )}
            >
              <span className="block text-sm font-medium text-foreground">
                {format(day.date, "EEEEEE d MMM", { locale: nl })}
                {day.isToday && <span className="text-primary"> · vandaag</span>}
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                {day.count} onderde{day.count === 1 ? "el" : "len"}
                {day.status === "open" && <Pill tone="warning">{day.openCount} open</Pill>}
                {day.status === "waiting" && <Pill tone="info">wacht op {day.waitingCount}</Pill>}
                {day.status === "done" && <Check className="h-3.5 w-3.5 text-success" aria-label="rond" />}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
