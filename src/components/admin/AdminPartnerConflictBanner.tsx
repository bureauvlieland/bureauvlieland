import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, isWithinInterval, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface UnavailabilityPeriod {
  id: string;
  partner_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

interface ConflictInfo {
  itemId: string;
  itemName: string;
  partnerId: string;
  partnerName: string;
  activityDate: string;
  unavailabilityReason: string | null;
  unavailabilityStart: string;
  unavailabilityEnd: string;
}

interface AdminPartnerConflictBannerProps {
  items: Array<{
    id: string;
    block_name: string;
    provider_id: string;
    provider_name: string;
    day_index: number;
  }>;
  selectedDates: string[];
}

export function AdminPartnerConflictBanner({ items, selectedDates }: AdminPartnerConflictBannerProps) {
  const [unavailability, setUnavailability] = useState<UnavailabilityPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get unique provider IDs
  const providerIds = useMemo(() => 
    [...new Set(items.map(item => item.provider_id))],
    [items]
  );

  useEffect(() => {
    if (providerIds.length === 0) {
      setIsLoading(false);
      return;
    }
    fetchUnavailability();
  }, [providerIds.join(",")]);

  const fetchUnavailability = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("partner_unavailability")
        .select("*")
        .in("partner_id", providerIds);

      if (error) throw error;
      setUnavailability(data || []);
    } catch (error) {
      console.error("Error fetching unavailability:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate conflicts
  const conflicts = useMemo((): ConflictInfo[] => {
    if (unavailability.length === 0 || items.length === 0) return [];

    const result: ConflictInfo[] = [];

    items.forEach(item => {
      // Get the date for this item based on day_index
      const activityDate = selectedDates[item.day_index];
      if (!activityDate) return;

      const activityDateObj = parseISO(activityDate);

      // Check if this partner has any unavailability for this date
      unavailability
        .filter(u => u.partner_id === item.provider_id)
        .forEach(u => {
          const startDate = parseISO(u.start_date);
          const endDate = parseISO(u.end_date);

          if (isWithinInterval(activityDateObj, { start: startDate, end: endDate })) {
            result.push({
              itemId: item.id,
              itemName: item.block_name,
              partnerId: item.provider_id,
              partnerName: item.provider_name,
              activityDate,
              unavailabilityReason: u.reason,
              unavailabilityStart: u.start_date,
              unavailabilityEnd: u.end_date,
            });
          }
        });
    });

    return result;
  }, [items, selectedDates, unavailability]);

  if (isLoading || conflicts.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">
        {conflicts.length} beschikbaarheidsconflict{conflicts.length !== 1 ? "en" : ""} gedetecteerd
      </AlertTitle>
      <AlertDescription className="mt-3">
        <div className="space-y-2">
          {conflicts.map((conflict, idx) => (
            <div 
              key={`${conflict.itemId}-${idx}`}
              className="flex items-center justify-between p-2 bg-amber-100/50 rounded border border-amber-200"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  Dag {items.find(i => i.id === conflict.itemId)?.day_index !== undefined 
                    ? items.find(i => i.id === conflict.itemId)!.day_index + 1 
                    : "?"}
                </Badge>
                <div>
                  <span className="font-medium">{conflict.itemName}</span>
                  <span className="text-amber-700 mx-1">—</span>
                  <Link 
                    to={`/admin/partners/${conflict.partnerId}`}
                    className="text-amber-800 hover:underline font-medium"
                  >
                    {conflict.partnerName}
                  </Link>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="text-amber-800">
                  Niet beschikbaar: {format(parseISO(conflict.unavailabilityStart), "d MMM", { locale: nl })} 
                  {" – "}
                  {format(parseISO(conflict.unavailabilityEnd), "d MMM", { locale: nl })}
                </div>
                {conflict.unavailabilityReason && (
                  <div className="text-amber-600 text-xs">
                    {conflict.unavailabilityReason}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-amber-700 mt-3">
          Controleer of er alternatieve partners beschikbaar zijn voor deze activiteiten.
        </p>
      </AlertDescription>
    </Alert>
  );
}

// Hook to get conflict count for a specific item
export function useItemUnavailabilityCheck(
  providerId: string,
  activityDate: string | undefined
): { isUnavailable: boolean; period: UnavailabilityPeriod | null; isLoading: boolean } {
  const [period, setPeriod] = useState<UnavailabilityPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!providerId || !activityDate) {
      setIsLoading(false);
      return;
    }

    const checkUnavailability = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("partner_unavailability")
          .select("*")
          .eq("partner_id", providerId)
          .lte("start_date", activityDate)
          .gte("end_date", activityDate)
          .maybeSingle();

        if (error) throw error;
        setPeriod(data);
      } catch (error) {
        console.error("Error checking unavailability:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUnavailability();
  }, [providerId, activityDate]);

  return {
    isUnavailable: period !== null,
    period,
    isLoading,
  };
}
