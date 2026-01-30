import { Button } from "@/components/ui/button";
import { Mountain, Map, Music, Building2, Utensils, Ship } from "lucide-react";
import type { BuildingBlockCategory } from "@/types/buildingBlock";

interface CategoryFilterProps {
  selectedCategory: BuildingBlockCategory | "all";
  onCategoryChange: (category: BuildingBlockCategory | "all") => void;
}

const categories = [
  { id: "all" as const, label: "Alles", icon: null },
  { id: "outdoor" as const, label: "Outdoor & Sport", icon: Mountain },
  { id: "excursies" as const, label: "Excursies", icon: Map },
  { id: "entertainment" as const, label: "Entertainment", icon: Music },
  { id: "locaties" as const, label: "Locaties", icon: Building2 },
  { id: "catering" as const, label: "Catering", icon: Utensils },
  { id: "vervoer" as const, label: "Vervoer", icon: Ship },
];

export const CategoryFilter = ({
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;
        const Icon = category.icon;

        return (
          <Button
            key={category.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(category.id)}
            className="gap-2"
          >
            {Icon && <Icon className="h-4 w-4" />}
            {category.label}
          </Button>
        );
      })}
    </div>
  );
};
