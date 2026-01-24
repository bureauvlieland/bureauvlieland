import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { type CartItemDetail } from "@/data/configuratorMockData";
import { useProgramDraft, type DraftProgram } from "@/hooks/useProgramDraft";

const MAX_DAYS = 7;

interface CartContextType {
  cartItems: CartItemDetail[];
  numberOfPeople: number;
  selectedDates: Date[];
  manualOrder: boolean;
  lastSaved: Date | null;
  itemJustAdded: boolean;
  addToCart: (blockId: string, dayIndex?: number) => boolean;
  removeFromCart: (blockId: string) => void;
  updateItem: (blockId: string, updates: Partial<CartItemDetail>) => void;
  reorderItems: (items: CartItemDetail[]) => void;
  setNumberOfPeople: (count: number) => void;
  addDate: (date: Date) => boolean;
  removeDate: (dateIndex: number) => void;
  updateItemDay: (blockId: string, newDayIndex: number) => void;
  clearCart: () => void;
  isInCart: (blockId: string) => boolean;
  restoreDraft: () => void;
  hasPendingDraft: boolean;
  pendingDraft: DraftProgram | null;
  dismissDraft: () => void;
  // Legacy compatibility
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { draft, hasDraft, saveDraft, clearDraft, lastSaved } = useProgramDraft();

  const [cartItems, setCartItems] = useState<CartItemDetail[]>([]);
  const [numberOfPeople, setNumberOfPeople] = useState(20);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
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
        selectedDates: selectedDates.map(d => d.toISOString()),
        manualOrder,
      });
    }
  }, [cartItems, numberOfPeople, selectedDates, manualOrder, saveDraft, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    
    const timeoutId = setTimeout(() => {
      saveCurrentDraft();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [cartItems, numberOfPeople, selectedDates, saveCurrentDraft, isInitialized]);

  const restoreDraft = useCallback(() => {
    if (draft) {
      setCartItems(draft.cartItems);
      setNumberOfPeople(draft.numberOfPeople);
      setSelectedDates(draft.selectedDates.map(d => new Date(d)));
      setManualOrder(draft.manualOrder);
    }
    setHasPendingDraft(false);
  }, [draft]);

  const dismissDraft = useCallback(() => {
    clearDraft();
    setHasPendingDraft(false);
  }, [clearDraft]);

  const addToCart = useCallback((blockId: string, dayIndex: number = 0): boolean => {
    if (cartItems.find(item => item.blockId === blockId)) {
      return false;
    }
    setCartItems((prev) => [...prev, {
      blockId,
      preferredTime: null,
      notes: "",
      dayIndex,
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

  const updateItemDay = useCallback((blockId: string, newDayIndex: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.blockId === blockId ? { ...item, dayIndex: newDayIndex } : item
      )
    );
  }, []);

  const reorderItems = useCallback((newItems: CartItemDetail[]) => {
    setCartItems(newItems);
    setManualOrder(true);
  }, []);

  const addDate = useCallback((date: Date): boolean => {
    // Check max days limit
    if (selectedDates.length >= MAX_DAYS) {
      return false;
    }
    // Check if date already exists
    const dateStr = date.toDateString();
    if (selectedDates.some(d => d.toDateString() === dateStr)) {
      return false;
    }
    // Add and sort by date
    setSelectedDates(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
    return true;
  }, [selectedDates]);

  const removeDate = useCallback((dateIndex: number) => {
    // Check if there are items on this day
    const itemsOnDay = cartItems.filter(item => item.dayIndex === dateIndex);
    
    // Remove items or reassign to day 0
    if (itemsOnDay.length > 0) {
      // Move items to previous day or day 0
      setCartItems(prev => prev.map(item => {
        if (item.dayIndex === dateIndex) {
          return { ...item, dayIndex: Math.max(0, dateIndex - 1) };
        }
        if (item.dayIndex > dateIndex) {
          return { ...item, dayIndex: item.dayIndex - 1 };
        }
        return item;
      }));
    } else {
      // Shift dayIndex for items on later days
      setCartItems(prev => prev.map(item => {
        if (item.dayIndex > dateIndex) {
          return { ...item, dayIndex: item.dayIndex - 1 };
        }
        return item;
      }));
    }
    
    setSelectedDates(prev => prev.filter((_, i) => i !== dateIndex));
  }, [cartItems]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setSelectedDates([]);
    setManualOrder(false);
    clearDraft();
  }, [clearDraft]);

  const isInCart = useCallback((blockId: string) => {
    return cartItems.some(item => item.blockId === blockId);
  }, [cartItems]);

  // Legacy compatibility: first date as selectedDate
  const selectedDate = selectedDates.length > 0 ? selectedDates[0] : undefined;
  
  const setSelectedDate = useCallback((date: Date | undefined) => {
    if (date) {
      if (selectedDates.length === 0) {
        setSelectedDates([date]);
      } else {
        // Replace first date
        setSelectedDates(prev => [date, ...prev.slice(1)].sort((a, b) => a.getTime() - b.getTime()));
      }
    } else {
      setSelectedDates([]);
    }
  }, [selectedDates]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        numberOfPeople,
        selectedDates,
        manualOrder,
        lastSaved,
        itemJustAdded,
        addToCart,
        removeFromCart,
        updateItem,
        reorderItems,
        setNumberOfPeople,
        addDate,
        removeDate,
        updateItemDay,
        clearCart,
        isInCart,
        restoreDraft,
        hasPendingDraft,
        pendingDraft: draft,
        dismissDraft,
        // Legacy
        selectedDate,
        setSelectedDate,
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
