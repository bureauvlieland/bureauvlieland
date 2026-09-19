import { Textarea } from "@/components/ui/textarea";
import { FormField, OptionCard, OptionGroup } from "@/components/system";
import type { AccommodationWizardData } from "@/types/accommodation";
import { LOCATION_PREFERENCES, BUDGET_RANGES, BOARD_PREFERENCE_OPTIONS } from "@/types/accommodation";
import { boardIcon, locationIcon } from "@/lib/accommodationIcons";

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
      <OptionGroup label="Locatievoorkeur" help="Meerdere keuzes mogelijk." selection="multiple" columns={4}>
        {LOCATION_PREFERENCES.map((loc) => {
          const Icon = locationIcon(loc.value);
          return (
            <OptionCard
              key={loc.value}
              selection="multiple"
              selected={formData.location_preference.includes(loc.value)}
              onSelect={() => toggleLocation(loc.value)}
              title={loc.label}
              icon={<Icon />}
              align="center"
            />
          );
        })}
      </OptionGroup>

      <OptionGroup
        label="Welke verzorging wenst u?"
        help="Zo weten de accommodaties direct of u alleen wilt overnachten of ook maaltijden wenst."
        columns={2}
      >
        {BOARD_PREFERENCE_OPTIONS.map((board) => {
          const Icon = boardIcon(board.value);
          return (
            <OptionCard
              key={board.value}
              selected={formData.board_preference === board.value}
              onSelect={() => updateFormData({ board_preference: board.value })}
              title={board.label}
              icon={<Icon />}
            />
          );
        })}
      </OptionGroup>

      <OptionGroup label="Budget per persoon per nacht" columns={3}>
        {BUDGET_RANGES.map((budget) => (
          <OptionCard
            key={budget.value}
            selected={formData.budget_range === budget.value}
            onSelect={() => updateFormData({ budget_range: budget.value })}
            title={budget.label}
            align="center"
          />
        ))}
      </OptionGroup>

      <FormField label="Extra wensen" htmlFor="logies-wensen" help={`${formData.special_requests.length}/1000 tekens`}>
        <Textarea
          placeholder="Bijvoorbeeld rolstoeltoegankelijke kamers, dieetwensen, huisdieren, een vergaderruimte"
          value={formData.special_requests}
          onChange={(e) => updateFormData({ special_requests: e.target.value })}
          rows={4}
          maxLength={1000}
        />
      </FormField>
    </div>
  );
};
