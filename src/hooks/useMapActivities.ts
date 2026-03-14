import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MapActivity {
  Id: number;
  Name: string;
  Description: string;
  ActivityTypeName: string;
  ImageUrl: string | null;
  Departure: string;
  StartTime: string;
  EndTime: string;
  Duration: string;
  Price: number;
  ChildPrice: number | null;
  RemainingSlots: number;
  MaxParticipants: number;
  Location: string | null;
  ProviderName: string;
}

export interface MapActivityType {
  Id: number;
  Name: string;
  Description: string;
  ImageUrl: string | null;
}

// Fetch activities from MAP via proxy
export const useMapActivities = (
  slug: string | null,
  dateStart?: string,
  dateEnd?: string,
  enabled = true,
  partnerId?: string
) => {
  return useQuery({
    queryKey: ["map-activities", slug, dateStart, dateEnd],
    queryFn: async () => {
      if (!slug) return [];
      const params: Record<string, string> = {};
      if (dateStart) params.dateStart = dateStart;
      if (dateEnd) params.dateEnd = dateEnd;

      const { data, error } = await supabase.functions.invoke("map-proxy", {
        body: { endpoint: "activities", slug, partnerId, params },
      });

      if (error) throw error;
      return (data || []) as MapActivity[];
    },
    enabled: enabled && !!slug,
    staleTime: 2 * 60 * 1000,
  });
};

// Fetch activity types
export const useMapActivityTypes = (slug: string | null, enabled = true, partnerId?: string) => {
  return useQuery({
    queryKey: ["map-activity-types", slug],
    queryFn: async () => {
      if (!slug) return [];
      const { data, error } = await supabase.functions.invoke("map-proxy", {
        body: { endpoint: "activitytypes", slug, partnerId },
      });
      if (error) throw error;
      return (data || []) as MapActivityType[];
    },
    enabled: enabled && !!slug,
    staleTime: 10 * 60 * 1000,
  });
};

// Fetch all activities across all MAP-linked partners
export const useAllMapActivities = (
  dateStart?: string,
  dateEnd?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["map-activities-all", dateStart, dateEnd],
    queryFn: async () => {
      const { data: partners, error: pError } = await supabase
        .from("partners")
        .select("id, name, map_tenant_slug, image_url")
        .not("map_tenant_slug", "is", null)
        .eq("is_active", true);

      if (pError) throw pError;
      if (!partners || partners.length === 0) return [];

      const results = await Promise.allSettled(
        partners.map(async (partner) => {
          const params: Record<string, string> = {};
          if (dateStart) params.dateStart = dateStart;
          if (dateEnd) params.dateEnd = dateEnd;

          const { data, error } = await supabase.functions.invoke("map-proxy", {
            body: {
              endpoint: "activities",
              slug: partner.map_tenant_slug,
              partnerId: partner.id,
              params,
            },
          });

          if (error) {
            console.warn(`MAP fetch failed for ${partner.name}:`, error);
            return [];
          }

          return ((data || []) as MapActivity[]).map((a) => ({
            ...a,
            _partnerId: partner.id,
            _partnerName: partner.name,
            _partnerSlug: partner.map_tenant_slug!,
            _partnerImage: partner.image_url,
          }));
        })
      );

      return results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => (r as PromiseFulfilledResult<any[]>).value);
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};

// Hook for MAP bookings (admin)
export const useMapBookings = (limit = 20) => {
  return useQuery({
    queryKey: ["map-bookings", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("map_bookings")
        .select("*, partners:partner_id(name)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as any[];
    },
  });
};
