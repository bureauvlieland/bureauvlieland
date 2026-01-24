import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, ArrowRight, Building2, Users2, Info, Share2 } from "lucide-react";
import { ShareProgramDialog } from "./ShareProgramDialog";
import { MultiDatePicker } from "./MultiDatePicker";
import { DayTabs } from "./DayTabs";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { getBlockById, calculateBureauFee, groupBlocksByType, type BuildingBlock, type CartItemDetail } from "@/data/configuratorMockData";
import { SortableCartItem } from "./SortableCartItem";

interface ConfiguratorCartProps {
  cartItems: CartItemDetail[];
  numberOfPeople: number;
  selectedDates: Date[];
  onRemoveItem: (blockId: string) => void;
  onUpdateItem: (blockId: string, updates: Partial<CartItemDetail>) => void;
  onPeopleChange: (count: number) => void;
  onAddDate: (date: Date) => boolean;
  onRemoveDate: (dateIndex: number) => void;
  onSubmit: () => void;
  onReorderItems?: (items: CartItemDetail[]) => void;
  isInDrawer?: boolean;
  // Legacy compatibility
  selectedDate?: Date | undefined;
  onDateChange?: (date: Date | undefined) => void;
}

export const ConfiguratorCart = ({
  cartItems,
  numberOfPeople,
  selectedDates,
  onRemoveItem,
  onUpdateItem,
  onPeopleChange,
  onAddDate,
  onRemoveDate,
  onSubmit,
  onReorderItems,
  isInDrawer = false,
  // Legacy fallback
  selectedDate,
  onDateChange,
}: ConfiguratorCartProps) => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Use selectedDates if available, otherwise fall back to legacy selectedDate
  const effectiveDates = selectedDates.length > 0 
    ? selectedDates 
    : (selectedDate ? [selectedDate] : []);

  const blocks = cartItems
    .map((item) => getBlockById(item.blockId))
    .filter(Boolean) as BuildingBlock[];
  const bureauFee = calculateBureauFee(numberOfPeople);
  const groupedBlocks = groupBlocksByType(blocks);

  // Helper to get cart item detail by blockId
  const getCartItem = (blockId: string): CartItemDetail | undefined => {
    return cartItems.find((item) => item.blockId === blockId);
  };

  // Get block by id from the blocks array
  const getBlock = (blockId: string): BuildingBlock | undefined => {
    return blocks.find((block) => block.id === blockId);
  };

  // Calculate indicative total - exclude self_arranged items
  const calculateTotal = () => {
    let total = 0;
    blocks.forEach((block) => {
      if (block.blockType === "self_arranged") return;
      
      const priceMatch = block.priceIndication.match(/\d+/);
      if (priceMatch) {
        const price = parseInt(priceMatch[0], 10);
        if (block.priceNote?.includes("p.p.")) {
          total += price * numberOfPeople;
        } else {
          total += price;
        }
      }
    });
    return total;
  };

  const indicativeTotal = calculateTotal();
  const hasBillableItems = groupedBlocks.bureau.length > 0 || groupedBlocks.partner.length > 0;

  // Count items per day
  const itemCountPerDay = useMemo(() => {
    const counts: number[] = effectiveDates.map(() => 0);
    cartItems.forEach(item => {
      const dayIdx = item.dayIndex ?? 0;
      if (dayIdx < counts.length) {
        counts[dayIdx]++;
      } else if (counts.length > 0) {
        counts[0]++;
      }
    });
    return counts;
  }, [cartItems, effectiveDates]);

  // Get items for a specific day, sorted by time
  const getItemsForDay = (dayIndex: number) => {
    return cartItems
      .filter(item => (item.dayIndex ?? 0) === dayIndex)
      .sort((a, b) => {
        if (!a.preferredTime && !b.preferredTime) return 0;
        if (!a.preferredTime) return 1;
        if (!b.preferredTime) return -1;
        return a.preferredTime.localeCompare(b.preferredTime);
      });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = cartItems.findIndex((item) => item.blockId === active.id);
      const newIndex = cartItems.findIndex((item) => item.blockId === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1 && onReorderItems) {
        const newItems = arrayMove(cartItems, oldIndex, newIndex);
        onReorderItems(newItems);
      }
    }
  };

  // Handle legacy date change
  const handleAddDate = (date: Date): boolean => {
    if (onAddDate) {
      return onAddDate(date);
    }
    // Legacy fallback
    if (onDateChange) {
      onDateChange(date);
      return true;
    }
    return false;
  };

  const handleRemoveDate = (dateIndex: number) => {
    if (onRemoveDate) {
      onRemoveDate(dateIndex);
    } else if (onDateChange) {
      // Legacy fallback
      onDateChange(undefined);
    }
  };

  if (cartItems.length === 0) {
    return (
      <Card className={cn("p-5 bg-muted/30 border-dashed", isInDrawer && "border-0 shadow-none bg-transparent")}>
        <div className="text-center text-muted-foreground">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Je programma is nog leeg</p>
          <p className="text-sm mt-1">Voeg bouwstenen toe om te beginnen</p>
        </div>
      </Card>
    );
  }

  const renderBlockGroup = (blockList: BuildingBlock[], groupId: string, dayIndex?: number) => {
    // Filter by day if specified
    const filteredBlocks = dayIndex !== undefined
      ? blockList.filter(block => {
          const cartItem = getCartItem(block.id);
          return cartItem && (cartItem.dayIndex ?? 0) === dayIndex;
        })
      : blockList;

    const groupItems = filteredBlocks.map((block) => {
      const cartItem = getCartItem(block.id);
      return cartItem ? { block, cartItem } : null;
    }).filter(Boolean) as { block: BuildingBlock; cartItem: CartItemDetail }[];

    if (groupItems.length === 0) return null;

    const itemIds = groupItems.map((item) => item.cartItem.blockId);

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {groupItems.map(({ block, cartItem }) => (
            <SortableCartItem
              key={block.id}
              id={block.id}
              block={block}
              item={cartItem}
              onUpdate={(updates) => onUpdateItem(block.id, updates)}
              onRemove={() => onRemoveItem(block.id)}
              selectedDates={effectiveDates}
              showDaySelector={effectiveDates.length > 1}
            />
          ))}
        </SortableContext>
      </DndContext>
    );
  };

  // For drawer mode: render all items sortable together with day selector
  const renderAllItemsSortable = () => {
    const sortedItems = [...cartItems].sort((a, b) => {
      // First sort by day
      const dayA = a.dayIndex ?? 0;
      const dayB = b.dayIndex ?? 0;
      if (dayA !== dayB) return dayA - dayB;
      // Then by time
      if (!a.preferredTime && !b.preferredTime) return 0;
      if (!a.preferredTime) return 1;
      if (!b.preferredTime) return -1;
      return a.preferredTime.localeCompare(b.preferredTime);
    });

    const allItems = sortedItems.map((item) => {
      const block = getBlock(item.blockId);
      return block ? { block, cartItem: item } : null;
    }).filter(Boolean) as { block: BuildingBlock; cartItem: CartItemDetail }[];

    const itemIds = allItems.map((item) => item.cartItem.blockId);

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {allItems.map(({ block, cartItem }) => (
              <SortableCartItem
                key={block.id}
                id={block.id}
                block={block}
                item={cartItem}
                onUpdate={(updates) => onUpdateItem(block.id, updates)}
                onRemove={() => onRemoveItem(block.id)}
                selectedDates={effectiveDates}
                showDaySelector={effectiveDates.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  };

  // Render items for a specific day (used in tabbed view)
  const renderDayItems = (dayIndex: number) => {
    const dayItems = getItemsForDay(dayIndex);
    
    const allItems = dayItems.map((item) => {
      const block = getBlock(item.blockId);
      return block ? { block, cartItem: item } : null;
    }).filter(Boolean) as { block: BuildingBlock; cartItem: CartItemDetail }[];

    const itemIds = allItems.map((item) => item.cartItem.blockId);

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {allItems.map(({ block, cartItem }) => (
              <SortableCartItem
                key={block.id}
                id={block.id}
                block={block}
                item={cartItem}
                onUpdate={(updates) => onUpdateItem(block.id, updates)}
                onRemove={() => onRemoveItem(block.id)}
                selectedDates={effectiveDates}
                showDaySelector={effectiveDates.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  };

  return (
    <Card className={cn("p-5", isInDrawer && "border-0 shadow-none px-1 py-2")}>
      {!isInDrawer && (
        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Jouw Programma
          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full ml-auto">
            {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
          </span>
        </h3>
      )}

      {/* Intro text */}
      <p className="text-sm text-muted-foreground mb-4">
        Begin met het invullen van je groepsgrootte en gewenste datum(s).
      </p>

      {/* People and date inputs */}
      <div className="space-y-3 mb-5">
        <div>
          <Label htmlFor="numberOfPeople" className="text-sm font-medium">
            Hoeveel personen?
          </Label>
          <p className="text-xs text-muted-foreground mb-1.5">
            Dit bepaalt de indicatieve prijs per activiteit
          </p>
          <Input
            id="numberOfPeople"
            type="number"
            min={1}
            max={500}
            value={numberOfPeople}
            onChange={(e) => onPeopleChange(parseInt(e.target.value, 10) || 1)}
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Wanneer willen jullie komen?</Label>
          <p className="text-xs text-muted-foreground mb-1.5">
            {effectiveDates.length === 0 
              ? "Selecteer één of meerdere dagen (max 7)"
              : "Aanbieders controleren de beschikbaarheid"}
          </p>
          <MultiDatePicker
            selectedDates={effectiveDates}
            onAddDate={handleAddDate}
            onRemoveDate={handleRemoveDate}
          />
        </div>
      </div>

      {/* Separator and activities header */}
      <div className="border-t pt-4 mb-3">
        <h4 className="font-medium text-sm mb-1">Gekozen activiteiten</h4>
        <p className="text-xs text-muted-foreground mb-3">
          {effectiveDates.length > 1 
            ? "Activiteiten zijn ingedeeld per dag. Verplaats ze via de dag-selector."
            : "Sleep activiteiten in de gewenste dagvolgorde"}
        </p>
      </div>

      {/* Activities list */}
      <div className="space-y-3">
        {isInDrawer ? (
          // Drawer mode: show all items with day selector
          renderAllItemsSortable()
        ) : effectiveDates.length > 1 ? (
          // Multi-day mode: show tabs
          <DayTabs
            selectedDates={effectiveDates}
            activeDay={activeDay}
            onDayChange={setActiveDay}
            itemCountPerDay={itemCountPerDay}
          >
            {(dayIndex) => renderDayItems(dayIndex)}
          </DayTabs>
        ) : (
          // Single day mode: show grouped by type
          <>
            {/* Bureau Vlieland items */}
            {groupedBlocks.bureau.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>Gefactureerd door Bureau Vlieland</span>
                </div>
                <div className="space-y-2 ml-6 bg-muted/50 rounded-lg p-2">
                  {renderBlockGroup(groupedBlocks.bureau, "bureau")}
                </div>
              </div>
            )}

            {/* Partner items */}
            {groupedBlocks.partner.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Users2 className="h-4 w-4 text-primary" />
                  <span>Gefactureerd door aanbieders</span>
                </div>
                <div className="space-y-2 ml-6 bg-muted/50 rounded-lg p-2">
                  {renderBlockGroup(groupedBlocks.partner, "partner")}
                </div>
              </div>
            )}

            {/* Self-arranged items */}
            {groupedBlocks.self_arranged.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                  <Info className="h-4 w-4" />
                  <span>Zelf te regelen</span>
                </div>
                <div className="space-y-2 ml-6 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2">
                  {renderBlockGroup(groupedBlocks.self_arranged, "self")}
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Links ontvang je na het versturen van je aanvraag
                </p>
              </div>
            )}
          </>
        )}

        {/* Bureau fee - always shown when there are billable items */}
        {hasBillableItems && (
          <div className="flex items-center justify-between py-2.5 px-3 bg-primary/10 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Coördinatiefee</p>
              <p className="text-xs text-muted-foreground">Wij regelen de communicatie met alle aanbieders</p>
            </div>
            <span className="text-sm font-medium">€ {bureauFee}</span>
          </div>
        )}
      </div>

      {/* Pricing summary */}
      {hasBillableItems && (
        <div className="border-t pt-3 mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Indicatief subtotaal</span>
            <span>€ {indicativeTotal.toLocaleString("nl-NL")}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Coördinatiefee ({numberOfPeople} pers.)</span>
            <span>€ {bureauFee}</span>
          </div>
          <div className="flex justify-between font-semibold text-foreground pt-2 border-t">
            <span>Indicatief totaal</span>
            <span>€ {(indicativeTotal + bureauFee).toLocaleString("nl-NL")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            * Prijzen zijn indicatief. Exacte prijzen na overleg met aanbieders.
          </p>
        </div>
      )}

      {/* Self-arranged only message */}
      {!hasBillableItems && groupedBlocks.self_arranged.length > 0 && (
        <div className="border-t pt-3 mt-4 text-sm text-muted-foreground">
          <p>Je hebt alleen "zelf te regelen" items geselecteerd. Voeg activiteiten of catering toe voor een complete aanvraag.</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 space-y-2">
        <Button
          onClick={onSubmit}
          className="w-full"
          size="lg"
          disabled={effectiveDates.length === 0 || numberOfPeople < 1 || !hasBillableItems}
        >
          Controleren en aanvragen
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          onClick={() => setIsShareDialogOpen(true)}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <Share2 className="mr-2 h-4 w-4" />
          Deel programma
        </Button>
      </div>
      <p className="text-xs text-center text-muted-foreground mt-2">
        Je kunt alles nog controleren en je gegevens invullen
      </p>

      {/* Share Dialog */}
      <ShareProgramDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        cartItems={cartItems}
        numberOfPeople={numberOfPeople}
        selectedDate={effectiveDates[0]}
        selectedDates={effectiveDates}
      />
    </Card>
  );
};
