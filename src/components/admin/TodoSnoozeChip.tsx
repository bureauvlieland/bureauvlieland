import { useEffect, useState } from "react";
import { formatDistanceToNow, differenceInDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import { Moon, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Snooze chip — shows how long a todo has been snoozed and when it returns.
 * Auto-refreshes every 60s to keep relative times current.
 */

interface TodoSnoozeChipProps {
  /** ISO date string of when the todo was snoozed until */
  snoozedUntil: string;
  /** Optional ISO date string of when the todo was snoozed (for calculating duration) */
  snoozedAt?: string | null;
  className?: string;
}

export const TodoSnoozeChip = ({ snoozedUntil, snoozedAt, className }: TodoSnoozeChipProps) => {
  // Tick every 60s so labels stay live
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const snoozeEnd = new Date(snoozedUntil);
  const now = new Date();
  const daysUntil = differenceInDays(snoozeEnd, now);

  // Color based on urgency
  const colorClass =
    daysUntil < 0
      ? "bg-red-50 text-red-700 border-red-200" // Overdue (shouldn't happen with filter)
      : daysUntil === 0
        ? "bg-amber-50 text-amber-700 border-amber-200" // Returns today
        : daysUntil <= 2
          ? "bg-blue-50 text-blue-700 border-blue-200" // Returns soon
          : "bg-purple-50 text-purple-700 border-purple-200"; // Snoozed for longer

  // Text for when it returns
  let returnText: string;
  if (daysUntil < 0) {
    returnText = "Had al teruggekomen";
  } else if (daysUntil === 0) {
    returnText = "Komt vandaag terug";
  } else {
    returnText = `Komt terug over ${daysUntil} ${daysUntil === 1 ? "dag" : "dagen"}`;
  }

  // Calculate how long it's been snoozed (if we have snoozed_at)
  let snoozeDurationText: string | null = null;
  if (snoozedAt) {
    const snoozeStart = new Date(snoozedAt);
    const snoozedDays = differenceInDays(now, snoozeStart);
    if (snoozedDays === 0) {
      snoozeDurationText = "Vandaag gesnoozed";
    } else {
      snoozeDurationText = `${snoozedDays} ${snoozedDays === 1 ? "dag" : "dagen"} gesnoozed`;
    }
  }

  return (
    <span className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px] font-medium",
          colorClass,
        )}
        title={`Gesnoozed tot ${format(snoozeEnd, "EEEE d MMMM yyyy", { locale: nl })}`}
      >
        <Moon className="h-2.5 w-2.5" />
        {returnText}
      </span>
      {snoozeDurationText && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px] font-medium bg-slate-50 text-slate-600 border-slate-200",
          )}
          title={snoozedAt ? `Gesnoozed op ${format(new Date(snoozedAt), "EEEE d MMMM yyyy", { locale: nl })}` : undefined}
        >
          <CalendarClock className="h-2.5 w-2.5" />
          {snoozeDurationText}
        </span>
      )}
    </span>
  );
};
