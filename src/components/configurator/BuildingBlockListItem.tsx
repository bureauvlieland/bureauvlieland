import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Users, Info } from "lucide-react";
import type { BuildingBlock } from "@/types/buildingBlock";
import { formatBlockPrice, formatPriceNote } from "@/types/buildingBlock";
import { getBlockImage, getProviderName, isSelfArranged } from "@/lib/buildingBlockUtils";

interface BuildingBlockListItemProps {
  block: BuildingBlock;
  onAdd: (blockId: string) => void;
  isInCart: boolean;
}

export const BuildingBlockListItem = ({ block, onAdd, isInCart }: BuildingBlockListItemProps) => {
  const selfArranged = isSelfArranged(block);

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-3 hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <img
        src={getBlockImage(block)}
        alt={block.name}
        className="h-[60px] w-[60px] rounded-md object-cover flex-shrink-0"
        loading="lazy"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="font-semibold text-foreground truncate">{block.name}</h3>
          <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">
            {block.category}
          </Badge>
          {selfArranged && (
            <Badge className="bg-amber-500/90 text-white text-[10px] px-1.5 py-0 gap-0.5">
              <Info className="h-2.5 w-2.5" />
              Zelf te regelen
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
          {block.short_description || block.description}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {block.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {block.duration}
            </span>
          )}
          {block.min_people && block.max_people && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {block.min_people}-{block.max_people} pers.
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Door: {getProviderName(block)}
          </span>
        </div>
      </div>

      {/* Price + action */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <span className="font-semibold text-foreground">{formatBlockPrice(block)}</span>
          {formatPriceNote(block) && (
            <span className="text-muted-foreground text-xs block">{formatPriceNote(block)}</span>
          )}
        </div>
        <Button
          onClick={() => onAdd(block.id)}
          variant={isInCart ? "secondary" : "default"}
          size="sm"
          disabled={isInCart}
          className="whitespace-nowrap"
        >
          {isInCart ? "✓" : <Plus className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
