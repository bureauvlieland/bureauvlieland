import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProgramEditor, type ProgramEditorProps } from "./ProgramEditor";

interface ProgramEditorSheetProps extends Omit<ProgramEditorProps, "mode"> {
  isOpen: boolean;
  onClose: () => void;
}

export const ProgramEditorSheet = ({
  isOpen,
  onClose,
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
  isCustomerView,
  readOnlyFields,
}: ProgramEditorSheetProps) => {
  const handleSubmit = () => {
    onSubmit();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[70vw] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SheetTitle className="text-xl">Programma bewerken</SheetTitle>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden px-6 py-4">
          <ProgramEditor
            mode="expanded"
            cartItems={cartItems}
            numberOfPeople={numberOfPeople}
            selectedDates={selectedDates}
            onRemoveItem={onRemoveItem}
            onUpdateItem={onUpdateItem}
            onPeopleChange={onPeopleChange}
            onAddDate={onAddDate}
            onRemoveDate={onRemoveDate}
            onSubmit={handleSubmit}
            onReorderItems={onReorderItems}
            isCustomerView={isCustomerView}
            readOnlyFields={readOnlyFields}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
