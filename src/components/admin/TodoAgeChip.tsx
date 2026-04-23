import { useEffect, useState } from "react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Clock, AlarmClock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodoAgeThreshold } from "@/types/appSettings";

/**
 * Live age chip — automatically refreshes every 60s so the displayed
 * "X days ago" text stays current without a page reload.
 *
 * Color escalation thresholds are configurable per todo type via
 * the `todo_age_thresholds` app setting (admin → Instellingen).
 */

interface TodoAgeChipProps {
  /** ISO date string of when the todo was created */
  createdAt: string;
  /** Optional secondary anchor date (e.g. quote_sent_at, valid_until) */
  businessAnchor?: {
    date: string;
    /** Prefix shown before the relative time */
    label: string;
    /** When true, treat as a deadline ("verloopt over X") instead of age ("X geleden") */
    isDeadline?: boolean;
  };
  /** Configurable color escalation drempels (days). Defaults to 3/7 when omitted. */
  thresholds?: TodoAgeThreshold;
  className?: string;
}

const DEFAULT_THRESHOLDS: TodoAgeThreshold = { amber: 3, red: 7 };

export const TodoAgeChip = ({ createdAt, businessAnchor, thresholds, className }: TodoAgeChipProps) => {
  // Tick every 60s so labels stay live
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const t = thresholds ?? DEFAULT_THRESHOLDS;
  const ageDays = differenceInDays(new Date(), new Date(createdAt));
  // Color escalation: configurable per todo type
  const ageColor =
    ageDays >= t.red
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : ageDays >= t.amber
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-muted text-muted-foreground border-muted";

  const ageText = formatDistanceToNow(new Date(createdAt), { locale: nl, addSuffix: false });

  let businessText: string | null = null;
  let businessColor = "bg-slate-50 text-slate-600 border-slate-200";
  if (businessAnchor) {
    const anchorDate = new Date(businessAnchor.date);
    const days = differenceInDays(anchorDate, new Date());
    if (businessAnchor.isDeadline) {
      if (days < 0) {
        businessText = `${businessAnchor.label} ${Math.abs(days)} dagen geleden verlopen`;
        businessColor = "bg-red-50 text-red-700 border-red-200";
      } else if (days === 0) {
        businessText = `${businessAnchor.label} verloopt vandaag`;
        businessColor = "bg-red-50 text-red-700 border-red-200";
      } else {
        businessText = `${businessAnchor.label} verloopt over ${days} ${days === 1 ? "dag" : "dagen"}`;
        businessColor =
          days <= 2
            ? "bg-red-50 text-red-700 border-red-200"
            : days <= 5
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-slate-50 text-slate-600 border-slate-200";
      }
    } else {
      const ageDaysBusiness = -days;
      businessText = `${businessAnchor.label} ${formatDistanceToNow(anchorDate, { locale: nl, addSuffix: false })}`;
      businessColor =
        ageDaysBusiness >= t.red
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : ageDaysBusiness >= t.amber
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-muted text-muted-foreground border-muted";
    }
  }

  return (
    <span className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px] font-medium",
          ageColor,
        )}
        title={`Aangemaakt op ${new Date(createdAt).toLocaleString("nl-NL")}`}
      >
        <Clock className="h-2.5 w-2.5" />
        {ageText}
      </span>
      {businessText && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px] font-medium",
            businessColor,
          )}
        >
          <AlarmClock className="h-2.5 w-2.5" />
          {businessText}
        </span>
      )}
    </span>
  );
};
