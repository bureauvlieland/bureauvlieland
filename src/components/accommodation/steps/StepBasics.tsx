import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Users, Moon } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { AccommodationWizardData } from "@/types/accommodation";

interface StepBasicsProps {
  formData: AccommodationWizardData;
  updateFormData: (updates: Partial<AccommodationWizardData>) => void;
}

export const StepBasics = ({ formData, updateFormData }: StepBasicsProps) => {
  const minDate = addDays(new Date(), 7);
  const nights = formData.arrival_date && formData.departure_date
    ? differenceInDays(formData.departure_date, formData.arrival_date)
    : 0;

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Aankomstdatum *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.arrival_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.arrival_date ? (
                  format(formData.arrival_date, "d MMMM yyyy", { locale: nl })
                ) : (
                  "Selecteer datum"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.arrival_date}
                onSelect={(date) => {
                  updateFormData({ arrival_date: date });
                  // Auto-set departure if not set or before new arrival
                  if (date && (!formData.departure_date || formData.departure_date <= date)) {
                    updateFormData({ departure_date: addDays(date, 2) });
                  }
                }}
                disabled={(date) => date < minDate}
                initialFocus
                locale={nl}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Vertrekdatum *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.departure_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.departure_date ? (
                  format(formData.departure_date, "d MMMM yyyy", { locale: nl })
                ) : (
                  "Selecteer datum"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.departure_date}
                onSelect={(date) => updateFormData({ departure_date: date })}
                disabled={(date) => 
                  date < minDate || 
                  (formData.arrival_date ? date <= formData.arrival_date : false)
                }
                initialFocus
                locale={nl}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Nights indicator */}
      {nights > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Moon className="h-4 w-4" />
          <span>
            {nights} {nights === 1 ? "nacht" : "nachten"} verblijf
          </span>
        </div>
      )}

      {/* Number of Guests */}
      <div className="space-y-2">
        <Label htmlFor="guests">Aantal personen *</Label>
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <Input
            id="guests"
            type="number"
            min={1}
            max={200}
            value={formData.number_of_guests}
            onChange={(e) => updateFormData({ number_of_guests: parseInt(e.target.value) || 1 })}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">personen</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Voor groepen groter dan 50 personen nemen wij persoonlijk contact met u op.
        </p>
      </div>

      {/* Season hint */}
      {formData.arrival_date && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm">
            💡 <strong>Tip:</strong> {getSeasonHint(formData.arrival_date)}
          </p>
        </div>
      )}
    </div>
  );
};

function getSeasonHint(date: Date): string {
  const month = date.getMonth();
  
  if (month >= 5 && month <= 7) {
    return "In de zomermaanden is Vlieland populair. Vroeg boeken is aan te raden!";
  } else if (month >= 3 && month <= 4) {
    return "Het voorjaar is ideaal voor teambuilding. Goede beschikbaarheid en aangename temperaturen.";
  } else if (month >= 8 && month <= 10) {
    return "Het najaar biedt rust en ruimte. Perfecte periode voor heisessies en bezinning.";
  } else {
    return "De winter op Vlieland is rustig en authentiek. Ideaal voor kleinere groepen.";
  }
}
