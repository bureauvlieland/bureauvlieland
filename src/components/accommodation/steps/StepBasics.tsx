import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Users, Moon } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FormField, Notice } from "@/components/system";
import type { AccommodationWizardData } from "@/types/accommodation";

interface StepBasicsProps {
  formData: AccommodationWizardData;
  updateFormData: (updates: Partial<AccommodationWizardData>) => void;
}

const requiredMark = (
  <span className="text-destructive" aria-hidden="true">
    *
  </span>
);

export const StepBasics = ({ formData, updateFormData }: StepBasicsProps) => {
  const minDate = addDays(new Date(), 7);
  const nights = formData.arrival_date && formData.departure_date
    ? differenceInDays(formData.departure_date, formData.arrival_date)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="logies-aankomst" className="flex items-center gap-1">
            Aankomstdatum
            {requiredMark}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="logies-aankomst"
                type="button"
                variant="outline"
                className={cn("w-full justify-start font-normal", !formData.arrival_date && "text-muted-foreground")}
              >
                <CalendarIcon aria-hidden="true" />
                {formData.arrival_date ? format(formData.arrival_date, "d MMMM yyyy", { locale: nl }) : "Kies een datum"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.arrival_date}
                onSelect={(date) => {
                  updateFormData({ arrival_date: date });
                  // Vertrek automatisch zetten als die ontbreekt of vóór de nieuwe aankomst ligt
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

        <div className="space-y-1.5">
          <Label htmlFor="logies-vertrek" className="flex items-center gap-1">
            Vertrekdatum
            {requiredMark}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="logies-vertrek"
                type="button"
                variant="outline"
                className={cn("w-full justify-start font-normal", !formData.departure_date && "text-muted-foreground")}
              >
                <CalendarIcon aria-hidden="true" />
                {formData.departure_date ? format(formData.departure_date, "d MMMM yyyy", { locale: nl }) : "Kies een datum"}
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

      {nights > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Moon className="h-4 w-4" aria-hidden="true" />
          {nights} {nights === 1 ? "nacht" : "nachten"} verblijf
        </p>
      )}

      <FormField
        label="Aantal personen"
        htmlFor="logies-personen"
        required
        leading={<Users />}
        help="Voor groepen groter dan 50 personen nemen wij persoonlijk contact met u op."
      >
        <Input
          type="number"
          min={1}
          max={200}
          value={formData.number_of_guests}
          onChange={(e) => updateFormData({ number_of_guests: parseInt(e.target.value) || 1 })}
          className="w-40"
        />
      </FormField>

      {formData.arrival_date && <Notice tone="info">{getSeasonHint(formData.arrival_date)}</Notice>}
    </div>
  );
};

function getSeasonHint(date: Date): string {
  const month = date.getMonth();

  if (month >= 5 && month <= 7) {
    return "In de zomermaanden is Vlieland populair. Vroeg aanvragen is aan te raden.";
  } else if (month >= 3 && month <= 4) {
    return "Het voorjaar is ideaal voor teambuilding: goede beschikbaarheid en aangename temperaturen.";
  } else if (month >= 8 && month <= 10) {
    return "Het najaar biedt rust en ruimte. Een goede periode voor heisessies en bezinning.";
  } else {
    return "De winter op Vlieland is rustig en authentiek. Ideaal voor kleinere groepen.";
  }
}
