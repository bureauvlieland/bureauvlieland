import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppSetting, AppSettingsMap, FeeTier } from "@/types/appSettings";
import { 
  FALLBACK_SETTINGS, 
  getCoordinationFee as calcCoordinationFee,
  getVatRate as calcVatRate,
  getCommissionRate as calcCommissionRate,
} from "@/lib/appSettings";

export function useAppSettings() {
  const queryClient = useQueryClient();

  const { data: rawSettings, isLoading, error } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*");
      
      if (error) throw error;
      return data as AppSetting[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Convert raw settings array to typed map
  const settings: Partial<AppSettingsMap> = rawSettings?.reduce((acc, setting) => {
    acc[setting.id as keyof AppSettingsMap] = setting.value as never;
    return acc;
  }, {} as Partial<AppSettingsMap>) ?? {};

  // Merged settings with fallbacks
  const mergedSettings: AppSettingsMap = {
    ...FALLBACK_SETTINGS,
    ...settings,
  };

  // Update mutation
  const updateSetting = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: unknown }) => {
      const { error } = await supabase
        .from("app_settings")
        .update({ 
          value: value as never,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Instelling opgeslagen");
    },
    onError: (error) => {
      console.error("Failed to update setting:", error);
      toast.error("Kon instelling niet opslaan");
    },
  });

  return {
    // Raw data
    rawSettings,
    settings: mergedSettings,
    isLoading,
    error,

    // Mutations
    updateSetting,

    // Helper functions with cached settings
    getCoordinationFee: (numberOfPeople: number) => 
      calcCoordinationFee(numberOfPeople, mergedSettings.coordination_fee_tiers),
    
    getVatRate: (type: "standard" | "accommodation") => 
      calcVatRate(type, mergedSettings),
    
    getCommissionRate: (type: "partner" | "accommodation") => 
      calcCommissionRate(type, mergedSettings),

    // Fee tiers for display
    feeTiers: mergedSettings.coordination_fee_tiers as FeeTier[],
  };
}
