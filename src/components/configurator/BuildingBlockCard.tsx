import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink, Clock, Users } from "lucide-react";
import type { BuildingBlock } from "@/data/configuratorMockData";

interface BuildingBlockCardProps {
  block: BuildingBlock;
  onAdd: (blockId: string) => void;
  isInCart: boolean;
}

export const BuildingBlockCard = ({ block, onAdd, isInCart }: BuildingBlockCardProps) => {
  const isExternal = !!block.externalUrl;

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      {/* Image */}
      <div className="relative h-[180px] overflow-hidden">
        <img
          src={block.image}
          alt={block.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Price badge */}
        <div className="absolute top-3 right-3 bg-background/95 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="font-semibold text-foreground">{block.priceIndication}</span>
          {block.priceNote && (
            <span className="text-muted-foreground text-sm ml-1">{block.priceNote}</span>
          )}
        </div>

        {/* Category badge */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full capitalize">
            {block.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-foreground mb-2">{block.name}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {block.description}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          {block.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{block.duration}</span>
            </div>
          )}
          {block.minPeople && block.maxPeople && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{block.minPeople}-{block.maxPeople} pers.</span>
            </div>
          )}
        </div>

        {/* Provider */}
        <p className="text-xs text-muted-foreground mb-4">
          Door: <span className="font-medium">{block.provider}</span>
        </p>

        {/* Action button */}
        {isExternal ? (
          <a href={block.externalUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Zelf boeken
            </Button>
          </a>
        ) : (
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
                Toevoegen
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
};
