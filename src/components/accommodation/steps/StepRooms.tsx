import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BedDouble } from "lucide-react";
import { FormField, Notice, OptionCard, OptionGroup } from "@/components/system";
import type { AccommodationWizardData } from "@/types/accommodation";
import { ROOM_TYPES, ROOM_OCCUPANCY_OPTIONS } from "@/types/accommodation";

interface StepRoomsProps {
  formData: AccommodationWizardData;
  updateFormData: (updates: Partial<AccommodationWizardData>) => void;
}

export const StepRooms = ({ formData, updateFormData }: StepRoomsProps) => {
  // Camping en groepsaccommodatie: geen kamerindeling, dat regelt de locatie
  const showDetailedConfig = !["camping", "group_accommodation"].includes(formData.accommodation_type);

  const toggleRoomType = (value: string) => {
    const current = formData.room_types;
    const updated = current.includes(value)
      ? current.filter((t) => t !== value)
      : [...current, value];
    updateFormData({ room_types: updated });
  };

  const suggestedRooms = Math.ceil(formData.number_of_guests / (parseInt(formData.room_occupancy) || 2));

  return (
    <div className="space-y-6">
      {showDetailedConfig ? (
        <>
          <FormField
            label="Geschat aantal kamers"
            htmlFor="logies-kamers"
            required
            leading={<BedDouble />}
            help={`Suggestie: ${suggestedRooms} kamers voor ${formData.number_of_guests} personen.`}
          >
            <Input
              type="number"
              min={1}
              max={100}
              value={formData.room_count}
              onChange={(e) => updateFormData({ room_count: parseInt(e.target.value) || 1 })}
              className="w-40"
            />
          </FormField>

          <div className="space-y-1.5">
            <Label htmlFor="logies-bezetting">Bezetting per kamer</Label>
            <Select value={formData.room_occupancy} onValueChange={(value) => updateFormData({ room_occupancy: value })}>
              <SelectTrigger id="logies-bezetting" className="w-full sm:w-64">
                <SelectValue placeholder="Kies" />
              </SelectTrigger>
              <SelectContent>
                {ROOM_OCCUPANCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <OptionGroup label="Voorkeur kamertype" help="Optioneel, meerdere keuzes mogelijk." selection="multiple" columns={2}>
            {ROOM_TYPES.map((type) => (
              <OptionCard
                key={type.value}
                selection="multiple"
                selected={formData.room_types.includes(type.value)}
                onSelect={() => toggleRoomType(type.value)}
                title={type.label}
              />
            ))}
          </OptionGroup>
        </>
      ) : (
        <>
          <Notice tone="info">
            {formData.accommodation_type === "camping"
              ? `Voor een campingverblijf bepalen wij samen met de camping de beste indeling voor uw groep van ${formData.number_of_guests} personen.`
              : `Voor groepsaccommodaties bekijken wij welke locaties geschikt zijn voor uw groep van ${formData.number_of_guests} personen.`}
          </Notice>

          <FormField label="Aantal slaapruimtes" htmlFor="logies-slaapruimtes" help="Als u het al weet.">
            <Input
              type="number"
              min={1}
              max={50}
              value={formData.room_count}
              onChange={(e) => updateFormData({ room_count: parseInt(e.target.value) || 1 })}
              className="w-40"
              placeholder="Optioneel"
            />
          </FormField>
        </>
      )}

      <Notice tone="info" title="Toegankelijkheid">
        Heeft uw groep specifieke wensen rond toegankelijkheid? Vermeld dit in de volgende stap bij "Extra wensen".
      </Notice>
    </div>
  );
};
