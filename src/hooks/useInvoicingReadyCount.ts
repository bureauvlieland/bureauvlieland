import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Counts how many projects are waiting on invoicing action:
 * - program_requests with completion_status in ('ready_for_invoice','partially_invoiced')
 * - standalone accommodation_requests (no linked program) in the same states
 *
 * Used as the badge on the "Facturatie" sidebar item.
 */
export function useInvoicingReadyCount() {
  return useQuery({
    queryKey: ["invoicing-ready-count"],
    queryFn: async () => {
      const [programRes, accRes] = await Promise.all([
        supabase
          .from("program_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .in("completion_status", ["ready_for_invoice", "partially_invoiced"]),
        supabase
          .from("accommodation_requests")
          .select("id", { count: "exact", head: true })
          .is("linked_program_id", null)
          .in("completion_status", ["ready_for_invoice", "partially_invoiced"]),
      ]);

      if (programRes.error) throw programRes.error;
      if (accRes.error) throw accRes.error;

      return (programRes.count || 0) + (accRes.count || 0);
    },
    refetchInterval: 60000,
  });
}
