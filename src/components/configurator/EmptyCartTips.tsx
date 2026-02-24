import { Ship, Bike, Utensils, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BuildingBlockCategory } from "@/types/buildingBlock";

interface EmptyCartTipsProps {
  onFilterCategory?: (category: BuildingBlockCategory | "all") => void;
}

const tips = [
  {
    icon: Ship,
    label: "Overtocht",
    description: "u moet tenslotte eerst op het eiland komen.",
  },
  {
    icon: Bike,
    label: "Fietsen",
    description: "de handigste manier om over Vlieland te bewegen.",
  },
  {
    icon: Utensils,
    label: "Activiteiten & catering",
    description: "kies vervolgens uw activiteiten en catering.",
  },
];

export const EmptyCartTips = ({ onFilterCategory }: EmptyCartTipsProps) => {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-foreground mb-1">Aan de slag</p>
        <p className="text-sm text-muted-foreground">
          Wij raden de volgende volgorde aan:
        </p>
      </div>

      <ol className="space-y-3">
        {tips.map((tip, index) => {
          const Icon = tip.icon;
          return (
            <li key={index} className="flex items-start gap-3">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">{tip.label}</span>{" "}
                — {tip.description}
              </p>
            </li>
          );
        })}
      </ol>

      {onFilterCategory && (
        <div className="flex flex-col gap-2 pt-1">
          <Button
            size="sm"
            className="gap-2 w-full"
            onClick={() => onFilterCategory("vervoer")}
          >
            Vervoer bekijken
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground w-full"
            onClick={() => onFilterCategory("all")}
          >
            Alle onderdelen bekijken
          </Button>
        </div>
      )}
    </div>
  );
};
