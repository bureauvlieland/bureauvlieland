import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { AccommodationWizardData } from "@/types/accommodation";
import { LOCATION_PREFERENCES, FACILITIES, BUDGET_RANGES } from "@/types/accommodation";

interface StepWishesProps {
  formData: AccommodationWizardData;
  updateFormData: (updates: Partial<AccommodationWizardData>) => void;
}

export const StepWishes = ({ formData, updateFormData }: StepWishesProps) => {
  const toggleLocation = (value: string) => {
    const current = formData.location_preference;
    const updated = current.includes(value)
      ? current.filter((l) => l !== value)
      : [...current, value];
    updateFormData({ location_preference: updated });
  };

  const toggleFacility = (value: string) => {
    const current = formData.facilities_required;
    const updated = current.includes(value)
      ? current.filter((f) => f !== value)
      : [...current, value];
    updateFormData({ facilities_required: updated });
  };

  return (
    <div className="space-y-6">
      {/* Location Preference */}
      <div className="space-y-3">
        <Label>Locatievoorkeur</Label>
        <div className="grid grid-cols-2 gap-3">
          {LOCATION_PREFERENCES.map((loc) => (
            <button
              key={loc.value}
              type="button"
              onClick={() => toggleLocation(loc.value)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                formData.location_preference.includes(loc.value)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-xl">{loc.icon}</span>
              <span className="text-sm font-medium">{loc.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Facilities */}
      <div className="space-y-3">
        <Label>Gewenste faciliteiten</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FACILITIES.map((facility) => (
            <label
              key={facility.value}
              className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={formData.facilities_required.includes(facility.value)}
                onCheckedChange={() => toggleFacility(facility.value)}
              />
              <span className="text-sm">{facility.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-3">
        <Label>Budget indicatie</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Prijs per persoon per nacht (p.p.p.n.)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BUDGET_RANGES.map((budget) => (
            <button
              key={budget.value}
              type="button"
              onClick={() => updateFormData({ budget_range: budget.value })}
              className={cn(
                "p-3 rounded-lg border-2 text-sm transition-all",
                formData.budget_range === budget.value
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/50"
              )}
            >
              {budget.label}
            </button>
          ))}
        </div>
      </div>

      {/* Special Requests */}
      <div className="space-y-2">
        <Label htmlFor="special">Extra wensen (optioneel)</Label>
        <Textarea
          id="special"
          placeholder="Bijvoorbeeld: rolstoeltoegankelijke kamers, specifieke dieetwensen, huisdieren meenemen, vergaderruimte nodig..."
          value={formData.special_requests}
          onChange={(e) => updateFormData({ special_requests: e.target.value })}
          rows={4}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground text-right">
          {formData.special_requests.length}/1000
        </p>
      </div>
    </div>
  );
};
