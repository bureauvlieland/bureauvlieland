/**
 * MAP-omgeving (Mijnactiviteitenplanner) per aanbieder, uit de openbare
 * partnerview. Nodig om in de wizard de live beschikbaarheid van een
 * MAP-activiteit te tonen; de bouwstenenlijst zelf bevat die slug niet.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePublicPartnerMapSlugs = (enabled = true) => {
  const { data } = useQuery({
    queryKey: ["public-partner-map-slugs"],
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase
        .from("partners_public")
        .select("id, map_tenant_slug")
        .not("map_tenant_slug", "is", null);
      if (error) throw error;
      const map = new Map<string, string>();
      for (const row of data ?? []) {
        if (row.id && row.map_tenant_slug) map.set(row.id, row.map_tenant_slug);
      }
      return map;
    },
  });
  return data ?? new Map<string, string>();
};
