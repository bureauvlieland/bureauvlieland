import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type CartItemDetail, calculateIndicativeTotal } from "@/types/buildingBlock";
import { ProgramEditor } from "./ProgramEditor";
import { ProgramEditorSheet } from "./ProgramEditorSheet";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import { trackBeginCheckout } from "@/lib/analytics";

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
  const [isEditorSheetOpen, setIsEditorSheetOpen] = useState(false);
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
    
    trackBeginCheckout({
      itemsCount: cartItems.length,
      value: indicativeValue,
      numberOfPeople,
      numberOfDays: effectiveDates.length || 1,
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
        <div className="text-center text-muted-foreground">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Uw programma is nog leeg</p>
          <p className="text-sm mt-1">Voeg onderdelen toe om te beginnen</p>
        </div>
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
                {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
              </span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditorSheetOpen(true)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="h-4 w-4" />
              <span className="hidden xl:inline">Uitklappen</span>
            </Button>
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
    </>
  );
};
