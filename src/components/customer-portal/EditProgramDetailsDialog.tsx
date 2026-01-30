import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, isBefore, startOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon, X, AlertTriangle, Users, Loader2 } from "lucide-react";

const MAX_DAYS = 7;

interface EditProgramDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDates: Date[];
  numberOfPeople: number;
  hasActiveAccommodation?: boolean;
  onSave: (updates: { selectedDates?: Date[]; numberOfPeople?: number }) => Promise<boolean>;
}

export const EditProgramDetailsDialog = ({
  isOpen,
  onClose,
  selectedDates: initialDates,
  numberOfPeople: initialPeople,
  hasActiveAccommodation = false,
  onSave,
}: EditProgramDetailsDialogProps) => {
  const [dates, setDates] = useState<Date[]>(initialDates);
  const [people, setPeople] = useState(initialPeople);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const hasDateChanges = JSON.stringify(dates.map(d => d.toISOString().split("T")[0])) !== 
    JSON.stringify(initialDates.map(d => d.toISOString().split("T")[0]));
  const hasPeopleChanges = people !== initialPeople;
  const hasChanges = hasDateChanges || hasPeopleChanges;

  const handleAddDate = (date: Date | undefined) => {
    if (!date || dates.length >= MAX_DAYS) return;
    const exists = dates.some(d => 
      d.toISOString().split("T")[0] === date.toISOString().split("T")[0]
    );
    if (!exists) {
      setDates([...dates, date].sort((a, b) => a.getTime() - b.getTime()));
      setCalendarOpen(false);
    }
  };

  const handleRemoveDate = (index: number) => {
    if (dates.length > 1) {
      setDates(dates.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    const updates: { selectedDates?: Date[]; numberOfPeople?: number } = {};
    if (hasDateChanges) updates.selectedDates = dates;
    if (hasPeopleChanges) updates.numberOfPeople = people;
    
    const success = await onSave(updates);
    setIsSubmitting(false);
    
    if (success) {
      onClose();
    }
  };

  const handleClose = () => {
    // Reset to initial values
    setDates(initialDates);
    setPeople(initialPeople);
    onClose();
  };

  const disabledDates = (date: Date) => {
    const isPast = isBefore(date, startOfDay(new Date()));
    const isSelected = dates.some(d => 
      d.toISOString().split("T")[0] === date.toISOString().split("T")[0]
    );
    return isPast || isSelected;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Programma details bewerken</DialogTitle>
          <DialogDescription>
            Pas de datum(s) en/of het aantal personen aan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Number of people */}
          <div className="space-y-2">
            <Label htmlFor="people" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Aantal personen
            </Label>
            <Input
              id="people"
              type="number"
              min={1}
              max={500}
              value={people}
              onChange={(e) => setPeople(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-32"
            />
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Datum(s)
            </Label>
            
            {/* Selected dates as chips */}
            <div className="flex flex-wrap gap-2">
              {dates.map((date, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 rounded-full text-sm"
                >
                  <span>{format(date, "d MMM yyyy", { locale: nl })}</span>
                  {dates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDate(index)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add date button */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={dates.length >= MAX_DAYS}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Dag toevoegen
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  onSelect={handleAddDate}
                  disabled={disabledDates}
                  initialFocus
                  locale={nl}
                />
              </PopoverContent>
            </Popover>

            {dates.length >= MAX_DAYS && (
              <p className="text-xs text-muted-foreground">
                Maximum van {MAX_DAYS} dagen bereikt
              </p>
            )}
          </div>

          {/* Warning when changes detected */}
          {hasChanges && (
            <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {hasDateChanges && hasPeopleChanges 
                  ? `Bij wijziging van datum en aantal worden alle aanbieders opnieuw gecontacteerd voor beschikbaarheid.${hasActiveAccommodation ? " Ook de logiesaanbieders worden geïnformeerd." : ""}`
                  : hasDateChanges 
                    ? `Bij datumwijziging worden alle aanbieders opnieuw gecontacteerd voor beschikbaarheid.${hasActiveAccommodation ? " Ook de logiesaanbieders worden geïnformeerd." : ""}`
                    : "De aanbieders worden op de hoogte gesteld van het gewijzigde aantal personen."
                }
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
