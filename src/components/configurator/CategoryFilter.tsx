import { Button } from "@/components/ui/button";
import { Compass, Utensils, Ship } from "lucide-react";
import type { BlockCategory } from "@/data/configuratorMockData";

interface CategoryFilterProps {
  selectedCategory: BlockCategory | "all";
  onCategoryChange: (category: BlockCategory | "all") => void;
}

const categories = [
  { id: "all" as const, label: "Alles", icon: null },
  { id: "activiteiten" as const, label: "Activiteiten", icon: Compass },
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
