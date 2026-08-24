import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildActiveStructure, resolveFeeStructure, sumBillableRevisions } from "@/lib/feeEngine";
import type { FeeStructureSet, PricingStructureRow, ProgramRevisionCharge } from "@/types/pricing";

/**
 * Actieve prijsstructuur uit `pricing_structures`. Alleen bedoeld voor nieuwe
 * projecten en de admin-instellingen; bestaande projecten gebruiken hun snapshot.
 */
export function usePricingStructures() {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["pricing-structures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_structures")
        .select("*")
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PricingStructureRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const activeStructure: FeeStructureSet = buildActiveStructure(rows);

  return { rows, isLoading, activeStructure };
}

/**
 * Feestructuur voor één project: snapshot wint, actieve structuur als fallback.
 */
export function useProjectFeeStructure(snapshot: unknown): FeeStructureSet {
  const { activeStructure } = usePricingStructures();
  return resolveFeeStructure(snapshot, activeStructure);
}

/** Wijzigingsrondes van een project (na klantakkoord). */
export function useRevisionCharges(requestId: string | undefined) {
  const { data: charges = [] } = useQuery({
    queryKey: ["program-revision-charges", requestId],
    enabled: Boolean(requestId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_revision_charges")
        .select("*")
        .eq("request_id", requestId!)
        .order("round", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProgramRevisionCharge[];
    },
  });

  return { charges, billableTotal: sumBillableRevisions(charges) };
}
