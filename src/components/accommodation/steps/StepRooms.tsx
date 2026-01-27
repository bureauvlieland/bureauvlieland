import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BedDouble, Users } from "lucide-react";
import type { AccommodationWizardData } from "@/types/accommodation";
import { ROOM_TYPES, ROOM_OCCUPANCY_OPTIONS } from "@/types/accommodation";

interface StepRoomsProps {
  formData: AccommodationWizardData;
  updateFormData: (updates: Partial<AccommodationWizardData>) => void;
}

export const StepRooms = ({ formData, updateFormData }: StepRoomsProps) => {
  // Skip detailed room config for camping/group accommodation
  const showDetailedConfig = !['camping', 'group_accommodation'].includes(formData.accommodation_type);

  const toggleRoomType = (value: string) => {
    const current = formData.room_types;
    const updated = current.includes(value)
      ? current.filter((t) => t !== value)
      : [...current, value];
    updateFormData({ room_types: updated });
  };

  // Calculate suggested room count
  const suggestedRooms = Math.ceil(formData.number_of_guests / (parseInt(formData.room_occupancy) || 2));

  return (
    <div className="space-y-6">
      {showDetailedConfig ? (
        <>
          {/* Room Count */}
          <div className="space-y-2">
            <Label htmlFor="roomCount">Geschat aantal kamers *</Label>
            <div className="flex items-center gap-3">
              <BedDouble className="h-5 w-5 text-muted-foreground" />
              <Input
                id="roomCount"
                type="number"
                min={1}
                max={100}
                value={formData.room_count}
                onChange={(e) => updateFormData({ room_count: parseInt(e.target.value) || 1 })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">kamers</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Suggestie: {suggestedRooms} kamers voor {formData.number_of_guests} personen
            </p>
          </div>

          {/* Room Occupancy */}
          <div className="space-y-2">
            <Label>Bezetting per kamer</Label>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <Select
                value={formData.room_occupancy}
                onValueChange={(value) => updateFormData({ room_occupancy: value })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecteer" />
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
          </div>

          {/* Room Types */}
          <div className="space-y-3">
            <Label>Voorkeur kamertype (optioneel)</Label>
            <div className="grid grid-cols-2 gap-3">
              {ROOM_TYPES.map((type) => (
                <label
                  key={type.value}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={formData.room_types.includes(type.value)}
                    onCheckedChange={() => toggleRoomType(type.value)}
                  />
                  <span className="text-sm">{type.label}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Simplified view for camping/group */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm">
              {formData.accommodation_type === 'camping' ? (
                <>
                  ⛺ Voor campingverblijf bepalen wij samen met de camping de beste indeling 
                  voor uw groep van {formData.number_of_guests} personen.
                </>
              ) : (
                <>
                  🏕️ Voor groepsaccommodaties bekijken wij welke locaties geschikt zijn 
                  voor uw groep van {formData.number_of_guests} personen.
                </>
              )}
            </p>
          </div>

          {/* Still allow noting preferences */}
          <div className="space-y-2">
            <Label htmlFor="roomCount">Aantal slaapruimtes (indien bekend)</Label>
            <Input
              id="roomCount"
              type="number"
              min={1}
              max={50}
              value={formData.room_count}
              onChange={(e) => updateFormData({ room_count: parseInt(e.target.value) || 1 })}
              className="w-24"
              placeholder="Optioneel"
            />
          </div>
        </>
      )}

      {/* Accessibility note */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm">
          ♿ <strong>Toegankelijkheid:</strong> Heeft uw groep specifieke wensen rond 
          toegankelijkheid? Vermeld dit in de volgende stap bij "Extra wensen".
        </p>
      </div>
    </div>
  );
};
