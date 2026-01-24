import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { ConfiguratorCart } from "./ConfiguratorCart";
import { RequestFormModal } from "./RequestFormModal";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

export const GlobalCartDrawer = () => {
  const location = useLocation();
  const { toast } = useToast();
  const {
    cartItems,
    numberOfPeople,
    selectedDate,
    selectedDates,
    lastSaved,
    itemJustAdded,
    removeFromCart,
    updateItem,
    setNumberOfPeople,
    setSelectedDate,
    addDate,
    removeDate,
    reorderItems,
  } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Don't show on the programma-samenstellen page (it has its own implementation)
  const isOnConfiguratorPage = location.pathname === "/programma-samenstellen";

  const handleSubmit = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Geen items geselecteerd",
        description: "Voeg eerst bouwstenen toe aan je programma.",
        variant: "destructive",
      });
      return;
    }
    setIsModalOpen(true);
  };

  // Show floating button on all pages
  return (
    <>
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button
            size="lg"
            className={`fixed bottom-4 right-4 z-40 shadow-lg gap-2 transition-transform ${isOnConfiguratorPage ? 'lg:hidden' : ''} ${itemJustAdded ? 'animate-cart-pulse' : ''}`}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden sm:inline">Jouw programma</span>
            {cartItems.length > 0 && (
              <span className={`bg-white text-primary text-xs font-bold px-2 py-0.5 rounded-full ${itemJustAdded ? 'animate-badge-pop' : ''}`}>
                {cartItems.length}
              </span>
            )}
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left pb-2 border-b">
            <DrawerTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Jouw Programma
              {cartItems.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
                </span>
              )}
            </DrawerTitle>
            {lastSaved && cartItems.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Automatisch opgeslagen
              </p>
            )}
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6 pt-4">
            {cartItems.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium text-foreground mb-1.5">Je programma is nog leeg</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Stel je eigen programma samen uit activiteiten, catering en vervoer.
                </p>
                <Link to="/programma-samenstellen" onClick={() => setIsOpen(false)}>
                  <Button className="gap-2">
                    Start met samenstellen
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <ConfiguratorCart
                cartItems={cartItems}
                numberOfPeople={numberOfPeople}
                selectedDates={selectedDates}
                selectedDate={selectedDate}
                onRemoveItem={removeFromCart}
                onUpdateItem={updateItem}
                onPeopleChange={setNumberOfPeople}
                onDateChange={setSelectedDate}
                onAddDate={addDate}
                onRemoveDate={removeDate}
                onSubmit={() => {
                  handleSubmit();
                  setIsOpen(false);
                }}
                onReorderItems={reorderItems}
                isInDrawer
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Request Form Modal */}
      <RequestFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cartItems={cartItems}
        numberOfPeople={numberOfPeople}
        selectedDate={selectedDate}
      />
    </>
  );
};
