import { useState, useEffect, useCallback } from "react";
import { type CartItemDetail } from "@/data/configuratorMockData";

const STORAGE_KEY = "bureauvlieland_program_draft";
const DRAFT_EXPIRY_DAYS = 30;

export interface DraftProgram {
  cartItems: CartItemDetail[];
  numberOfPeople: number;
  selectedDate: string | null;
  savedAt: string;
  manualOrder: boolean; // True if user has manually reordered items
}

interface UseProgramDraftReturn {
  draft: DraftProgram | null;
  hasDraft: boolean;
  saveDraft: (data: Omit<DraftProgram, "savedAt">) => void;
  clearDraft: () => void;
  lastSaved: Date | null;
}

export const useProgramDraft = (): UseProgramDraftReturn => {
  const [draft, setDraft] = useState<DraftProgram | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: DraftProgram = JSON.parse(stored);
        
        // Check if draft has expired
        const savedDate = new Date(parsed.savedAt);
        const now = new Date();
        const daysDiff = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > DRAFT_EXPIRY_DAYS) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        
        setDraft(parsed);
        setLastSaved(savedDate);
      }
    } catch (error) {
      console.error("Error loading draft:", error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveDraft = useCallback((data: Omit<DraftProgram, "savedAt">) => {
    try {
      const draftData: DraftProgram = {
        ...data,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
      setDraft(draftData);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setDraft(null);
      setLastSaved(null);
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  }, []);

  return {
    draft,
    hasDraft: draft !== null && draft.cartItems.length > 0,
    saveDraft,
    clearDraft,
    lastSaved,
  };
};
