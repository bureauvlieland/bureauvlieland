import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiDatePicker } from "./MultiDatePicker";
import { Users, Calendar, Eye, Ship, MapPin } from "lucide-react";
import { addDays } from "date-fns";
import type { GroupSituation } from "@/lib/programWizardCart";
import { FormField, OptionCard, OptionGroup, SectionHeader, WizardFooter } from "@/components/system";

export interface BasicsFormData {
  numberOfPeople: number;
  selectedDates: Date[];
  situation: GroupSituation;
}

interface BasicsFormProps {
  onSubmit: (data: BasicsFormData) => void;
  templateName?: string | null;
  templateDurationDays?: number | null;
  /** Eyebrow vóór de naam; standaard "Voorbeeldprogramma", "Referentie" voor "Zoiets ook?". */
  templateEyebrow?: string;
  /** Eigen intro bij een voorinvulling die geen voorbeeldprogramma is. */
  templateIntro?: string;
  initialSituation?: GroupSituation;
  initialNumberOfPeople?: number;
  /** Label van de volgende-knop, bijvoorbeeld "Volgende: voorbeeldprogramma's". */
  nextLabel?: string;
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
  templateEyebrow = "Voorbeeldprogramma",
  templateIntro,
  initialSituation = "vanaf_wal",
  initialNumberOfPeople = 20,
  nextLabel = "Volgende",
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
      <SectionHeader
        as="h2"
        size="md"
        weight="medium"
        align="center"
        eyebrow={templateName ? `${templateEyebrow} · ${templateName}` : undefined}
        title={templateName ? "Wanneer en met hoeveel personen?" : "Hoeveel personen en welke datum(s)?"}
        intro={
          templateName
            ? templateIntro ?? `Kies uw startdatum${templateDurationDays && templateDurationDays > 1 ? ` (${templateDurationDays} dagen worden automatisch ingevuld)` : ""} en aantal personen. Daarna laden wij dit programma voor u in.`
            : "Daarna kunt u direct activiteiten toevoegen aan uw programma."
        }
        className="mb-8"
      />

      <FormField label="Aantal personen" htmlFor="basics-people" required leading={<Users />}>
        <Input
          type="number"
          min={1}
          max={500}
          value={numberOfPeople}
          onChange={(e) => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
          required
          className="w-40"
        />
      </FormField>

      {/* Situatie: bepaalt welke stappen volgen (vervoer of startpunt) */}
      <OptionGroup label="Wat is de situatie?" name="Situatie van de groep" columns={2}>
        {SITUATION_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <OptionCard
              key={opt.value}
              selected={situation === opt.value}
              onSelect={() => setSituation(opt.value)}
              title={opt.label}
              description={opt.description}
              icon={<Icon />}
            />
          );
        })}
      </OptionGroup>

      {/* Dates */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Datum(s)
        </Label>
        <p className="text-xs text-muted-foreground">
          Selecteer één of meer aaneensluitende dagen, of sla over en kijk eerst rond.
        </p>
        <MultiDatePicker
          selectedDates={selectedDates}
          onAddDate={handleAddDate}
          onRemoveDate={handleRemoveDate}
        />
      </div>

      <WizardFooter nextType="submit" nextLabel={nextLabel} nextDisabled={!isValid} />

      {/* Skip-date escape hatch */}
      {canSkipDate && !templateName && (
        <button
          type="button"
          onClick={handleSkipDate}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          Ik weet de datum nog niet, laat me eerst rondkijken
        </button>
      )}
    </form>
  );
};
