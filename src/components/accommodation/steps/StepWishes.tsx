import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AccommodationWizardData } from "@/types/accommodation";
import { LOCATION_PREFERENCES, BUDGET_RANGES } from "@/types/accommodation";

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


      {/* Verzorging */}
      <div className="space-y-3">
        <Label>Welke verzorging wenst u?</Label>
        <p className="text-xs text-muted-foreground">
          Zo weten de accommodaties direct of u alleen wilt overnachten of ook maaltijden wenst.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BOARD_PREFERENCE_OPTIONS.map((board) => (
            <button
              key={board.value}
              type="button"
              onClick={() => updateFormData({ board_preference: board.value })}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 text-left text-sm transition-all",
                formData.board_preference === board.value
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-xl">{board.icon}</span>
              <span>{board.label}</span>
            </button>
          ))}
        </div>
      </div>


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
