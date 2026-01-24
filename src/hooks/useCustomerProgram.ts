import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type ProgramRequest,
  type ProgramRequestItem,
  type ProgramRequestWithItems,
  calculateStatusSummary,
} from "@/types/programRequest";

interface UseCustomerProgramReturn {
  program: ProgramRequestWithItems | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateItem: (itemId: string, updates: Partial<ProgramRequestItem>) => void;
  removeItem: (itemId: string) => void;
  getPendingChanges: () => PendingChange[];
  submitChanges: () => Promise<boolean>;
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
}

export const useCustomerProgram = (token: string): UseCustomerProgramReturn => {
  const [program, setProgram] = useState<ProgramRequestWithItems | null>(null);
  const [originalItems, setOriginalItems] = useState<ProgramRequestItem[]>([]);
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

      const programWithItems: ProgramRequestWithItems = {
        ...requestData,
        selected_dates: requestData.selected_dates as string[],
        items: (itemsData || []) as ProgramRequestItem[],
      };

      setProgram(programWithItems);
      setOriginalItems(JSON.parse(JSON.stringify(itemsData || [])));
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

  const getPendingChanges = useCallback((): PendingChange[] => {
    if (!program) return [];

    const changes: PendingChange[] = [];

    program.items.forEach((item) => {
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
  }, [program, originalItems]);

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

  const statusSummary = program
    ? calculateStatusSummary(program.items)
    : { total: 0, confirmed: 0, pending: 0, alternative: 0, unavailable: 0, cancelled: 0, progress: 0 };

  return {
    program,
    isLoading,
    error,
    refetch: fetchProgram,
    updateItem,
    removeItem,
    getPendingChanges,
    submitChanges,
    statusSummary,
  };
};
