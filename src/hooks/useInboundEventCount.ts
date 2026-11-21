/**
 * Teller voor de zijbalk: open taken in cluster "Binnengekomen"
 * (gebeurtenissen van buiten die het bureau nog niet gezien heeft).
 * Gebruikt dezelfde set als de Werkbank (INBOUND_AUTO_TYPES).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { INBOUND_AUTO_TYPES } from "@/lib/projectActivity";

export function useInboundEventCount() {
  return useQuery({
    queryKey: ["werkbank-inbound-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("admin_todos")
        .select("id", { count: "exact", head: true })
        .in("status", ["todo", "in_progress"])
        .in("auto_type", [...INBOUND_AUTO_TYPES]);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}
