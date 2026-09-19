import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Mail, Phone, Building2 } from "lucide-react";
import { FormField } from "@/components/system";
import type { AccommodationWizardData } from "@/types/accommodation";

interface StepContactProps {
  formData: AccommodationWizardData;
  updateFormData: (updates: Partial<AccommodationWizardData>) => void;
  hideActivitiesOption?: boolean;
}

export const StepContact = ({ formData, updateFormData, hideActivitiesOption }: StepContactProps) => {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Naam" htmlFor="logies-naam" required leading={<User />}>
          <Input
            type="text"
            placeholder="Uw volledige naam"
            autoComplete="name"
            value={formData.customer_name}
            onChange={(e) => updateFormData({ customer_name: e.target.value })}
            maxLength={100}
          />
        </FormField>

        <FormField label="Bedrijf of organisatie" htmlFor="logies-bedrijf" leading={<Building2 />}>
          <Input
            type="text"
            placeholder="Optioneel"
            autoComplete="organization"
            value={formData.customer_company}
            onChange={(e) => updateFormData({ customer_company: e.target.value })}
            maxLength={100}
          />
        </FormField>

        <FormField
          label="E-mailadres"
          htmlFor="logies-email"
          required
          leading={<Mail />}
          help="Op dit adres ontvangt u de offertes van de accommodaties."
        >
          <Input
            type="email"
            placeholder="uw@email.nl"
            autoComplete="email"
            value={formData.customer_email}
            onChange={(e) => updateFormData({ customer_email: e.target.value })}
            maxLength={255}
          />
        </FormField>

        <FormField label="Telefoonnummer" htmlFor="logies-telefoon" required leading={<Phone />}>
          <Input
            type="tel"
            placeholder="+31 6 12345678"
            autoComplete="tel"
            value={formData.customer_phone}
            onChange={(e) => updateFormData({ customer_phone: e.target.value })}
            maxLength={20}
          />
        </FormField>
      </div>

      {!hideActivitiesOption && (
        <label htmlFor="logies-activiteiten" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
          <Checkbox
            id="logies-activiteiten"
            checked={formData.wants_activities}
            onCheckedChange={(checked) => updateFormData({ wants_activities: checked === true })}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">Wij willen ook activiteiten boeken</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Na bevestiging van de accommodatie helpen wij u graag met een compleet programma met activiteiten,
              catering en vervoer.
            </span>
          </span>
        </label>
      )}
    </div>
  );
};
