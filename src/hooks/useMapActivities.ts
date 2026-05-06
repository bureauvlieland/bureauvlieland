import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const mapImageUrl = (ref: string | null) =>
  ref ? `https://portal.mijnactiviteitenplanner.nl/File/Get?reference=${ref}` : null;

// Matches actual MAP API v1 response fields for GET /activities
export interface MapActivity {
  Id: number;
  ActivityTypeName: string;
  ActivityTypeId: number;
  Departure: string;
  PricePerPerson: number;
  PricePerChild: number | null;
  MaxPersons: number;
  MaxBookings: number;
  NumberOfPersonsBooked: number;
  BookingCount: number;
  RemainingSlots: number;
  IsActive: boolean;
  IsCancelled: boolean;
  Duration: number | null; // hours
  Notes: string | null;
  Description: string | null;
}

export interface MapActivityType {
  Id: number;
  Name: string;
  Description: string;
  Duration: number | null;
  IsAvailableOnline: boolean;
  Image: string | null;
  OnlinePaymentsDisabled: boolean;
  BookingTimeBuffer: number | null;
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

          const [activitiesRes, typesRes] = await Promise.all([
            supabase.functions.invoke("map-proxy", {
              body: {
                endpoint: "activities",
                slug: partner.map_tenant_slug,
                partnerId: partner.id,
                params,
              },
            }),
            supabase.functions.invoke("map-proxy", {
              body: {
                endpoint: "activitytypes",
                slug: partner.map_tenant_slug,
                partnerId: partner.id,
              },
            }),
          ]);

          if (activitiesRes.error) {
            console.warn(`MAP fetch failed for ${partner.name}:`, activitiesRes.error);
            return [];
          }

          const types = (typesRes.data || []) as MapActivityType[];
          const typeImageMap = new Map(types.map((t) => [t.Id, t.Image]));
          const onlineAvailableMap = new Map(types.map((t) => [t.Id, t.IsAvailableOnline]));

          return ((activitiesRes.data || []) as MapActivity[])
            // Respect MAP "online beschikbaar" flag — verberg types die niet online boekbaar zijn
            .filter((a) => onlineAvailableMap.get(a.ActivityTypeId) !== false)
            .map((a) => ({
              ...a,
              _partnerId: partner.id,
              _partnerName: partner.name,
              _partnerSlug: partner.map_tenant_slug!,
              _partnerImage: partner.image_url,
              _image: mapImageUrl(typeImageMap.get(a.ActivityTypeId) || null),
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
