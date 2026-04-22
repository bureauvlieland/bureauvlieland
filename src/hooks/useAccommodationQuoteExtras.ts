import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AccommodationQuoteExtra } from "@/types/accommodationExtras";

export function useAccommodationQuoteExtras(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["accommodation-quote-extras", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      if (!quoteId) return [] as AccommodationQuoteExtra[];

      const { data, error } = await supabase
        .from("accommodation_quote_extras")
        .select("*")
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []) as AccommodationQuoteExtra[];
    },
  });
}
