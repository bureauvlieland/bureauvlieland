import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Maximize2, Share2 } from "lucide-react";
import { EmptyCartTips } from "./EmptyCartTips";
import { cn } from "@/lib/utils";
import { type CartItemDetail, calculateIndicativeTotal } from "@/types/buildingBlock";
import { ProgramEditor } from "./ProgramEditor";
import { ProgramEditorSheet } from "./ProgramEditorSheet";
import { ShareProgramDialog } from "./ShareProgramDialog";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import { trackBeginCheckout } from "@/lib/analytics";
import { getEntryPage, inferEventTypeFromPath } from "@/lib/entryPageTracker";

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
  onCategoryFilter?: (category: import("@/types/buildingBlock").BuildingBlockCategory | "all") => void;
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
  onCategoryFilter,
  // Legacy fallback
  selectedDate,
  onDateChange,
}: ConfiguratorCartProps) => {
  const [isEditorSheetOpen, setIsEditorSheetOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const { data: allBlocks = [] } = usePublishedBuildingBlocks();
  

  // Use selectedDates if available, otherwise fall back to legacy selectedDate
  const effectiveDates = selectedDates.length > 0 
    ? selectedDates 
    : (selectedDate ? [selectedDate] : []);

  // Track begin_checkout when modal is about to open
  const handleSubmit = () => {
    // Get blocks for value calculation
    const blocks = cartItems
      .map(item => getBlockById(allBlocks, item.blockId))
      .filter(Boolean);
    
    const indicativeValue = calculateIndicativeTotal(blocks as any[], numberOfPeople);
    
    // Get entry page data for attribution
    const entryPage = getEntryPage();
    const inferredEventType = entryPage ? inferEventTypeFromPath(entryPage.path) : null;
    
    trackBeginCheckout({
      itemsCount: cartItems.length,
      value: indicativeValue,
      numberOfPeople,
      numberOfDays: effectiveDates.length || 1,
      eventType: inferredEventType || undefined,
      entryPage: entryPage?.path,
      utmSource: entryPage?.utm_source,
      utmMedium: entryPage?.utm_medium,
      utmCampaign: entryPage?.utm_campaign,
    });
    
    onSubmit();
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
        <EmptyCartTips onFilterCategory={onCategoryFilter} />
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("p-5", isInDrawer && "border-0 shadow-none px-1 py-2")}>
        {!isInDrawer && (
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Uw Programma
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {cartItems.length}
              </span>
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsShareDialogOpen(true)}
                title="Deel programma"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditorSheetOpen(true)}
                title="Uitklappen"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <ProgramEditor
          mode="compact"
          cartItems={cartItems}
          numberOfPeople={numberOfPeople}
          selectedDates={effectiveDates}
          onRemoveItem={onRemoveItem}
          onUpdateItem={onUpdateItem}
          onPeopleChange={onPeopleChange}
          onAddDate={handleAddDate}
          onRemoveDate={handleRemoveDate}
          onSubmit={handleSubmit}
          onReorderItems={onReorderItems}
        />
      </Card>

      {/* Expanded Editor Sheet */}
      <ProgramEditorSheet
        isOpen={isEditorSheetOpen}
        onClose={() => setIsEditorSheetOpen(false)}
        cartItems={cartItems}
        numberOfPeople={numberOfPeople}
        selectedDates={effectiveDates}
        onRemoveItem={onRemoveItem}
        onUpdateItem={onUpdateItem}
        onPeopleChange={onPeopleChange}
        onAddDate={handleAddDate}
        onRemoveDate={handleRemoveDate}
        onSubmit={handleSubmit}
        onReorderItems={onReorderItems}
      />

      {/* Share dialog */}
      <ShareProgramDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        cartItems={cartItems}
        numberOfPeople={numberOfPeople}
        selectedDate={effectiveDates[0]}
        selectedDates={effectiveDates}
      />
    </>
  );
};
