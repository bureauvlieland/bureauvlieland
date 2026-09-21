import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GoogleReview {
  author_name: string;
  author_uri?: string | null;
  author_photo?: string | null;
  rating: number;
  text: string;
  relative_time?: string | null;
  publish_time?: string | null;
}

export interface GoogleReviewsCache {
  rating: number | null;
  review_count: number;
  reviews: GoogleReview[];
  place_url: string | null;
}

export const REVIEW_LINK_FALLBACK = "https://g.page/r/bureauvlieland/review";

/**
 * De gecachte Google-beoordeling (score, aantal, reviews), één keer per uur
 * opgehaald en gedeeld door de hero, het reviewblok en de klantenquotes.
 */
export const useGoogleReviewsCache = () =>
  useQuery({
    queryKey: ["google-reviews-cache"],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<GoogleReviewsCache | null> => {
      const { data } = await supabase
        .from("google_reviews_cache")
        .select("rating, review_count, reviews, place_url")
        .eq("id", "singleton")
        .maybeSingle();
      return (data as unknown as GoogleReviewsCache | null) ?? null;
    },
  });
