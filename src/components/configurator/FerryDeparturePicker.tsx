import { useFerryDepartures, type FerryDeparture } from "@/hooks/useFerryDepartures";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Ship, Check, Loader2, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FerryDeparturePickerProps {
  portFrom: string;
  portTo: string;
  date: Date;
  selectedTime: string | null;
  onSelect: (departureTime: string) => void;
  hasError?: boolean;
}

const portLabels: Record<string, string> = {
  H: "Harlingen",
  V: "Vlieland",
  T: "Terschelling",
};

export const FerryDeparturePicker = ({
  portFrom,
  portTo,
  date,
  selectedTime,
  onSelect,
  hasError = false,
}: FerryDeparturePickerProps) => {
  const dateStr = format(date, "yyyy-MM-dd");

  const { data: departures, isLoading, error } = useFerryDepartures({
    from: portFrom,
    to: portTo,
    date: dateStr,
    enabled: true,
  });

  const fromLabel = portLabels[portFrom] ?? portFrom;
  const toLabel = portLabels[portTo] ?? portTo;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 px-1">
        <Loader2 className="h-4 w-4 animate-spin" />
        Afvaarten ophalen…
      </div>
    );
  }

  if (error || !departures) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 px-1">
        <AlertCircle className="h-4 w-4" />
        Kon afvaarten niet laden
      </div>
    );
  }

  if (departures.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-3 px-1">
        Geen afvaarten gevonden op {format(date, "EEE d MMMM", { locale: nl })}.
      </p>
    );
  }

  const isFlexibel = selectedTime === "flexibel";

  return (
    <div className={cn("space-y-1.5 rounded-md", hasError && !selectedTime && "ring-2 ring-destructive/50 p-2 -m-2")}>
      <p className="text-xs font-medium text-muted-foreground px-1">
        {fromLabel} → {toLabel} · {format(date, "EEE d MMMM", { locale: nl })}
      </p>
      {hasError && !selectedTime && (
        <p className="text-xs text-destructive px-1">Kies een afvaarttijd of selecteer "Weet ik nog niet"</p>
      )}
      <div className="grid gap-1.5">
        {departures.map((dep) => {
          const depTime = dep.departureTime.slice(11, 16);
          const arrTime = dep.arrivalTime.slice(11, 16);
          const isSelected = selectedTime === depTime;

          return (
            <button
              key={dep.departureTime}
              type="button"
              onClick={() => onSelect(depTime)}
              className={cn(
                "flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors text-left",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              <Ship className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <span className="font-medium">{depTime}</span>
                <span className="text-muted-foreground"> → {arrTime}</span>
                {dep.vehicleName && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    ({dep.vehicleName})
                  </span>
                )}
              </div>
              {dep.remainingPersonCapacity !== null && dep.remainingPersonCapacity > 0 && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {dep.remainingPersonCapacity} plaatsen
                </span>
              )}
              {isSelected && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </button>
          );
        })}

        {/* "Weet ik nog niet" option */}
        <button
          type="button"
          onClick={() => onSelect("flexibel")}
          className={cn(
            "flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors text-left",
            isFlexibel
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-dashed border-border hover:border-primary/40 hover:bg-muted/50"
          )}
        >
          <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={cn("flex-1", isFlexibel && "font-medium")}>Weet ik nog niet</span>
          {isFlexibel && (
            <Check className="h-4 w-4 text-primary shrink-0" />
          )}
        </button>
      </div>
    </div>
  );
};
