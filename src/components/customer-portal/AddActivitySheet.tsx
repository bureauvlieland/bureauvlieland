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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { usePublishedBuildingBlocks } from "@/hooks/useBuildingBlocks";
import { AddActivityCard } from "./AddActivityCard";
import { timeSlots, type BuildingBlock, type BuildingBlockCategory } from "@/types/buildingBlock";

interface AddActivitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDates: Date[];
  existingBlockIds: string[];
  onAddActivity: (
    blockId: string,
    dayIndex: number,
    preferredTime: string | null,
    notes: string
  ) => void;
}

type CategoryFilter = "all" | BuildingBlockCategory;

export const AddActivitySheet = ({
  open,
  onOpenChange,
  selectedDates,
  existingBlockIds,
  onAddActivity,
}: AddActivitySheetProps) => {
  const { data: blocks = [], isLoading } = usePublishedBuildingBlocks();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedBlock, setSelectedBlock] = useState<BuildingBlock | null>(null);
  
  // Form state for adding
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [preferredTime, setPreferredTime] = useState<string>("flexibel");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter blocks: published, not already in program
  const availableBlocks = useMemo(() => {
    return blocks.filter((block) => {
      // Exclude blocks already in program
      if (existingBlockIds.includes(block.id)) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = block.name.toLowerCase().includes(query);
        const matchesDescription = block.short_description?.toLowerCase().includes(query);
        const matchesProvider = block.provider?.name?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription && !matchesProvider) return false;
      }
      
      // Category filter
      if (categoryFilter !== "all" && block.category !== categoryFilter) return false;
      
      return true;
    });
  }, [blocks, existingBlockIds, searchQuery, categoryFilter]);

  const handleSelectBlock = (block: BuildingBlock) => {
    setSelectedBlock(block);
    setSelectedDayIndex(0);
    setPreferredTime("flexibel");
    setNotes("");
  };

  const handleBack = () => {
    setSelectedBlock(null);
  };

  const handleConfirmAdd = async () => {
    if (!selectedBlock) return;
    
    setIsSubmitting(true);
    try {
      const time = preferredTime === "flexibel" ? null : preferredTime;
      await onAddActivity(selectedBlock.id, selectedDayIndex, time, notes);
      
      // Reset and close
      setSelectedBlock(null);
      setSearchQuery("");
      setCategoryFilter("all");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedBlock(null);
    setSearchQuery("");
    setCategoryFilter("all");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b shrink-0">
          {selectedBlock ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <SheetTitle>{selectedBlock.name} toevoegen</SheetTitle>
                <SheetDescription>Kies dag en eventueel voorkeurstijd</SheetDescription>
              </div>
            </div>
          ) : (
            <>
              <SheetTitle>Activiteit toevoegen</SheetTitle>
              <SheetDescription>
                Kies een activiteit om aan je programma toe te voegen
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {selectedBlock ? (
          // Add form
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Day selection */}
            {selectedDates.length > 1 && (
              <div className="space-y-3">
                <Label>Op welke dag?</Label>
                <RadioGroup
                  value={String(selectedDayIndex)}
                  onValueChange={(v) => setSelectedDayIndex(Number(v))}
                >
                  {selectedDates.map((date, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={String(index)} id={`day-${index}`} />
                      <Label htmlFor={`day-${index}`} className="font-normal cursor-pointer">
                        Dag {index + 1} - {format(date, "d MMMM yyyy", { locale: nl })}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Time preference */}
            <div className="space-y-2">
              <Label htmlFor="time">Voorkeurstijd (optioneel)</Label>
              <Select value={preferredTime} onValueChange={setPreferredTime}>
                <SelectTrigger id="time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Opmerking (optioneel)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bijvoorbeeld: vegetarisch menu gewenst..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Annuleren
              </Button>
              <Button onClick={handleConfirmAdd} disabled={isSubmitting} className="flex-1">
                Toevoegen
              </Button>
            </div>
          </div>
        ) : (
          // Browse blocks
          <>
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
                <Button
                  variant={categoryFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("all")}
                >
                  Alle
                </Button>
                <Button
                  variant={categoryFilter === "activiteiten" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("activiteiten")}
                >
                  Activiteiten
                </Button>
                <Button
                  variant={categoryFilter === "catering" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("catering")}
                >
                  Catering
                </Button>
                <Button
                  variant={categoryFilter === "vervoer" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("vervoer")}
                >
                  Vervoer
                </Button>
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
                      : "Alle beschikbare activiteiten zitten al in je programma"}
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
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
