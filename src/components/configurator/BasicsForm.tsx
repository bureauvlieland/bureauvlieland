import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiDatePicker } from "./MultiDatePicker";
import { ArrowRight, Users, Calendar, Eye, Ship, MapPin } from "lucide-react";
import { addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { GroupSituation } from "@/lib/programWizardCart";

export interface BasicsFormData {
  numberOfPeople: number;
  selectedDates: Date[];
  situation: GroupSituation;
}

interface BasicsFormProps {
  onSubmit: (data: BasicsFormData) => void;
  templateName?: string | null;
  templateDurationDays?: number | null;
  initialSituation?: GroupSituation;
  initialNumberOfPeople?: number;
}

const SITUATION_OPTIONS: { value: GroupSituation; label: string; description: string; icon: typeof Ship }[] = [
  {
    value: "vanaf_wal",
    label: "Wij komen vanaf de wal",
    description: "Voor één of meer dagen. Wij regelen desgewenst de overtocht en fietsen.",
    icon: Ship,
  },
  {
    value: "op_vlieland",
    label: "Wij zijn al op Vlieland",
    description: "U verblijft al op het eiland en wilt een dag of dagdeel programma.",
    icon: MapPin,
  },
];

export const BasicsForm = ({
  onSubmit,
  templateName,
  templateDurationDays,
  initialSituation = "vanaf_wal",
  initialNumberOfPeople = 20,
}: BasicsFormProps) => {
  const [numberOfPeople, setNumberOfPeople] = useState(initialNumberOfPeople);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [situation, setSituation] = useState<GroupSituation>(initialSituation);

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
  const canSkipDate = numberOfPeople >= 1 && selectedDates.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({ numberOfPeople, selectedDates, situation });
  };

  const handleSkipDate = () => {
    // Placeholder date: 30 days from now. User can adjust later via "Programma details bewerken".
    const placeholder = addDays(new Date(), 30);
    onSubmit({ numberOfPeople, selectedDates: [placeholder], situation });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
      <div className="text-center mb-8">
        {templateName && (
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3 font-semibold">
            Voorbeeldprogramma · {templateName}
          </p>
        )}
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
          {templateName ? "Wanneer en met hoeveel personen?" : "Hoeveel personen en welke datum(s)?"}
        </h2>
        <p className="text-muted-foreground">
          {templateName
            ? `Kies uw startdatum${templateDurationDays && templateDurationDays > 1 ? ` (${templateDurationDays} dagen worden automatisch ingevuld)` : ""} en aantal personen. Daarna laden wij dit programma voor u in.`
            : "Daarna kunt u direct activiteiten toevoegen aan uw programma."}
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

      {/* Situation: bepaalt welke stappen volgen (vervoer of startpunt) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Wat is de situatie?
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Situatie van de groep">
          {SITUATION_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = situation === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSituation(opt.value)}
                className={cn(
                  "w-full text-left p-3 rounded-md border-2 transition-all flex items-start gap-2.5",
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  <span className="block font-medium text-sm">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Datum(s)
        </Label>
        <p className="text-xs text-muted-foreground">
          Selecteer één of meerdere aaneensluitende dagen — of sla over en kijk eerst rond.
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

      {/* Skip-date escape hatch */}
      {canSkipDate && !templateName && (
        <button
          type="button"
          onClick={handleSkipDate}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <Eye className="h-4 w-4" />
          Ik weet de datum nog niet — laat me eerst rondkijken
        </button>
      )}
    </form>
  );
};
