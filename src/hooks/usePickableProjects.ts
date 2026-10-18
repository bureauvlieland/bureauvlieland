import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PickableProject {
  id: string;
  reference_number: string | null;
  customer_name: string | null;
  customer_company: string | null;
  status?: string | null;
}

/** Dezelfde projectlijst als de registratiedialoog; gedeeld via de query-cache. */
export function usePickableProjects(enabled = true) {
  return useQuery({
    queryKey: ["program-requests-all-list"],
    enabled,
    queryFn: async (): Promise<PickableProject[]> => {
      const { data, error } = await supabase
        .from("program_requests")
        .select("id, reference_number, customer_name, customer_company, created_at, status")
        .not("status", "in", "(cancelled,deleted)")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as PickableProject[];
    },
  });
}

export const projectLabel = (p: PickableProject | undefined | null) =>
  p ? `${p.reference_number || "Geen ref"} — ${p.customer_company || p.customer_name || ""}` : "";

