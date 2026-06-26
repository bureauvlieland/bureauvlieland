import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateOverallCompleteness,
  type CompletenessResult,
  type PartnerCompletenessInput,
} from "@/lib/partnerCompleteness";

interface UsePartnerCompletenessOptions {
  partnerId: string | null;
}

/**
 * Haalt partnerprofiel + bouwstenen op en berekent overall completeness.
 * Gebruikt door dashboard-banner, sidebar progress en bouwstenen-pagina.
 */
export const usePartnerCompleteness = ({ partnerId }: UsePartnerCompletenessOptions) => {
  const [data, setData] = useState<CompletenessResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!partnerId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const [{ data: partner }, { data: blocks }] = await Promise.all([
        supabase
          .from("partners")
          .select(
            "about_text, image_url, gallery_images, location_lat, location_lng, location_description, website_url, highlight_features",
          )
          .eq("id", partnerId)
          .maybeSingle(),
        supabase
          .from("building_blocks")
          .select(
            "short_description, description, image_url, image_asset, price_adult, price_display_override, duration, min_people, max_people, tags, location_address",
          )
          .eq("provider_id", partnerId)
          .neq("status", "concept"),
      ]);
      if (cancelled || !partner) {
        setIsLoading(false);
        return;
      }
      const input: PartnerCompletenessInput = {
        about_text: (partner as any).about_text ?? null,
        image_url: (partner as any).image_url ?? null,
        gallery_images: ((partner as any).gallery_images ?? []) as any,
        location_lat: (partner as any).location_lat ?? null,
        location_lng: (partner as any).location_lng ?? null,
        location_description: (partner as any).location_description ?? null,
        website_url: (partner as any).website_url ?? null,
        highlight_features: ((partner as any).highlight_features ?? []) as any,
      };
      setData(calculateOverallCompleteness(input, (blocks ?? []) as any));
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  return { completeness: data, isLoading };
};
