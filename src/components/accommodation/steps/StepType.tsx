import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AccommodationWizardData, AccommodationType } from "@/types/accommodation";
import { ACCOMMODATION_TYPES } from "@/types/accommodation";

interface StepTypeProps {
  formData: AccommodationWizardData;
  updateFormData: (updates: Partial<AccommodationWizardData>) => void;
}

export const StepType = ({ formData, updateFormData }: StepTypeProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Wat voor verblijf zoekt u? *</Label>
        <p className="text-sm text-muted-foreground">
          Kies het type accommodatie dat het beste bij uw groep past.
        </p>
      </div>

      <div className="grid gap-3">
        {ACCOMMODATION_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => updateFormData({ accommodation_type: type.value as AccommodationType })}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all",
              formData.accommodation_type === type.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <span className="text-3xl">{type.icon}</span>
            <div className="flex-1">
              <p className="font-medium">{type.label}</p>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </div>
            {formData.accommodation_type === type.value && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Type-specific hints */}
      {formData.accommodation_type && formData.accommodation_type !== 'no_preference' && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            {getTypeHint(formData.accommodation_type)}
          </p>
        </div>
      )}
    </div>
  );
};

function getTypeHint(type: AccommodationType): string {
  switch (type) {
    case 'hotel':
      return '🏨 Hotels op Vlieland bieden doorgaans ontbijt en hebben centrale ligging. Ideaal voor zakelijke groepen.';
    case 'vacation_home':
      return '🏡 Vakantiewoningen bieden privacy en eigen faciliteiten. Geschikt voor groepen die samen willen koken.';
    case 'group_accommodation':
      return '🏕️ Groepsaccommodaties zijn ideaal voor grotere groepen (20+) en bieden vaak vergaderfaciliteiten.';
    case 'camping':
      return '⛺ Camping biedt een unieke eilandervaring. Glamping opties zijn ook beschikbaar.';
    default:
      return '';
  }
}
