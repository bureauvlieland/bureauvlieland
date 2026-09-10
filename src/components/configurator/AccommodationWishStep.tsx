import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, BedDouble } from "lucide-react";
import {
  ACCOMMODATION_TYPES,
  LOCATION_PREFERENCES,
  BUDGET_RANGES,
  type AccommodationWish,
  type AccommodationType,
} from "@/types/accommodation";

interface AccommodationWishStepProps {
  numberOfPeople: number;
  wish: AccommodationWish;
  onChange: (wish: AccommodationWish) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export const AccommodationWishStep = ({
  numberOfPeople,
  wish,
  onChange,
  onBack,
  onSubmit,
}: AccommodationWishStepProps) => {
  const handleWantedChange = (wanted: boolean) => {
    onChange(wanted ? { ...wish, wanted: true } : { wanted: false });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-2">
          Logies
        </h2>
        <p className="text-muted-foreground">
          Wilt u dat wij ook een verblijf regelen voor uw groep van {numberOfPeople}? Wij zetten dit
          apart voor u uit bij onze logiespartners — u kunt deze stap ook overslaan.
        </p>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-md bg-primary/10 text-primary p-2">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Verblijf op Vlieland</h3>
            <p className="text-sm text-muted-foreground">
              Vertel ons kort wat u zoekt, wij zoeken de beste opties bij onze partners.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <button
            type="button"
            onClick={() => handleWantedChange(true)}
            className={cn(
              "w-full text-left p-3 rounded-md border-2 transition-all",
              wish.wanted ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
          >
            <p className="font-medium text-sm">Ja, graag</p>
            <p className="text-xs text-muted-foreground">Wij regelen ook uw verblijf</p>
          </button>
          <button
            type="button"
            onClick={() => handleWantedChange(false)}
            className={cn(
              "w-full text-left p-3 rounded-md border-2 transition-all",
              !wish.wanted ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
          >
            <p className="font-medium text-sm">Nee, wij regelen dit zelf</p>
            <p className="text-xs text-muted-foreground">Sla deze stap over</p>
          </button>
        </div>

        {wish.wanted && (
          <div className="mt-5 space-y-5 pt-5 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Type verblijf</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACCOMMODATION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => onChange({ ...wish, type: type.value as AccommodationType })}
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-md border-2 text-left transition-all",
                      wish.type === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-xl">{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Locatievoorkeur</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {LOCATION_PREFERENCES.map((loc) => (
                  <button
                    key={loc.value}
                    type="button"
                    onClick={() => onChange({ ...wish, locationPreference: loc.value })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2.5 rounded-md border-2 text-center transition-all",
                      wish.locationPreference === loc.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-lg">{loc.icon}</span>
                    <span className="text-xs font-medium">{loc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Budget per persoon per nacht</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BUDGET_RANGES.map((budget) => (
                  <button
                    key={budget.value}
                    type="button"
                    onClick={() => onChange({ ...wish, budgetRange: budget.value })}
                    className={cn(
                      "p-2.5 rounded-md border-2 text-center text-xs font-medium transition-all",
                      wish.budgetRange === budget.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {budget.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Na het versturen van uw programma nemen wij dit verder met u door — kamerverdeling en
              overige wensen bespreken we dan.
            </p>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Terug
        </Button>
        <Button type="button" size="lg" onClick={onSubmit}>
          Verder naar vervoer <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
};
