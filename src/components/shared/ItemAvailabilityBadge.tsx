import { CalendarOff, Users, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItemAvailability } from "@/lib/programAvailability";

interface Props {
  availability: ItemAvailability | undefined;
  /** Ook "beschikbaar" tonen (standaard alleen problemen). */
  showAvailable?: boolean;
  className?: string;
}

/**
 * Eén regel onder een programmaonderdeel: gesloten aanbieder, te grote of te
 * kleine groep. Nooit een blokkade; het bureau kan altijd bellen.
 */
export const ItemAvailabilityBadge = ({ availability, showAvailable = false, className }: Props) => {
  if (!availability) return null;
  if (availability.status === "onbekend") return null;
  if (availability.status === "beschikbaar") {
    if (!showAvailable) return null;
    return (
      <p className={cn("text-xs text-muted-foreground flex items-start gap-1.5", className)}>
        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
        <span>Beschikbaar op uw datum</span>
      </p>
    );
  }
  const closed = availability.status === "partner_gesloten";
  return (
    <p
      className={cn(
        "text-xs flex items-start gap-1.5",
        closed ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground",
        className,
      )}
    >
      {closed ? (
        <CalendarOff className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      ) : (
        <Users className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      )}
      <span>{availability.message}</span>
    </p>
  );
};
