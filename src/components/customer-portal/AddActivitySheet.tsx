import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { usePublishedBuildingBlocks } from "@/hooks/useBuildingBlocks";
import { AddActivityCard } from "./AddActivityCard";
import type { BuildingBlockCategory } from "@/types/buildingBlock";

interface AddActivitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingBlockIds: string[];
  onAddActivity: (blockId: string) => void;
}

type CategoryFilter = "all" | BuildingBlockCategory;

export const AddActivitySheet = ({
  open,
  onOpenChange,
  existingBlockIds,
  onAddActivity,
}: AddActivitySheetProps) => {
  const { data: blocks = [], isLoading } = usePublishedBuildingBlocks();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const availableBlocks = useMemo(() => {
    return blocks.filter((block) => {
      if (existingBlockIds.includes(block.id)) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = block.name.toLowerCase().includes(query);
        const matchesDescription = block.short_description?.toLowerCase().includes(query);
        const matchesProvider = block.provider?.name?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription && !matchesProvider) return false;
      }
      
      if (categoryFilter !== "all" && block.category !== categoryFilter) return false;
      
      return true;
    });
  }, [blocks, existingBlockIds, searchQuery, categoryFilter]);

  const handleSelectBlock = (block: { id: string }) => {
    onAddActivity(block.id);
    setSearchQuery("");
    setCategoryFilter("all");
    onOpenChange(false);
  };

  const handleClose = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          <SheetTitle>Activiteit toevoegen</SheetTitle>
          <SheetDescription>
            Kies een activiteit om aan uw programma toe te voegen
          </SheetDescription>
        </SheetHeader>

        {/* Search and filters */}
        <div className="p-4 pb-2 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoeken..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {(["all", "outdoor", "excursies", "entertainment", "locaties", "catering", "vervoer"] as const).map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === "all" ? "Alle" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Blocks list */}
        <ScrollArea className="flex-1">
          <div className="p-4 pt-2 space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Laden...
              </div>
            ) : availableBlocks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || categoryFilter !== "all"
                  ? "Geen activiteiten gevonden met deze filters"
                  : "Alle beschikbare activiteiten zitten al in uw programma"}
              </div>
            ) : (
              availableBlocks.map((block) => (
                <AddActivityCard
                  key={block.id}
                  block={block}
                  onAdd={handleSelectBlock}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
