import { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, ArrowRight, Trash2, Users, Calendar, Clock, Pencil, Sparkles, GripVertical, BookOpen, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { MultiDatePicker } from "./MultiDatePicker";
import { DayTabs } from "./DayTabs";
import { FerryDeparturePicker } from "./FerryDeparturePicker";
import { AddActivitySheet } from "@/components/customer-portal/AddActivitySheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AiErwinDialog } from "./AiErwinDialog";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import { getBlockImage } from "@/lib/buildingBlockUtils";
import { sortCartItemsForDay } from "@/lib/cartSorting";
import { categoryLabels, timeSlots, type CartItemDetail } from "@/types/buildingBlock";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProgramTemplate } from "@/types/programTemplate";
import { useTemplatesByDuration } from "@/hooks/useProgramTemplates";
import { TemplatePreviewSheet } from "./TemplatePreviewSheet";
import { toast } from "@/hooks/use-toast";

const FERRY_BLOCK_IDS = ["boot-enkel-heen", "boot-enkel-terug"];

/* ── Inline time + notes controls ── */
const InlineItemControls = ({
  item,
  onUpdate,
}: {
  item: CartItemDetail;
  onUpdate: (updates: Partial<CartItemDetail>) => void;
}) => {
  const [showNotes, setShowNotes] = useState(item.notes.length > 0);

  return (
    <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
      {/* Time selector */}
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Select
          value={item.preferredTime || "flexibel"}
          onValueChange={(value) => onUpdate({ preferredTime: value === "flexibel" ? null : value })}
        >
          <SelectTrigger className="h-7 text-xs flex-1 max-w-[180px]">
            <SelectValue placeholder="Gewenste tijd" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {timeSlots.map((slot) => (
              <SelectItem key={slot.value} value={slot.value} className="text-xs">
                {slot.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      {!showNotes ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground hover:text-foreground gap-1 px-1.5"
          onClick={() => setShowNotes(true)}
        >
          <Plus className="h-3 w-3" />
          <MessageSquare className="h-3 w-3" />
          Opmerking toevoegen
        </Button>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Opmerking
            </span>
          </div>
          <Textarea
            value={item.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Bijv. Engelstalige gids gewenst..."
            className="text-xs min-h-[50px] resize-none"
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {item.notes.length}/500
          </p>
        </div>
      )}
    </div>
  );
};

interface ProgramBuilderViewProps {
  cartItems: CartItemDetail[];
  numberOfPeople: number;
  selectedDates: Date[];
  onRemoveItem: (blockId: string) => void;
  onAddItem: (blockId: string, dayIndex: number) => void;
  onUpdateItem: (blockId: string, updates: Partial<CartItemDetail>) => void;
  onReorderItems: (items: CartItemDetail[]) => void;
  onSubmit: () => void;
  onUpdatePeople: (count: number) => void;
  onAddDate: (date: Date) => boolean;
  onRemoveDate: (dateIndex: number) => void;
  onReplaceWithSuggestion: (items: CartItemDetail[]) => void;
  onLoadTemplate: (template: ProgramTemplate) => void;
  eventType?: string;
  contactName?: string;
}

/* ── Sortable card wrapper ── */
const SortableItemCard = ({
  item,
  children,
}: {
  item: CartItemDetail;
  children: React.ReactNode;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.blockId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1.5">
      <button
        className="mt-3 p-1 rounded-md cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

export const ProgramBuilderView = ({
  cartItems,
  numberOfPeople,
  selectedDates,
  onRemoveItem,
  onAddItem,
  onUpdateItem,
  onReorderItems,
  onSubmit,
  onUpdatePeople,
  onAddDate,
  onRemoveDate,
  onReplaceWithSuggestion,
  onLoadTemplate,
  eventType,
  contactName,
}: ProgramBuilderViewProps) => {
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();
  const { data: templates = [] } = useTemplatesByDuration(selectedDates.length);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isErwinOpen, setIsErwinOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [editPeople, setEditPeople] = useState(false);
  const [editDates, setEditDates] = useState(false);
  const [tempPeople, setTempPeople] = useState(numberOfPeople);
  const [ferryErrors, setFerryErrors] = useState<Set<string>>(new Set());

  // Validate ferry blocks have a selected time before submit
  const handleSubmitWithValidation = useCallback(() => {
    const ferryItemsMissingTime = cartItems.filter(
      (item) => FERRY_BLOCK_IDS.includes(item.blockId) && !item.preferredTime
    );
    if (ferryItemsMissingTime.length > 0) {
      setFerryErrors(new Set(ferryItemsMissingTime.map((i) => i.blockId)));
      toast({
        title: "Afvaarttijd ontbreekt",
        description: "Selecteer een afvaarttijd of kies 'Weet ik nog niet' voor de overtocht.",
        variant: "destructive",
      });
      return;
    }
    setFerryErrors(new Set());
    onSubmit();
  }, [cartItems, onSubmit]);

  // Clear ferry error when a time is selected
  const handleUpdateItemClearError = useCallback(
    (blockId: string, updates: Partial<CartItemDetail>) => {
      if (updates.preferredTime && ferryErrors.has(blockId)) {
        setFerryErrors((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      }
      onUpdateItem(blockId, updates);
    },
    [onUpdateItem, ferryErrors]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const existingBlockIds = useMemo(
    () => cartItems.map((item) => item.blockId),
    [cartItems]
  );

  const itemCountPerDay = useMemo(() => {
    return selectedDates.map((_, dayIndex) =>
      cartItems.filter((item) => (item.dayIndex ?? 0) === dayIndex).length
    );
  }, [cartItems, selectedDates]);

  const totalDays = selectedDates.length || 1;
  const getItemsForDay = (dayIndex: number) =>
    sortCartItemsForDay(
      cartItems.filter((item) => (item.dayIndex ?? 0) === dayIndex),
      dayIndex,
      totalDays
    );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cartItems.findIndex((item) => item.blockId === active.id);
      const newIndex = cartItems.findIndex((item) => item.blockId === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderItems(arrayMove(cartItems, oldIndex, newIndex));
      }
    }
  };

  const handleAddActivity = (blockId: string) => {
    onAddItem(blockId, activeDay);
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
            {/* Editable people count */}
            <Popover open={editPeople} onOpenChange={(open) => { setEditPeople(open); if (open) setTempPeople(numberOfPeople); }}>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors group">
                  <Users className="h-3.5 w-3.5" />
                  {numberOfPeople} personen
                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="start" side="bottom" sideOffset={8}>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Aantal personen</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={tempPeople}
                    onChange={(e) => setTempPeople(Number(e.target.value))}
                    className="h-9"
                  />
                  <Button size="sm" className="h-9" onClick={() => { onUpdatePeople(tempPeople); setEditPeople(false); }}>
                    OK
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Editable dates */}
            <Popover open={editDates} onOpenChange={setEditDates}>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors group">
                  <Calendar className="h-3.5 w-3.5" />
                  {selectedDates.length === 1
                    ? format(selectedDates[0], "d MMMM yyyy", { locale: nl })
                    : `${selectedDates.length} dagen`}
                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start" side="bottom" sideOffset={8}>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Datum(s)</label>
                <MultiDatePicker
                  selectedDates={selectedDates}
                  onAddDate={onAddDate}
                  onRemoveDate={onRemoveDate}
                />
              </PopoverContent>
            </Popover>

            {eventType && (
              <Badge variant="secondary" className="text-xs">
                {eventType}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsTemplatesOpen(true)}>
              <BookOpen className="h-3.5 w-3.5" />
              Voorbeeldprogramma's
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsErwinOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" />
            Erwin's voorstel
          </Button>
        </div>
      </div>

      {/* Day tabs + timeline */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <DayTabs
          selectedDates={selectedDates}
          activeDay={activeDay}
          onDayChange={setActiveDay}
          itemCountPerDay={itemCountPerDay}
        >
          {(dayIndex) => {
            const dayItems = getItemsForDay(dayIndex);
            return (
              <SortableContext items={dayItems.map((i) => i.blockId)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {dayItems.map((item) => {
                    const block = getBlockById(allBlocks, item.blockId);
                    if (!block) return null;
                    const image = getBlockImage(block);
                    const hasImage = image !== "/placeholder.svg";
                    const isFerryBlock = FERRY_BLOCK_IDS.includes(item.blockId);
                    const isBikeBlock = item.blockId === "fiets-huur";
                    const ferryExtras = isFerryBlock ? (block.price_extras as { portFrom?: string; portTo?: string } | null) : null;
                    const isRegularBlock = !isFerryBlock && !isBikeBlock;

                    return (
                      <SortableItemCard key={item.blockId} item={item}>
                        <div className="space-y-2">
                          <Card className={`flex gap-3 overflow-hidden transition-shadow ${isBikeBlock ? 'border-dashed border-primary/30 bg-primary/[0.03] hover:shadow-md' : 'hover:shadow-md'}`}>
                            {hasImage && (
                              <div className="w-20 sm:w-28 shrink-0">
                                <img src={image} alt={block.name} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            )}
                            <div className="flex-1 py-3 px-3 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm md:text-base leading-tight">{block.name}</h4>
                                  {item.preferredTime && isFerryBlock && (
                                    <p className="text-primary text-xs font-medium mt-0.5">
                                      Gekozen afvaart: {item.preferredTime}
                                    </p>
                                  )}
                                  {!item.preferredTime && isBikeBlock && (
                                    <p className="text-primary/70 text-xs mt-0.5 italic">
                                      Voor de duur van het verblijf
                                    </p>
                                  )}
                                  {!isRegularBlock && !isBikeBlock && !item.preferredTime && block.short_description && (
                                    <p className="text-muted-foreground text-xs md:text-sm mt-0.5 line-clamp-2">
                                      {block.short_description}
                                    </p>
                                  )}
                                  {isRegularBlock && block.short_description && (
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

                                  {/* Inline time & notes for regular blocks */}
                                  {isRegularBlock && (
                                    <InlineItemControls
                                      item={item}
                                      onUpdate={(updates) => onUpdateItem(item.blockId, updates)}
                                    />
                                  )}
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

                          {/* Ferry departure picker */}
                          {isFerryBlock && ferryExtras?.portFrom && ferryExtras?.portTo && selectedDates[dayIndex] && (
                            <div className="ml-4 pl-4 border-l-2 border-primary/20">
                              <FerryDeparturePicker
                                portFrom={ferryExtras.portFrom}
                                portTo={ferryExtras.portTo}
                                date={selectedDates[dayIndex]}
                                selectedTime={item.preferredTime}
                                onSelect={(time) => handleUpdateItemClearError(item.blockId, { preferredTime: time })}
                                hasError={ferryErrors.has(item.blockId)}
                              />
                            </div>
                          )}
                        </div>
                      </SortableItemCard>
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
              </SortableContext>
            );
          }}
        </DayTabs>
      </DndContext>

      {/* Floating submit bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {cartItems.length} {cartItems.length === 1 ? "onderdeel" : "onderdelen"} geselecteerd
          </p>
          <Button size="lg" className="gap-2" onClick={handleSubmitWithValidation} disabled={cartItems.length === 0}>
            <ArrowRight className="h-4 w-4" />
            Overzicht en versturen
          </Button>
        </div>
      </div>

      {/* Add Activity Sheet */}
      <AddActivitySheet
        open={isAddSheetOpen}
        onOpenChange={setIsAddSheetOpen}
        existingBlockIds={existingBlockIds}
        onAddActivity={handleAddActivity}
      />

      {/* AI Erwin Dialog */}
      <AiErwinDialog
        open={isErwinOpen}
        onOpenChange={setIsErwinOpen}
        numberOfPeople={numberOfPeople}
        selectedDates={selectedDates}
        eventType={eventType}
        onSuggestionReady={onReplaceWithSuggestion}
      />

      {/* Template Picker Sheet */}
      <Sheet open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col overflow-hidden">
          <SheetHeader>
            <SheetTitle>Voorbeeldprogramma's</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="overflow-hidden hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => setPreviewTemplateId(template.id)}
              >
                {template.image_url && (
                  <div className="aspect-[16/7] overflow-hidden bg-muted">
                    <img src={template.image_url} alt={template.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="p-3">
                  <h4 className="font-semibold text-sm">{template.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{template.duration_days === 1 ? "1 dag" : `${template.duration_days} dagen`}</span>
                  </div>
                  {template.short_description && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{template.short_description}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Template Preview */}
      <TemplatePreviewSheet
        templateId={previewTemplateId}
        numberOfPeople={numberOfPeople}
        open={!!previewTemplateId}
        onOpenChange={(open) => !open && setPreviewTemplateId(null)}
        onUseTemplate={(template) => {
          setPreviewTemplateId(null);
          setIsTemplatesOpen(false);
          onLoadTemplate(template);
        }}
      />
    </div>
  );
};
