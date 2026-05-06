import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiDatePicker } from "./MultiDatePicker";
import { ArrowRight, Users, Calendar } from "lucide-react";

export interface BasicsFormData {
  numberOfPeople: number;
  selectedDates: Date[];
}

interface BasicsFormProps {
  onSubmit: (data: BasicsFormData) => void;
  templateName?: string | null;
  templateDurationDays?: number | null;
}

export const BasicsForm = ({ onSubmit, templateName, templateDurationDays }: BasicsFormProps) => {
  const [numberOfPeople, setNumberOfPeople] = useState(20);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  const handleAddDate = (date: Date): boolean => {
    if (selectedDates.length >= 7) return false;
    const dateStr = date.toDateString();
    if (selectedDates.some(d => d.toDateString() === dateStr)) return false;
    setSelectedDates(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
    return true;
  };

  const handleRemoveDate = (dateIndex: number) => {
    setSelectedDates(prev => prev.filter((_, i) => i !== dateIndex));
  };

  const isValid = selectedDates.length > 0 && numberOfPeople >= 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({ numberOfPeople, selectedDates });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
          Hoeveel personen en welke datum(s)?
        </h2>
        <p className="text-muted-foreground">
          Daarna kunt u direct activiteiten toevoegen aan uw programma.
        </p>
      </div>

      {/* Group size */}
      <div className="space-y-2">
        <Label htmlFor="basics-people" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Aantal personen
        </Label>
        <Input
          id="basics-people"
          type="number"
          min={1}
          max={500}
          value={numberOfPeople}
          onChange={(e) => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
          required
          className="w-32"
        />
      </div>

      {/* Dates */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Datum(s)
        </Label>
        <p className="text-xs text-muted-foreground">
          Selecteer één of meerdere aaneensluitende dagen.
        </p>
        <MultiDatePicker
          selectedDates={selectedDates}
          onAddDate={handleAddDate}
          onRemoveDate={handleRemoveDate}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full gap-2 text-base"
        disabled={!isValid}
      >
        Stel uw programma samen
        <ArrowRight className="h-5 w-5" />
      </Button>
    </form>
  );
};
