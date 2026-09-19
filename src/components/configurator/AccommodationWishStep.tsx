import { Card } from "@/components/ui/card";
import { BedDouble } from "lucide-react";
import {
  ACCOMMODATION_TYPES,
  LOCATION_PREFERENCES,
  BUDGET_RANGES,
  type AccommodationWish,
  type AccommodationType,
} from "@/types/accommodation";
import { OptionCard, OptionGroup, SectionHeader, WizardFooter } from "@/components/system";
import { accommodationTypeIcon, locationIcon } from "@/lib/accommodationIcons";

interface AccommodationWishStepProps {
  numberOfPeople: number;
  wish: AccommodationWish;
  onChange: (wish: AccommodationWish) => void;
  onBack: () => void;
  onSubmit: () => void;
  nextLabel?: string;
}

export const AccommodationWishStep = ({
  numberOfPeople,
  wish,
  onChange,
  onBack,
  onSubmit,
  nextLabel = "Volgende: vervoer en fietsen",
}: AccommodationWishStepProps) => {
  const handleWantedChange = (wanted: boolean) => {
    onChange(wanted ? { ...wish, wanted: true } : { wanted: false });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SectionHeader
        as="h2"
        size="md"
        weight="medium"
        align="center"
        title="Logies"
        intro={`Wilt u dat wij ook een verblijf regelen voor uw groep van ${numberOfPeople}? Wij zetten dit apart voor u uit bij onze logiespartners. U kunt deze stap ook overslaan.`}
      />

      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-md bg-accent-soft text-primary p-2">
            <BedDouble className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Verblijf op Vlieland</h3>
            <p className="text-sm text-muted-foreground">
              Vertel ons kort wat u zoekt, wij zoeken de beste opties bij onze partners.
            </p>
          </div>
        </div>

        <OptionGroup label="Wilt u dat wij logies regelen?" columns={2}>
          <OptionCard
            selected={wish.wanted}
            onSelect={() => handleWantedChange(true)}
            title="Ja, graag"
            description="Wij regelen ook uw verblijf."
          />
          <OptionCard
            selected={!wish.wanted}
            onSelect={() => handleWantedChange(false)}
            title="Nee, wij regelen dit zelf"
            description="Sla deze stap over. U kunt logies later nog aanvragen; deze keuze legt niets vast."
          />
        </OptionGroup>

        {wish.wanted && (
          <div className="mt-5 space-y-5 pt-5 border-t border-border">
            <OptionGroup label="Type verblijf" columns={2}>
              {ACCOMMODATION_TYPES.map((type) => {
                const Icon = accommodationTypeIcon(type.value);
                return (
                  <OptionCard
                    key={type.value}
                    selected={wish.type === type.value}
                    onSelect={() => onChange({ ...wish, type: type.value as AccommodationType })}
                    title={type.label}
                    icon={<Icon />}
                  />
                );
              })}
            </OptionGroup>

            <OptionGroup label="Locatievoorkeur" columns={4}>
              {LOCATION_PREFERENCES.map((loc) => {
                const Icon = locationIcon(loc.value);
                return (
                  <OptionCard
                    key={loc.value}
                    selected={wish.locationPreference === loc.value}
                    onSelect={() => onChange({ ...wish, locationPreference: loc.value })}
                    title={loc.label}
                    icon={<Icon />}
                    align="center"
                  />
                );
              })}
            </OptionGroup>

            <OptionGroup label="Budget per persoon per nacht" columns={3}>
              {BUDGET_RANGES.map((budget) => (
                <OptionCard
                  key={budget.value}
                  selected={wish.budgetRange === budget.value}
                  onSelect={() => onChange({ ...wish, budgetRange: budget.value })}
                  title={budget.label}
                  align="center"
                />
              ))}
            </OptionGroup>

            <p className="text-xs text-muted-foreground">
              Na het versturen van uw programma nemen wij dit verder met u door. Kamerverdeling en
              overige wensen bespreken we dan.
            </p>
          </div>
        )}
      </Card>

      <WizardFooter onBack={onBack} onNext={onSubmit} nextLabel={nextLabel} />
    </div>
  );
};
