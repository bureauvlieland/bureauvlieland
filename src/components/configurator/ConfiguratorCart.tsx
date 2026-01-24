import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ShoppingCart, ArrowRight, Building2, Users2, Info, Share2 } from "lucide-react";
import { ShareProgramDialog } from "./ShareProgramDialog";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
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
  selectedDate: Date | undefined;
  onRemoveItem: (blockId: string) => void;
  onUpdateItem: (blockId: string, updates: Partial<CartItemDetail>) => void;
  onPeopleChange: (count: number) => void;
  onDateChange: (date: Date | undefined) => void;
  onSubmit: () => void;
  onReorderItems?: (items: CartItemDetail[]) => void;
  isInDrawer?: boolean;
}

export const ConfiguratorCart = ({
  cartItems,
  numberOfPeople,
  selectedDate,
  onRemoveItem,
  onUpdateItem,
  onPeopleChange,
  onDateChange,
  onSubmit,
  onReorderItems,
  isInDrawer = false,
}: ConfiguratorCartProps) => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  
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

  // Sort items by time (keeping manual order if set)
  const sortedCartItems = useMemo(() => {
    return [...cartItems].sort((a, b) => {
      // Both flexible? Keep original order
      if (!a.preferredTime && !b.preferredTime) return 0;
      // Flexible to bottom
      if (!a.preferredTime) return 1;
      if (!b.preferredTime) return -1;
      // Sort by time
      return a.preferredTime.localeCompare(b.preferredTime);
    });
  }, [cartItems]);

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

  const renderBlockGroup = (blockList: BuildingBlock[], groupId: string) => {
    const groupItems = blockList.map((block) => {
      const cartItem = getCartItem(block.id);
      return cartItem ? { block, cartItem } : null;
    }).filter(Boolean) as { block: BuildingBlock; cartItem: CartItemDetail }[];

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
            />
          ))}
        </SortableContext>
      </DndContext>
    );
  };

  // For simplified view with all items sortable together
  const renderAllItemsSortable = () => {
    const allItems = sortedCartItems.map((item) => {
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
        Begin met het invullen van je groepsgrootte en gewenste datum.
      </p>

      {/* People and date inputs - MOVED TO TOP */}
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
            Aanbieders controleren de beschikbaarheid
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate
                  ? format(selectedDate, "d MMMM yyyy", { locale: nl })
                  : "Selecteer datum"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background z-50 pointer-events-auto" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onDateChange}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Separator and activities header */}
      <div className="border-t pt-4 mb-3">
        <h4 className="font-medium text-sm mb-1">Gekozen activiteiten</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Sleep activiteiten in de gewenste dagvolgorde
        </p>
      </div>

      {/* All items sortable in drawer mode, grouped otherwise */}
      <div className="space-y-3">
        {isInDrawer ? (
          renderAllItemsSortable()
        ) : (
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
          disabled={!selectedDate || numberOfPeople < 1 || !hasBillableItems}
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
        selectedDate={selectedDate}
      />
    </Card>
  );
};
