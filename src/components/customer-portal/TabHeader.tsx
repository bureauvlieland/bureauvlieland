import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  badge?: { label: string; variant?: "default" | "secondary" | "outline" | "destructive" };
  selectedDates?: Date[];
  numberOfPeople?: number;
  referenceNumber?: string | null;
  className?: string;
}

/**
 * Per-tab header. Geeft de klant direct context over WAT deze tab is en
 * wat de status van dít specifieke onderwerp is. Vervangt de generieke
 * "Uw aanvraag" / "Uw voorstel" blokken die voorheen op elke tab herhaald
 * werden.
 */
export const TabHeader = ({
  icon: Icon,
  title,
  subtitle,
  badge,
  selectedDates,
  numberOfPeople,
  referenceNumber,
  className,
}: TabHeaderProps) => {
  const dateRange =
    selectedDates && selectedDates.length > 0
      ? selectedDates.length === 1
        ? format(selectedDates[0], "EEE d MMM yyyy", { locale: nl })
        : `${format(selectedDates[0], "d MMM", { locale: nl })} – ${format(
            selectedDates[selectedDates.length - 1],
            "d MMM yyyy",
            { locale: nl },
          )}`
      : null;

  const showChips = !!(dateRange || numberOfPeople || referenceNumber);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
        {badge && (
          <Badge variant={badge.variant ?? "secondary"} className="shrink-0 mt-1">
            {badge.label}
          </Badge>
        )}
      </div>

      {showChips && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pl-[52px]">
          {dateRange && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {dateRange}
            </span>
          )}
          {numberOfPeople ? (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {numberOfPeople} personen
            </span>
          ) : null}
          {referenceNumber && (
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" />
              {referenceNumber}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
