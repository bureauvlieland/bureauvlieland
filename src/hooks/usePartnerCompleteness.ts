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
      const [{ data: partner }, { data: blocks }, { data: roomTypes }] = await Promise.all([
        supabase
          .from("partners")
          .select(
            "about_text, image_url, gallery_images, location_lat, location_lng, location_description, website_url, highlight_features, partner_type, accommodation_description, facilities, check_in_time, check_out_time",
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
        supabase
          .from("partner_room_types")
          .select("images")
          .eq("partner_id", partnerId)
          .eq("is_active", true),
      ]);
      if (cancelled || !partner) {
        setIsLoading(false);
        return;
      }
      const input: PartnerCompletenessInput = {
        about_text: partner.about_text ?? null,
        image_url: partner.image_url ?? null,
        gallery_images: (partner.gallery_images as { url: string; alt?: string }[] | null) ?? [],
        location_lat: partner.location_lat ?? null,
        location_lng: partner.location_lng ?? null,
        location_description: partner.location_description ?? null,
        website_url: partner.website_url ?? null,
        highlight_features: (partner.highlight_features as string[] | null) ?? [],
        partner_type: partner.partner_type ?? null,
        accommodation_description: partner.accommodation_description ?? null,
        facilities: partner.facilities ?? [],
        check_in_time: partner.check_in_time ?? null,
        check_out_time: partner.check_out_time ?? null,
        room_types: (roomTypes ?? []).map((rt) => ({ images: rt.images })),
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
