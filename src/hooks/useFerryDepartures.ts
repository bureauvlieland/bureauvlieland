import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FerryDeparture {
  departureTime: string;
  arrivalTime: string;
  vehicleName: string;
  portNameFrom: string;
  portNameTo: string;
  remainingPersonCapacity: number | null;
  isBookable: boolean;
  via: string | null;
}

interface UseFerryDeparturesParams {
  from: string;
  to: string;
  date?: string;
  enabled?: boolean;
}

export function useFerryDepartures({ from, to, date, enabled = true }: UseFerryDeparturesParams) {
  return useQuery<FerryDeparture[]>({
    queryKey: ["ferry-departures", from, to, date],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-ferry-departures", {
        body: { portFrom: from, portTo: to, date },
      });

      if (error) throw new Error(error.message);
      return data as FerryDeparture[];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 1,
  });
}
