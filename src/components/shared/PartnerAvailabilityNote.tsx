import { CalendarOff } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { PartnerAvailabilityNote as NoteData } from "@/hooks/usePublicPartnerUnavailability";

interface Props {
  note: NoteData | undefined;
  /** compact = één regel op een kaart, panel = nette notitie boven de knoppen */
  variant?: "compact" | "panel";
  className?: string;
}

const fmt = (iso: string) => {
  try {
    return format(parseISO(iso), "d MMMM", { locale: nl });
  } catch {
    return iso;
  }
};

/**
 * Subtiele melding dat de aanbieder in een bepaalde periode niet inzetbaar is.
 * Het aanbod blijft altijd zichtbaar en aanvraagbaar.
 */
export const PartnerAvailabilityNote = ({ note, variant = "compact", className }: Props) => {
  if (!note) return null;

  const period = `${fmt(note.start_date)} t/m ${fmt(note.end_date)}`;

  if (variant === "compact") {
    return (
      <p
        className={cn(
          "text-xs text-muted-foreground flex items-start gap-1.5",
          className,
        )}
      >
        <CalendarOff className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          {note.isCurrent
            ? `Aanbieder beperkt beschikbaar t/m ${fmt(note.end_date)}`
            : `Niet beschikbaar ${period}`}
        </span>
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground flex items-start gap-2.5",
        className,
      )}
    >
      <CalendarOff className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <p className="font-medium text-foreground">
          Deze aanbieder is {period} niet beschikbaar
        </p>
        <p className="mt-0.5">
          Buiten deze periode kunt u gewoon aanvragen — of vraag ons naar een
          alternatief.
        </p>
      </div>
    </div>
  );
};
