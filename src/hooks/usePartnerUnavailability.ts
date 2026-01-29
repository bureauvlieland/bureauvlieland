import { useState, useEffect, useMemo } from "react";
import { isWithinInterval, isToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface UnavailabilityPeriod {
  id: string;
  partner_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

interface PartnerUnavailabilityMap {
  [partnerId: string]: {
    isCurrentlyUnavailable: boolean;
    hasUpcoming: boolean;
    periods: UnavailabilityPeriod[];
  };
}

export function usePartnerUnavailability(partnerIds?: string[]) {
  const [unavailabilityMap, setUnavailabilityMap] = useState<PartnerUnavailabilityMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUnavailability();
  }, [partnerIds?.join(",")]);

  const fetchUnavailability = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      let query = supabase
        .from("partner_unavailability")
        .select("*")
        .gte("end_date", todayStr);

      if (partnerIds && partnerIds.length > 0) {
        query = query.in("partner_id", partnerIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Build the map
      const map: PartnerUnavailabilityMap = {};
      
      (data || []).forEach(period => {
        if (!map[period.partner_id]) {
          map[period.partner_id] = {
            isCurrentlyUnavailable: false,
            hasUpcoming: false,
            periods: [],
          };
        }

        const startDate = new Date(period.start_date);
        const endDate = new Date(period.end_date);

        // Check if currently unavailable
        if (
          isWithinInterval(today, { start: startDate, end: endDate }) ||
          isToday(startDate) ||
          isToday(endDate)
        ) {
          map[period.partner_id].isCurrentlyUnavailable = true;
        } else if (startDate > today) {
          map[period.partner_id].hasUpcoming = true;
        }

        map[period.partner_id].periods.push(period);
      });

      setUnavailabilityMap(map);
    } catch (error) {
      console.error("Error fetching partner unavailability:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    unavailabilityMap,
    isLoading,
    refetch: fetchUnavailability,
  };
}

export function usePartnerUnavailabilityStatus(partnerId: string) {
  const { unavailabilityMap, isLoading } = usePartnerUnavailability([partnerId]);
  
  const status = useMemo(() => {
    const partnerData = unavailabilityMap[partnerId];
    return {
      isCurrentlyUnavailable: partnerData?.isCurrentlyUnavailable || false,
      hasUpcoming: partnerData?.hasUpcoming || false,
      periods: partnerData?.periods || [],
    };
  }, [unavailabilityMap, partnerId]);

  return { ...status, isLoading };
}
