import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { type CartItemDetail } from "@/data/configuratorMockData";
import { useProgramDraft, type DraftProgram } from "@/hooks/useProgramDraft";

interface CartContextType {
  cartItems: CartItemDetail[];
  numberOfPeople: number;
  selectedDate: Date | undefined;
  manualOrder: boolean;
  lastSaved: Date | null;
  itemJustAdded: boolean;
  addToCart: (blockId: string) => boolean;
  removeFromCart: (blockId: string) => void;
  updateItem: (blockId: string, updates: Partial<CartItemDetail>) => void;
  reorderItems: (items: CartItemDetail[]) => void;
  setNumberOfPeople: (count: number) => void;
  setSelectedDate: (date: Date | undefined) => void;
  clearCart: () => void;
  isInCart: (blockId: string) => boolean;
  restoreDraft: () => void;
  hasPendingDraft: boolean;
  pendingDraft: DraftProgram | null;
  dismissDraft: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { draft, hasDraft, saveDraft, clearDraft, lastSaved } = useProgramDraft();

  const [cartItems, setCartItems] = useState<CartItemDetail[]>([]);
  const [numberOfPeople, setNumberOfPeople] = useState(20);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [manualOrder, setManualOrder] = useState(false);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [itemJustAdded, setItemJustAdded] = useState(false);
  const addAnimationTimeoutRef = useRef<NodeJS.Timeout>();

  // Check for existing draft on mount
  useEffect(() => {
    if (hasDraft && draft && !isInitialized) {
      setHasPendingDraft(true);
    }
    setIsInitialized(true);
  }, [hasDraft, draft, isInitialized]);

  // Auto-save draft when cart changes
  const saveCurrentDraft = useCallback(() => {
    if (cartItems.length > 0 && isInitialized) {
      saveDraft({
        cartItems,
        numberOfPeople,
        selectedDate: selectedDate?.toISOString() || null,
        manualOrder,
      });
    }
  }, [cartItems, numberOfPeople, selectedDate, manualOrder, saveDraft, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    
    const timeoutId = setTimeout(() => {
      saveCurrentDraft();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [cartItems, numberOfPeople, selectedDate, saveCurrentDraft, isInitialized]);

  const restoreDraft = useCallback(() => {
    if (draft) {
      setCartItems(draft.cartItems);
      setNumberOfPeople(draft.numberOfPeople);
      setSelectedDate(draft.selectedDate ? new Date(draft.selectedDate) : undefined);
      setManualOrder(draft.manualOrder);
    }
    setHasPendingDraft(false);
  }, [draft]);

  const dismissDraft = useCallback(() => {
    clearDraft();
    setHasPendingDraft(false);
  }, [clearDraft]);

  const addToCart = useCallback((blockId: string): boolean => {
    if (cartItems.find(item => item.blockId === blockId)) {
      return false;
    }
    setCartItems((prev) => [...prev, {
      blockId,
      preferredTime: null,
      notes: "",
    }]);
    
    // Trigger animation
    if (addAnimationTimeoutRef.current) {
      clearTimeout(addAnimationTimeoutRef.current);
    }
    setItemJustAdded(true);
    addAnimationTimeoutRef.current = setTimeout(() => {
      setItemJustAdded(false);
    }, 600);
    
    return true;
  }, [cartItems]);

  const removeFromCart = useCallback((blockId: string) => {
    setCartItems((prev) => prev.filter((item) => item.blockId !== blockId));
  }, []);

  const updateItem = useCallback((blockId: string, updates: Partial<CartItemDetail>) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.blockId === blockId ? { ...item, ...updates } : item
      )
    );
  }, []);

  const reorderItems = useCallback((newItems: CartItemDetail[]) => {
    setCartItems(newItems);
    setManualOrder(true);
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setSelectedDate(undefined);
    setManualOrder(false);
    clearDraft();
  }, [clearDraft]);

  const isInCart = useCallback((blockId: string) => {
    return cartItems.some(item => item.blockId === blockId);
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        numberOfPeople,
        selectedDate,
        manualOrder,
        lastSaved,
        itemJustAdded,
        addToCart,
        removeFromCart,
        updateItem,
        reorderItems,
        setNumberOfPeople,
        setSelectedDate,
        clearCart,
        isInCart,
        restoreDraft,
        hasPendingDraft,
        pendingDraft: draft,
        dismissDraft,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
