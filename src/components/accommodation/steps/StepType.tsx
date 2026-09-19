import { Notice, OptionCard, OptionGroup } from "@/components/system";
import type { AccommodationWizardData, AccommodationType } from "@/types/accommodation";
import { ACCOMMODATION_TYPES } from "@/types/accommodation";
import { accommodationTypeIcon } from "@/lib/accommodationIcons";

interface StepTypeProps {
  formData: AccommodationWizardData;
  updateFormData: (updates: Partial<AccommodationWizardData>) => void;
}

export const StepType = ({ formData, updateFormData }: StepTypeProps) => {
  const hint = formData.accommodation_type && formData.accommodation_type !== "no_preference"
    ? getTypeHint(formData.accommodation_type)
    : "";

  return (
    <div className="space-y-6">
      <OptionGroup name="Type verblijf" columns={1}>
        {ACCOMMODATION_TYPES.map((type) => {
          const Icon = accommodationTypeIcon(type.value);
          return (
            <OptionCard
              key={type.value}
              selected={formData.accommodation_type === type.value}
              onSelect={() => updateFormData({ accommodation_type: type.value as AccommodationType })}
              title={type.label}
              description={type.description}
              icon={<Icon />}
            />
          );
        })}
      </OptionGroup>

      {hint && <Notice tone="info">{hint}</Notice>}
    </div>
  );
};

function getTypeHint(type: AccommodationType): string {
  switch (type) {
    case "hotel":
      return "Hotels op Vlieland bieden doorgaans ontbijt en liggen centraal. Ideaal voor zakelijke groepen.";
    case "vacation_home":
      return "Vakantiewoningen bieden privacy en eigen faciliteiten. Geschikt voor groepen die samen willen koken.";
    case "group_accommodation":
      return "Groepsaccommodaties zijn ideaal voor grotere groepen (20+) en bieden vaak vergaderfaciliteiten.";
    case "camping":
      return "Camping biedt een unieke eilandervaring. Glampingopties zijn ook beschikbaar.";
    default:
      return "";
  }
}
