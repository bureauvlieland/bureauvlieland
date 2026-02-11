import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, Users, Info, MapPin } from "lucide-react";
import type { BuildingBlock } from "@/types/buildingBlock";
import { formatBlockPrice, formatPriceNote } from "@/types/buildingBlock";
import { getBlockImage, getProviderName, isSelfArranged } from "@/lib/buildingBlockUtils";

interface BuildingBlockCardProps {
  block: BuildingBlock;
  onAdd: (blockId: string) => void;
  isInCart: boolean;
}

export const BuildingBlockCard = ({ block, onAdd, isInCart }: BuildingBlockCardProps) => {
  const selfArranged = isSelfArranged(block);

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      {/* Image */}
      <div className="relative h-[180px] overflow-hidden">
        <img
          src={getBlockImage(block)}
          alt={block.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Price badge */}
        <div className="absolute top-3 right-3 bg-background/95 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="font-semibold text-foreground">{formatBlockPrice(block)}</span>
          {formatPriceNote(block) && (
            <span className="text-muted-foreground text-sm ml-1">{formatPriceNote(block)}</span>
          )}
        </div>

        {/* Category badge */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <span className="bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full capitalize">
            {block.category}
          </span>
          {selfArranged && (
            <span className="bg-amber-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Info className="h-3 w-3" />
              Zelf te regelen
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-foreground mb-2">{block.name}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {block.short_description || block.description}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          {block.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{block.duration}</span>
            </div>
          )}
          {block.min_people && block.max_people && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{block.min_people}-{block.max_people} pers.</span>
            </div>
          )}
          {block.location_address && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{block.location_address}</span>
            </div>
          )}
        </div>

        {/* Provider */}
        <p className="text-xs text-muted-foreground mb-4">
          Door: <span className="font-medium">{getProviderName(block)}</span>
        </p>

        {/* Action button */}
        <Button
          onClick={() => onAdd(block.id)}
          variant={isInCart ? "secondary" : "default"}
          className="w-full"
          disabled={isInCart}
        >
          {isInCart ? (
            "Toegevoegd ✓"
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              {selfArranged ? "Toevoegen als reminder" : "Toevoegen"}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
