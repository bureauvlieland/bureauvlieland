import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Mail, Phone, Building2 } from "lucide-react";
import type { AccommodationWizardData } from "@/types/accommodation";

interface StepContactProps {
  formData: AccommodationWizardData;
  updateFormData: (updates: Partial<AccommodationWizardData>) => void;
  hideActivitiesOption?: boolean;
}

export const StepContact = ({ formData, updateFormData, hideActivitiesOption }: StepContactProps) => {
  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Naam *</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            placeholder="Uw volledige naam"
            value={formData.customer_name}
            onChange={(e) => updateFormData({ customer_name: e.target.value })}
            className="pl-10"
            maxLength={100}
          />
        </div>
      </div>

      {/* Company */}
      <div className="space-y-2">
        <Label htmlFor="company">Bedrijf / Organisatie</Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="company"
            type="text"
            placeholder="Optioneel"
            value={formData.customer_company}
            onChange={(e) => updateFormData({ customer_company: e.target.value })}
            className="pl-10"
            maxLength={100}
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">E-mailadres *</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="uw@email.nl"
            value={formData.customer_email}
            onChange={(e) => updateFormData({ customer_email: e.target.value })}
            className="pl-10"
            maxLength={255}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Op dit adres ontvangt u de offertes van accommodaties.
        </p>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Telefoonnummer *</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder="+31 6 12345678"
            value={formData.customer_phone}
            onChange={(e) => updateFormData({ customer_phone: e.target.value })}
            className="pl-10"
            maxLength={20}
          />
        </div>
      </div>

      {/* Activities checkbox - hide when linked to existing program */}
      {!hideActivitiesOption && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={formData.wants_activities}
              onCheckedChange={(checked) => 
                updateFormData({ wants_activities: checked === true })
              }
              className="mt-0.5"
            />
            <div>
              <p className="font-medium text-sm">
                Wij willen ook activiteiten boeken
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Na bevestiging van de accommodatie helpen wij u graag met het 
                samenstellen van een compleet programma met activiteiten, catering en vervoer.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Privacy notice */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        <p>
          Door deze aanvraag te versturen gaat u akkoord met onze{" "}
          <a href="/algemene-voorwaarden" className="underline hover:text-foreground">
            algemene voorwaarden
          </a>
          . Uw gegevens worden alleen gebruikt voor het verwerken van deze aanvraag.
        </p>
      </div>
    </div>
  );
};
