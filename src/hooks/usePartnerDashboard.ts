import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PartnerDashboardData, PartnerItem } from "@/types/partner";

export const usePartnerDashboard = (token: string) => {
  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!token) {
      setError("Geen partner token opgegeven");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: result, error: fetchError } = await supabase.functions.invoke(
        "get-partner-dashboard",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          body: null,
        }
      );

      // The function expects query params, but invoke doesn't support them directly
      // So we'll call it differently
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-partner-dashboard?token=${token}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch dashboard");
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      console.error("Error fetching partner dashboard:", err);
      setError(err instanceof Error ? err.message : "Er is een fout opgetreden");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const updateItemStatus = async (
    itemId: string,
    status: string,
    statusNote?: string,
    executedAt?: string,
    quotedPrice?: number,
    quotedNotes?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-partner-item-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            partnerToken: token,
            itemId,
            status,
            statusNote,
            executedAt,
            quotedPrice,
            quotedNotes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      await fetchDashboard();
      return true;
    } catch (err) {
      console.error("Error updating item status:", err);
      return false;
    }
  };

  const registerInvoice = async (
    itemId: string,
    invoicedAmount: number,
    invoicedNumber: string,
    invoicedDate: string,
    notes?: string
  ): Promise<{ success: boolean; commission?: { percentage: number; amount: number } }> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-partner-invoice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            partnerToken: token,
            itemId,
            invoicedAmount,
            invoicedNumber,
            invoicedDate,
            notes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to register invoice");
      }

      const result = await response.json();
      await fetchDashboard();
      return { success: true, commission: result.commission };
    } catch (err) {
      console.error("Error registering invoice:", err);
      return { success: false };
    }
  };

  // Helper to group items by program
  const getItemsByProgram = (): Map<string, PartnerItem[]> => {
    const map = new Map<string, PartnerItem[]>();
    data?.items.forEach((item) => {
      const key = item.request_id;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });
    return map;
  };

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboard,
    updateItemStatus,
    registerInvoice,
    getItemsByProgram,
  };
};
