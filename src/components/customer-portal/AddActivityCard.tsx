import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock } from "lucide-react";
import type { BuildingBlock } from "@/types/buildingBlock";
import { formatBlockPrice, formatPriceNote, categoryLabels } from "@/types/buildingBlock";
import { getBlockImage, getProviderName } from "@/lib/buildingBlockUtils";

interface AddActivityCardProps {
  block: BuildingBlock;
  onAdd: (block: BuildingBlock) => void;
  isLoading?: boolean;
}

export const AddActivityCard = ({ block, onAdd, isLoading }: AddActivityCardProps) => {
  const imageUrl = getBlockImage(block);
  const providerName = getProviderName(block);
  const priceDisplay = formatBlockPrice(block);
  const priceNote = formatPriceNote(block);

  return (
    <div className="flex gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Image */}
      <div className="shrink-0">
        <img
          src={imageUrl}
          alt={block.name}
          className="w-16 h-16 rounded-md object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-medium text-sm leading-tight">{block.name}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {priceDisplay} {priceNote && <span className="text-muted-foreground/70">{priceNote}</span>}
              <span className="mx-1">•</span>
              {providerName}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            {categoryLabels[block.category]}
          </Badge>
        </div>
        
        {/* Duration */}
        {block.duration && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>{block.duration}</span>
          </div>
        )}
        
        {block.short_description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {block.short_description}
          </p>
        )}
      </div>

      {/* Add button */}
      <div className="shrink-0 flex items-center">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAdd(block)}
          disabled={isLoading}
          className="h-8"
        >
          <Plus className="h-3 w-3 mr-1" />
          Toevoegen
        </Button>
      </div>
    </div>
  );
};
