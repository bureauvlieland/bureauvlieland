import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

const MAX_DAYS = 7;

interface MultiDatePickerProps {
  selectedDates: Date[];
  onAddDate: (date: Date) => boolean;
  onRemoveDate: (dateIndex: number) => void;
}

export const MultiDatePicker = ({
  selectedDates,
  onAddDate,
  onRemoveDate,
}: MultiDatePickerProps) => {
  const canAddMore = selectedDates.length < MAX_DAYS;

  // Disable dates that are already selected or in the past
  const disabledDates = (date: Date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    return selectedDates.some(d => d.toDateString() === date.toDateString());
  };

  return (
    <div className="space-y-2">
      {/* Selected dates as chips */}
      {selectedDates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedDates.map((date, index) => (
            <div
              key={date.toISOString()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium"
            >
              <span className="text-xs text-primary/70">Dag {index + 1}:</span>
              <span>{format(date, "d MMM", { locale: nl })}</span>
              <button
                onClick={() => onRemoveDate(index)}
                className="ml-1 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                aria-label={`Verwijder ${format(date, "d MMMM", { locale: nl })}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add date button/picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2",
              !canAddMore && "opacity-50 cursor-not-allowed"
            )}
            disabled={!canAddMore}
          >
            {selectedDates.length === 0 ? (
              <>
                <CalendarIcon className="h-4 w-4" />
                Selecteer datum
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Dag toevoegen
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
          <Calendar
            mode="single"
            selected={undefined}
            onSelect={(date) => date && onAddDate(date)}
            disabled={disabledDates}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Max days info */}
      {!canAddMore && (
        <p className="text-xs text-muted-foreground">
          Maximum van {MAX_DAYS} dagen bereikt
        </p>
      )}
    </div>
  );
};
