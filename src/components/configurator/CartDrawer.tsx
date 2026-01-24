import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { ConfiguratorCart } from "./ConfiguratorCart";
import { type CartItemDetail } from "@/data/configuratorMockData";

interface CartDrawerProps {
  cartItems: CartItemDetail[];
  numberOfPeople: number;
  selectedDate: Date | undefined;
  onRemoveItem: (blockId: string) => void;
  onUpdateItem: (blockId: string, updates: Partial<CartItemDetail>) => void;
  onPeopleChange: (count: number) => void;
  onDateChange: (date: Date | undefined) => void;
  onSubmit: () => void;
  onReorderItems: (items: CartItemDetail[]) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lastSaved: Date | null;
}

export const CartDrawer = ({
  cartItems,
  numberOfPeople,
  selectedDate,
  onRemoveItem,
  onUpdateItem,
  onPeopleChange,
  onDateChange,
  onSubmit,
  onReorderItems,
  isOpen,
  onOpenChange,
  lastSaved,
}: CartDrawerProps) => {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-4 right-4 z-40 shadow-lg gap-2 lg:hidden"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>Bekijk programma</span>
          {cartItems.length > 0 && (
            <span className="bg-white text-primary text-xs font-bold px-2 py-0.5 rounded-full">
              {cartItems.length}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left pb-0">
          <DrawerTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Jouw Programma
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
            </span>
          </DrawerTitle>
          {lastSaved && (
            <p className="text-xs text-muted-foreground mt-1">
              Automatisch opgeslagen
            </p>
          )}
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <ConfiguratorCart
            cartItems={cartItems}
            numberOfPeople={numberOfPeople}
            selectedDate={selectedDate}
            onRemoveItem={onRemoveItem}
            onUpdateItem={onUpdateItem}
            onPeopleChange={onPeopleChange}
            onDateChange={onDateChange}
            onSubmit={() => {
              onSubmit();
              onOpenChange(false);
            }}
            onReorderItems={onReorderItems}
            isInDrawer
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};
