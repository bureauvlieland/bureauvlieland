import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Clock, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminBuildingBlocks } from "@/hooks/useBuildingBlocks";
import { useAddTemplateItem } from "@/hooks/useProgramTemplates";
import { getBlockImage } from "@/lib/buildingBlockUtils";
import { categoryLabels } from "@/types/buildingBlock";
import type { BuildingBlock } from "@/types/buildingBlock";

interface AddTemplateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  dayIndex: number;
  durationDays: number;
  existingBlockIds: string[];
}

export const AddTemplateItemDialog = ({
  open,
  onOpenChange,
  templateId,
  dayIndex,
  durationDays,
  existingBlockIds,
}: AddTemplateItemDialogProps) => {
  const { toast } = useToast();
  const { data: blocks, isLoading } = useAdminBuildingBlocks();
  const addItem = useAddTemplateItem();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(dayIndex);
  const [preferredTime, setPreferredTime] = useState("10:00");
  
  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSearchQuery("");
      setSelectedBlockId(null);
      setSelectedDayIndex(dayIndex);
      setPreferredTime("10:00");
    }
    onOpenChange(newOpen);
  };
  
  // Filter and group blocks
  const filteredBlocks = blocks?.filter((block) => {
    if (!block.is_active) return false;
    const matchesSearch = block.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];
  
  // Group by category
  const blocksByCategory: Record<string, BuildingBlock[]> = {};
  filteredBlocks.forEach((block) => {
    if (!blocksByCategory[block.category]) {
      blocksByCategory[block.category] = [];
    }
    blocksByCategory[block.category].push(block);
  });
  
  const handleAdd = async () => {
    if (!selectedBlockId) return;
    
    try {
      await addItem.mutateAsync({
        template_id: templateId,
        block_id: selectedBlockId,
        day_index: selectedDayIndex,
        preferred_time: preferredTime || null,
        notes: null,
        sort_order: 0,
      });
      
      toast({
        title: "Bouwsteen toegevoegd",
        description: "De bouwsteen is toegevoegd aan de template.",
      });
      
      handleOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Er ging iets mis bij het toevoegen.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bouwsteen toevoegen</DialogTitle>
          <DialogDescription>
            Selecteer een bouwsteen om toe te voegen aan de template.
          </DialogDescription>
        </DialogHeader>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoeken..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Block List */}
        <ScrollArea className="h-[300px] border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(blocksByCategory).length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Geen bouwstenen gevonden
            </div>
          ) : (
            <div className="p-2 space-y-4">
              {Object.entries(blocksByCategory).map(([category, categoryBlocks]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
                    {categoryLabels[category as keyof typeof categoryLabels] || category}
                  </h4>
                  <div className="space-y-1">
                    {categoryBlocks.map((block) => {
                      const isSelected = selectedBlockId === block.id;
                      const isAlreadyInTemplate = existingBlockIds.includes(block.id);
                      
                      return (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() => !isAlreadyInTemplate && setSelectedBlockId(block.id)}
                          disabled={isAlreadyInTemplate}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            isSelected
                              ? "bg-primary/10 border border-primary"
                              : isAlreadyInTemplate
                              ? "bg-muted/50 opacity-50 cursor-not-allowed"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="h-10 w-14 rounded overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={getBlockImage(block)}
                              alt={block.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm">{block.name}</p>
                            {block.short_description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {block.short_description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                          {isAlreadyInTemplate && (
                            <span className="text-xs text-muted-foreground">Al toegevoegd</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Day and Time Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Dag</Label>
            <Select 
              value={selectedDayIndex.toString()} 
              onValueChange={(v) => setSelectedDayIndex(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: durationDays }).map((_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    Dag {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Tijd
            </Label>
            <Input
              type="time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={!selectedBlockId || addItem.isPending}
          >
            {addItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Toevoegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
