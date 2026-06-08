import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BuildingBlock } from "@/types/buildingBlock";

/**
 * Fetch building blocks tagged for the catering wizard.
 * Includes 'active' + 'published' (concept hidden from public wizard).
 * Doeksen items are excluded per business decision.
 */
export const useCateringBlocks = () => {
  return useQuery({
    queryKey: ["catering-blocks", "wizard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_blocks")
        .select(`
          *,
          provider:partners!building_blocks_provider_id_fkey(id, name, email)
        `)
        .eq("category", "catering")
        .in("status", ["active", "published"])
        .not("catering_type", "is", null)
        .order("sort_order");

      if (error) throw error;

      // Exclude Doeksen items (rederij) — not part of catering wizard
      const filtered = (data ?? []).filter(
        (b: any) => b.provider_id !== "rederij" && !b.id?.startsWith("doeksen-")
      );

      return filtered as unknown as BuildingBlock[];
    },
    staleTime: 5 * 60 * 1000,
  });
};
