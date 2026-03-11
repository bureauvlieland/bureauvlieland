import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Send, Trash2, Users, Calendar, Clock, Pencil, Ship, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { DayTabs } from "./DayTabs";
import { FerryDeparturePicker } from "./FerryDeparturePicker";
import { AddActivitySheet } from "@/components/customer-portal/AddActivitySheet";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import { getBlockImage } from "@/lib/buildingBlockUtils";
import { categoryLabels, type CartItemDetail } from "@/types/buildingBlock";

const FERRY_BLOCK_IDS = ["boot-enkel-heen", "boot-enkel-terug"];

interface ProgramBuilderViewProps {
  cartItems: CartItemDetail[];
  numberOfPeople: number;
  selectedDates: Date[];
  onRemoveItem: (blockId: string) => void;
  onAddItem: (blockId: string, dayIndex: number) => void;
  onUpdateItem: (blockId: string, updates: Partial<CartItemDetail>) => void;
  onSubmit: () => void;
  onEditBasics: () => void;
  eventType?: string;
  contactName?: string;
}

export const ProgramBuilderView = ({
  cartItems,
  numberOfPeople,
  selectedDates,
  onRemoveItem,
  onAddItem,
  onSubmit,
  onEditBasics,
  eventType,
  contactName,
}: ProgramBuilderViewProps) => {
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [activeDay, setActiveDay] = useState(0);

  const existingBlockIds = useMemo(
    () => cartItems.map((item) => item.blockId),
    [cartItems]
  );

  const itemCountPerDay = useMemo(() => {
    return selectedDates.map((_, dayIndex) =>
      cartItems.filter((item) => (item.dayIndex ?? 0) === dayIndex).length
    );
  }, [cartItems, selectedDates]);

  const itemsForDay = (dayIndex: number) =>
    cartItems.filter((item) => (item.dayIndex ?? 0) === dayIndex);

  const handleAddActivity = (
    blockId: string,
    dayIndex: number,
    _preferredTime: string | null,
    _notes: string
  ) => {
    onAddItem(blockId, dayIndex);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            {contactName ? `Programma van ${contactName}` : "Uw programma"}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {numberOfPeople} personen
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {selectedDates.length === 1
                ? format(selectedDates[0], "d MMMM yyyy", { locale: nl })
                : `${selectedDates.length} dagen`}
            </span>
            {eventType && (
              <Badge variant="secondary" className="text-xs">
                {eventType}
              </Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onEditBasics}>
          <Pencil className="h-3.5 w-3.5" />
          Wijzig gegevens
        </Button>
      </div>

      {/* Day tabs + timeline */}
      <DayTabs
        selectedDates={selectedDates}
        activeDay={activeDay}
        onDayChange={setActiveDay}
        itemCountPerDay={itemCountPerDay}
      >
        {(dayIndex) => (
          <div className="space-y-3">
            {itemsForDay(dayIndex).map((item) => {
              const block = getBlockById(allBlocks, item.blockId);
              if (!block) return null;
              const image = getBlockImage(block);
              const hasImage = image !== "/placeholder.svg";

              return (
                <Card
                  key={item.blockId}
                  className="flex gap-3 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {hasImage && (
                    <div className="w-20 sm:w-28 shrink-0">
                      <img
                        src={image}
                        alt={block.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex-1 py-3 px-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm md:text-base leading-tight">
                          {block.name}
                        </h4>
                        {block.short_description && (
                          <p className="text-muted-foreground text-xs md:text-sm mt-0.5 line-clamp-2">
                            {block.short_description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {block.duration && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {block.duration}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[block.category]}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => onRemoveItem(item.blockId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Add activity button */}
            <Button
              variant="outline"
              className="w-full gap-2 border-dashed h-12"
              onClick={() => {
                setActiveDay(dayIndex);
                setIsAddSheetOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Activiteit toevoegen
            </Button>
          </div>
        )}
      </DayTabs>

      {/* Floating submit bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {cartItems.length} {cartItems.length === 1 ? "onderdeel" : "onderdelen"} geselecteerd
          </p>
          <Button
            size="lg"
            className="gap-2"
            onClick={onSubmit}
            disabled={cartItems.length === 0}
          >
            <Send className="h-4 w-4" />
            Verstuur aanvraag
          </Button>
        </div>
      </div>

      {/* Add Activity Sheet */}
      <AddActivitySheet
        open={isAddSheetOpen}
        onOpenChange={setIsAddSheetOpen}
        selectedDates={selectedDates}
        existingBlockIds={existingBlockIds}
        onAddActivity={handleAddActivity}
      />
    </div>
  );
};
