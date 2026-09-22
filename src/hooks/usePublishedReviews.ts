import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PublishedReview } from "@/lib/reviews";

/**
 * De gepubliceerde eigen beoordelingen uit de view `published_reviews`
 * (alleen veilige kolommen), één keer per uur, gedeeld door de homepage en
 * de landings- en activiteitpagina's.
 */
export const usePublishedReviews = () =>
  useQuery({
    queryKey: ["published-reviews"],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<PublishedReview[]> => {
      const { data, error } = await supabase
        .from("published_reviews")
        .select("id, rating, text, author_name, author_role, company, source, tags, created_at, entry_path, block_ids")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .filter((r) => r.id && r.text)
        .map((r) => ({
          id: r.id as string,
          rating: r.rating,
          text: r.text as string,
          author_name: r.author_name ?? "",
          author_role: r.author_role ?? "",
          company: r.company ?? "",
          source: r.source ?? "portal",
          tags: r.tags ?? [],
          created_at: r.created_at ?? "",
          entry_path: r.entry_path ?? "",
          block_ids: r.block_ids ?? [],
        }));
    },
  });
