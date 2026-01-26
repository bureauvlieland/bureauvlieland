import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type ProgramRequestItem,
  type ProgramRequestHistory,
  type ProgramRequestWithItems,
  calculateStatusSummary,
} from "@/types/programRequest";

export interface BillingDetails {
  billing_company_name: string;
  billing_kvk_number: string;
  billing_vat_number: string;
  billing_address_street: string;
  billing_address_postal: string;
  billing_address_city: string;
  billing_contact_name: string;
  billing_contact_email: string;
  billing_reference: string;
}

interface UseCustomerProgramReturn {
  program: ProgramRequestWithItems | null;
  history: ProgramRequestHistory[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateItem: (itemId: string, updates: Partial<ProgramRequestItem>) => void;
  removeItem: (itemId: string) => void;
  addItem: (blockId: string, dayIndex: number, preferredTime: string | null, notes: string) => void;
  getPendingChanges: () => PendingChange[];
  submitChanges: () => Promise<boolean>;
  updateProgramDetails: (updates: { selectedDates?: Date[]; numberOfPeople?: number }) => Promise<boolean>;
  updateBillingDetails: (details: BillingDetails) => Promise<boolean>;
  acceptTerms: (signatureName?: string) => Promise<boolean>;
  cancelRequest: (reason?: string) => Promise<boolean>;
  statusSummary: ReturnType<typeof calculateStatusSummary>;
}

export interface PendingChange {
  type: "time_changed" | "day_changed" | "notes_changed" | "removed" | "added";
  itemId: string;
  itemName: string;
  providerName: string;
  providerEmail?: string;
  oldValue?: string;
  newValue?: string;
  // For added items
  blockId?: string;
  dayIndex?: number;
  preferredTime?: string | null;
  notes?: string;
}

// Temporary ID prefix for locally added items (before submission)
const TEMP_ID_PREFIX = "temp-";

export const useCustomerProgram = (token: string): UseCustomerProgramReturn => {
  const [program, setProgram] = useState<ProgramRequestWithItems | null>(null);
  const [history, setHistory] = useState<ProgramRequestHistory[]>([]);
  const [originalItems, setOriginalItems] = useState<ProgramRequestItem[]>([]);
  const [addedItems, setAddedItems] = useState<Array<{
    tempId: string;
    blockId: string;
    blockName: string;
    blockCategory: string;
    providerName: string;
    providerId: string;
    providerEmail: string | null;
    blockType: string;
    dayIndex: number;
    preferredTime: string | null;
    notes: string;
    imageUrl: string | null;
    imageAsset: string | null;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgram = useCallback(async () => {
    if (!token) {
      setError("Geen token opgegeven");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch the program request
      const { data: requestData, error: requestError } = await supabase
        .from("program_requests")
        .select("*")
        .eq("customer_token", token)
        .single();

      if (requestError) {
        if (requestError.code === "PGRST116") {
          setError("Programma niet gevonden of verlopen");
        } else {
          throw requestError;
        }
        return;
      }

      // Fetch the items
      const { data: itemsData, error: itemsError } = await supabase
        .from("program_request_items")
        .select("*")
        .eq("request_id", requestData.id)
        .order("day_index", { ascending: true })
        .order("preferred_time", { ascending: true, nullsFirst: false });

      if (itemsError) throw itemsError;

      // Get unique block IDs to fetch images
      const blockIds = [...new Set((itemsData || []).map((item: any) => item.block_id))];
      
      // Fetch building block images
      const { data: blocksData } = await supabase
        .from("building_blocks")
        .select("id, image_url, image_asset")
        .in("id", blockIds);
      
      // Create a lookup map for images
      const imageMap = new Map((blocksData || []).map((b: any) => [b.id, { image_url: b.image_url, image_asset: b.image_asset }]));
      
      // Merge image data onto items
      const itemsWithImages = (itemsData || []).map((item: any) => {
        const imageData = imageMap.get(item.block_id);
        return {
          ...item,
          image_url: imageData?.image_url || null,
          image_asset: imageData?.image_asset || null,
        };
      });

      // Fetch history
      const { data: historyData } = await supabase
        .from("program_request_history")
        .select("*")
        .eq("request_id", requestData.id)
        .order("created_at", { ascending: false });

      const programWithItems: ProgramRequestWithItems = {
        ...requestData,
        selected_dates: requestData.selected_dates as string[],
        items: itemsWithImages as ProgramRequestItem[],
      };

      setProgram(programWithItems);
      setOriginalItems(JSON.parse(JSON.stringify(itemsData || [])));
      setHistory((historyData || []) as ProgramRequestHistory[]);
    } catch (err) {
      console.error("Error fetching program:", err);
      setError("Er ging iets mis bij het ophalen van je programma");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const updateItem = useCallback((itemId: string, updates: Partial<ProgramRequestItem>) => {
    setProgram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
      };
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    // If it's a temp item (added but not submitted), remove from addedItems
    if (itemId.startsWith(TEMP_ID_PREFIX)) {
      setAddedItems((prev) => prev.filter((item) => item.tempId !== itemId));
      setProgram((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== itemId),
        };
      });
      return;
    }
    
    // For existing items, mark as cancelled
    setProgram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, status: "cancelled" as const } : item
        ),
      };
    });
  }, []);

  const addItem = useCallback(async (
    blockId: string, 
    dayIndex: number, 
    preferredTime: string | null, 
    notes: string
  ) => {
    if (!program) return;

    // Fetch the block details
    const { data: block, error } = await supabase
      .from("building_blocks")
      .select(`
        *,
        provider:partners(id, name, email)
      `)
      .eq("id", blockId)
      .single();

    if (error || !block) {
      console.error("Error fetching block:", error);
      return;
    }

    const tempId = `${TEMP_ID_PREFIX}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to addedItems state
    const newAddedItem = {
      tempId,
      blockId: block.id,
      blockName: block.name,
      blockCategory: block.category,
      providerName: block.provider?.name || "Bureau Vlieland",
      providerId: block.provider?.id || "bureau",
      providerEmail: block.provider?.email || null,
      blockType: block.block_type,
      dayIndex,
      preferredTime,
      notes,
      imageUrl: block.image_url,
      imageAsset: block.image_asset,
    };
    
    setAddedItems((prev) => [...prev, newAddedItem]);

    // Also add to program items for display
    const newProgramItem: ProgramRequestItem = {
      id: tempId,
      request_id: program.id,
      block_id: block.id,
      block_name: block.name,
      block_category: block.category,
      provider_name: block.provider?.name || "Bureau Vlieland",
      provider_id: block.provider?.id || "bureau",
      provider_email: block.provider?.email || null,
      block_type: block.block_type,
      price_indication: block.price_adult ? `€${block.price_adult}` : null,
      duration: block.duration || null,
      day_index: dayIndex,
      preferred_time: preferredTime,
      customer_notes: notes,
      status: "pending",
      status_note: null,
      status_updated_at: null,
      status_updated_by: null,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      executed_at: null,
      quoted_price: null,
      quoted_at: null,
      quoted_notes: null,
      // Image data for display
      image_url: block.image_url,
      image_asset: block.image_asset,
    };

    setProgram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: [...prev.items, newProgramItem],
      };
    });
  }, [program]);

  const getPendingChanges = useCallback((): PendingChange[] => {
    if (!program) return [];

    const changes: PendingChange[] = [];

    program.items.forEach((item) => {
      // Check if this is a newly added item (temp ID)
      if (item.id.startsWith(TEMP_ID_PREFIX)) {
        const addedItem = addedItems.find((a) => a.tempId === item.id);
        if (addedItem) {
          changes.push({
            type: "added",
            itemId: item.id,
            itemName: item.block_name,
            providerName: item.provider_name,
            providerEmail: item.provider_email || undefined,
            blockId: addedItem.blockId,
            dayIndex: addedItem.dayIndex,
            preferredTime: addedItem.preferredTime,
            notes: addedItem.notes,
          });
        }
        return;
      }

      const original = originalItems.find((o) => o.id === item.id);
      if (!original) return;

      // Check for time changes
      if (item.preferred_time !== original.preferred_time) {
        changes.push({
          type: "time_changed",
          itemId: item.id,
          itemName: item.block_name,
          providerName: item.provider_name,
          providerEmail: item.provider_email || undefined,
          oldValue: original.preferred_time || "Flexibel",
          newValue: item.preferred_time || "Flexibel",
        });
      }

      // Check for day changes
      if (item.day_index !== original.day_index) {
        changes.push({
          type: "day_changed",
          itemId: item.id,
          itemName: item.block_name,
          providerName: item.provider_name,
          providerEmail: item.provider_email || undefined,
          oldValue: `Dag ${original.day_index + 1}`,
          newValue: `Dag ${item.day_index + 1}`,
        });
      }

      // Check for cancellation (removal)
      if (item.status === "cancelled" && original.status !== "cancelled") {
        changes.push({
          type: "removed",
          itemId: item.id,
          itemName: item.block_name,
          providerName: item.provider_name,
          providerEmail: item.provider_email || undefined,
        });
      }
    });

    return changes;
  }, [program, originalItems, addedItems]);

  const submitChanges = useCallback(async (): Promise<boolean> => {
    if (!program) return false;

    const changes = getPendingChanges();
    if (changes.length === 0) return true;

    try {
      // Call edge function to update items and send notifications
      const { error } = await supabase.functions.invoke("update-customer-program", {
        body: {
          token: token,
          changes: changes,
          items: program.items,
          origin: window.location.origin, // For test mode detection
        },
      });

      if (error) throw error;

      // Refetch to get updated data
      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error submitting changes:", err);
      return false;
    }
  }, [program, token, getPendingChanges, fetchProgram]);

  const updateProgramDetails = useCallback(async (updates: { 
    selectedDates?: Date[]; 
    numberOfPeople?: number 
  }): Promise<boolean> => {
    if (!program) return false;

    try {
      const programDetails: { selectedDates?: string[]; numberOfPeople?: number } = {};
      
      if (updates.selectedDates) {
        programDetails.selectedDates = updates.selectedDates.map(d => d.toISOString().split("T")[0]);
      }
      if (updates.numberOfPeople) {
        programDetails.numberOfPeople = updates.numberOfPeople;
      }

      const { error } = await supabase.functions.invoke("update-customer-program", {
        body: {
          token: token,
          programDetails,
          origin: window.location.origin, // For test mode detection
        },
      });

      if (error) throw error;

      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error updating program details:", err);
      return false;
    }
  }, [program, token, fetchProgram]);

  const updateBillingDetails = useCallback(async (details: BillingDetails): Promise<boolean> => {
    if (!program) return false;

    try {
      const { error } = await supabase.functions.invoke("update-customer-program", {
        body: {
          token: token,
          billingDetails: details,
          origin: window.location.origin,
        },
      });

      if (error) throw error;

      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error updating billing details:", err);
      return false;
    }
  }, [program, token, fetchProgram]);

  const acceptTerms = useCallback(async (signatureName?: string): Promise<boolean> => {
    if (!program) return false;

    try {
      const { error } = await supabase.functions.invoke("update-customer-program", {
        body: {
          token: token,
          acceptTerms: true,
          signatureName: signatureName || null,
          origin: window.location.origin,
        },
      });

      if (error) throw error;

      await fetchProgram();
      return true;
    } catch (err) {
      console.error("Error accepting terms:", err);
      return false;
    }
  }, [program, token, fetchProgram]);

  const cancelRequest = useCallback(async (reason?: string): Promise<boolean> => {
    if (!program) return false;

    try {
      const { error } = await supabase.functions.invoke("cancel-program-request", {
        body: {
          token: token,
          reason,
          origin: window.location.origin, // For test mode detection
        },
      });

      if (error) throw error;

      // Set program to null to show cancelled state
      setProgram(null);
      setError("Deze aanvraag is geannuleerd");
      return true;
    } catch (err) {
      console.error("Error cancelling request:", err);
      return false;
    }
  }, [program, token]);

  const statusSummary = program
    ? calculateStatusSummary(program.items)
    : { total: 0, confirmed: 0, pending: 0, alternative: 0, unavailable: 0, cancelled: 0, progress: 0 };

  return {
    program,
    history,
    isLoading,
    error,
    refetch: fetchProgram,
    updateItem,
    removeItem,
    addItem,
    getPendingChanges,
    submitChanges,
    updateProgramDetails,
    updateBillingDetails,
    acceptTerms,
    cancelRequest,
    statusSummary,
  };
};
