import { useMemo, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Building2, Users2, Info, Share2, ChevronDown } from "lucide-react";
import { EmptyCartTips } from "./EmptyCartTips";
import { CartItemDetails } from "./CartItemDetails";
import { ShareProgramDialog } from "./ShareProgramDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { MultiDatePicker } from "./MultiDatePicker";
import { DayTabs } from "./DayTabs";

import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
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
import { groupBlocksByType, type BuildingBlock, type CartItemDetail } from "@/types/buildingBlock";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import { SortableCartItem } from "./SortableCartItem";

export interface ProgramEditorProps {
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
  mode: "compact" | "expanded";
  isCustomerView?: boolean;
  readOnlyFields?: string[];
}

export const ProgramEditor = ({
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
  mode,
  isCustomerView = false,
  readOnlyFields = [],
}: ProgramEditorProps) => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [highlightedDay, setHighlightedDay] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const prevItemsRef = useRef<CartItemDetail[]>(cartItems);
  const { toast } = useToast();
  
  // Fetch blocks from database
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();

  const isExpanded = mode === "expanded";
  const isReadOnly = (field: string) => readOnlyFields.includes(field);

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

  const effectiveDates = selectedDates.length > 0 ? selectedDates : [];

  // Detect day changes and show feedback
  useEffect(() => {
    if (prevItemsRef.current.length === 0) {
      prevItemsRef.current = cartItems;
      return;
    }

    const changedItem = cartItems.find((item) => {
      const prevItem = prevItemsRef.current.find(p => p.blockId === item.blockId);
      return prevItem && prevItem.dayIndex !== item.dayIndex;
    });

    if (changedItem && effectiveDates.length > 1) {
      const block = getBlockById(allBlocks, changedItem.blockId);
      const newDayIndex = changedItem.dayIndex ?? 0;
      const targetDate = effectiveDates[newDayIndex];
      
      toast({
        title: `"${block?.name}" verplaatst`,
        description: targetDate 
          ? `Nu op Dag ${newDayIndex + 1}` 
          : `Verplaatst naar dag ${newDayIndex + 1}`,
        action: (
          <ToastAction altText="Bekijk" onClick={() => setActiveDay(newDayIndex)}>
            Bekijk
          </ToastAction>
        ),
      });

      setHighlightedDay(newDayIndex);
      setTimeout(() => setHighlightedDay(null), 800);
      setActiveDay(newDayIndex);
    }

    prevItemsRef.current = cartItems;
  }, [cartItems, effectiveDates, toast]);

  const blocks = cartItems
    .map((item) => getBlockById(allBlocks, item.blockId))
    .filter(Boolean) as BuildingBlock[];
  const groupedBlocks = groupBlocksByType(blocks);

  const hasBillableItems = groupedBlocks.bureau.length > 0 || groupedBlocks.partner.length > 0;

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

  const renderDayItems = (dayIndex: number) => {
    const dayItems = getItemsForDay(dayIndex);
    
    const allItems = dayItems.map((item) => {
      const block = getBlock(item.blockId);
      return block ? { block, cartItem: item } : null;
    }).filter(Boolean) as { block: BuildingBlock; cartItem: CartItemDetail }[];

    return (
      <div className="space-y-2">
        {allItems.map(({ block, cartItem }) => (
          <CartItemDetails
            key={block.id}
            block={block}
            item={cartItem}
            onUpdate={(updates) => onUpdateItem(block.id, updates)}
            onRemove={() => onRemoveItem(block.id)}
            selectedDates={effectiveDates}
            showDaySelector={effectiveDates.length > 1}
          />
        ))}
      </div>
    );
  };

  const renderBlockGroup = (blockList: BuildingBlock[], groupId: string, dayIndex?: number) => {
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

  if (cartItems.length === 0) {
    return (
      <div className="py-8 px-4">
        <EmptyCartTips />
      </div>
    );
  }

  // Expanded mode layout (two columns)
  if (isExpanded) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 grid md:grid-cols-5 gap-6 overflow-hidden">
          {/* Left column: Settings */}
          <div className="md:col-span-2 space-y-5 overflow-y-auto pr-2">
            <div>
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                Programma Details
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="numberOfPeople-expanded" className="text-sm font-medium">
                    Aantal personen
                  </Label>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Wijzig het aantal personen voor uw groep
                  </p>
                  <Input
                    id="numberOfPeople-expanded"
                    type="number"
                    min={1}
                    max={500}
                    value={numberOfPeople}
                    onChange={(e) => onPeopleChange(parseInt(e.target.value, 10) || 1)}
                    disabled={isReadOnly("numberOfPeople")}
                    className="max-w-[200px]"
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
                    onAddDate={onAddDate}
                    onRemoveDate={onRemoveDate}
                  />
                </div>
              </div>
            </div>

            {/* Pricing summary */}
            {hasBillableItems && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm mb-2">Indicatief prijsoverzicht</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotaal excl. BTW</span>
                    <span>€ {Math.round(indicativeTotal / 1.21).toLocaleString("nl-NL")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>BTW (21%)</span>
                    <span>€ {Math.round(indicativeTotal - indicativeTotal / 1.21).toLocaleString("nl-NL")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Coördinatiefee ({numberOfPeople} pers.)</span>
                    <span>€ {bureauFee}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground pt-2 border-t">
                    <span>Indicatief totaal incl. BTW</span>
                    <span>€ {(indicativeTotal + bureauFee).toLocaleString("nl-NL")}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  * Prijzen zijn indicatief incl. 21% BTW. Exacte prijzen na bevestiging door aanbieders.
                </p>
              </div>
            )}
          </div>

          {/* Right column: Activities by day */}
          <div className="md:col-span-3 flex flex-col overflow-hidden">
            <h3 className="font-semibold text-base mb-3">
              Dag overzicht
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({cartItems.length} {cartItems.length === 1 ? "activiteit" : "activiteiten"})
              </span>
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {effectiveDates.length > 1 ? (
                <DayTabs
                  selectedDates={effectiveDates}
                  activeDay={activeDay}
                  onDayChange={setActiveDay}
                  itemCountPerDay={itemCountPerDay}
                  highlightedDay={highlightedDay}
                >
                  {(dayIndex) => renderDayItems(dayIndex)}
                </DayTabs>
              ) : (
                <>
                  {groupedBlocks.bureau.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span>Gefactureerd door Bureau Vlieland</span>
                      </div>
                      <div className="space-y-2 ml-6 bg-muted/50 rounded-lg p-2">
                        {renderBlockGroup(groupedBlocks.bureau, "bureau")}
                      </div>
                    </div>
                  )}

                  {groupedBlocks.partner.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Users2 className="h-4 w-4 text-primary" />
                        <span>Gefactureerd door aanbieders</span>
                      </div>
                      <div className="space-y-2 ml-6 bg-muted/50 rounded-lg p-2">
                        {renderBlockGroup(groupedBlocks.partner, "partner")}
                      </div>
                    </div>
                  )}

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
                        Links ontvangt u na het versturen van uw aanvraag
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Bureau fee */}
              {hasBillableItems && (
                <div className="flex items-center justify-between py-2.5 px-3 bg-primary/10 rounded-lg mt-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Coördinatiefee</p>
                    <p className="text-xs text-muted-foreground">Wij regelen de communicatie met alle aanbieders</p>
                  </div>
                  <span className="text-sm font-medium">€ {bureauFee}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t pt-4 mt-4 flex items-center justify-between gap-4">
          <Button
            onClick={() => setIsShareDialogOpen(true)}
            variant="outline"
            size="sm"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Deel programma
          </Button>
          
          <Button
            onClick={onSubmit}
            size="lg"
            disabled={effectiveDates.length === 0 || numberOfPeople < 1 || !hasBillableItems}
          >
            {isCustomerView ? "Wijziging aanvragen" : "Controleren en aanvragen"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <ShareProgramDialog
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          cartItems={cartItems}
          numberOfPeople={numberOfPeople}
          selectedDate={effectiveDates[0]}
          selectedDates={effectiveDates}
        />
      </div>
    );
  }

  // Compact mode (original sidebar layout)
  // (detailsOpen state moved to top of component)

  const dateSummary = effectiveDates.length > 0
    ? effectiveDates.map(d => format(d, "d MMM", { locale: nl })).join(", ")
    : "Geen datum";

  return (
    <div className="space-y-3">
      {/* Collapsible people & date summary */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-left">
            <span className="text-sm font-medium">
              {numberOfPeople} personen — {dateSummary}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <div>
            <Label htmlFor="numberOfPeople" className="text-sm font-medium">
              Hoeveel personen?
            </Label>
            <Input
              id="numberOfPeople"
              type="number"
              min={1}
              max={500}
              value={numberOfPeople}
              onChange={(e) => onPeopleChange(parseInt(e.target.value, 10) || 1)}
              disabled={isReadOnly("numberOfPeople")}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Wanneer willen jullie komen?</Label>
            <div className="mt-1">
              <MultiDatePicker
                selectedDates={effectiveDates}
                onAddDate={onAddDate}
                onRemoveDate={onRemoveDate}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Activities - flat list, no billing groups */}
      <div className="space-y-2">
        {effectiveDates.length > 1 ? (
          <DayTabs
            selectedDates={effectiveDates}
            activeDay={activeDay}
            onDayChange={setActiveDay}
            itemCountPerDay={itemCountPerDay}
            highlightedDay={highlightedDay}
          >
            {(dayIndex) => renderDayItems(dayIndex)}
          </DayTabs>
        ) : (
          renderDayItems(0)
        )}
      </div>

      {/* Simplified pricing */}
      {hasBillableItems && (
        <div className="border-t pt-3">
          <div className="flex justify-between font-semibold text-base">
            <span>Indicatief totaal</span>
            <span>€ {(indicativeTotal + bureauFee).toLocaleString("nl-NL")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            * Exacte prijzen na bevestiging door aanbieders
          </p>
        </div>
      )}

      {/* Self-arranged only message */}
      {!hasBillableItems && groupedBlocks.self_arranged.length > 0 && (
        <div className="border-t pt-3 text-sm text-muted-foreground">
          <p>U hebt alleen "zelf te regelen" items geselecteerd. Voeg activiteiten of catering toe voor een complete aanvraag.</p>
        </div>
      )}

      {/* Sticky CTA */}
      <div className="sticky bottom-0 bg-background pt-3 pb-1 border-t -mx-1 px-1">
        <Button
          onClick={onSubmit}
          className="w-full text-base font-semibold"
          size="lg"
          disabled={effectiveDates.length === 0 || numberOfPeople < 1 || !hasBillableItems}
        >
          {isCustomerView ? "Wijziging aanvragen" : "Vrijblijvend aanvragen"}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-1.5">
          Je kunt alles nog controleren en je gegevens invullen
        </p>
      </div>

      <ShareProgramDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        cartItems={cartItems}
        numberOfPeople={numberOfPeople}
        selectedDate={effectiveDates[0]}
        selectedDates={effectiveDates}
      />
    </div>
  );
};
