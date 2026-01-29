import { useState, useEffect } from "react";
import { format, isPast, isFuture, isToday, isWithinInterval } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarOff, AlertTriangle, CheckCircle2 } from "lucide-react";

interface UnavailabilityPeriod {
  id: string;
  partner_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
}

interface AdminPartnerUnavailabilityProps {
  partnerId: string;
}

export function AdminPartnerUnavailability({ partnerId }: AdminPartnerUnavailabilityProps) {
  const [periods, setPeriods] = useState<UnavailabilityPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUnavailability();
  }, [partnerId]);

  const fetchUnavailability = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("partner_unavailability")
        .select("*")
        .eq("partner_id", partnerId)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setPeriods(data || []);
    } catch (error) {
      console.error("Error fetching unavailability:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPeriodStatus = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    if (isWithinInterval(today, { start, end }) || isToday(start) || isToday(end)) {
      return "active";
    }
    if (isFuture(start)) {
      return "upcoming";
    }
    return "past";
  };

  // Filter out past periods for display, only show active and upcoming
  const relevantPeriods = periods.filter((period) => {
    const status = getPeriodStatus(period.start_date, period.end_date);
    return status === "active" || status === "upcoming";
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Niet beschikbaar periodes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="h-5 w-5" />
          Niet beschikbaar periodes
        </CardTitle>
        <CardDescription>
          Periodes waarin deze partner niet inzetbaar is
        </CardDescription>
      </CardHeader>
      <CardContent>
        {relevantPeriods.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-500 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Geen geblokkeerde periodes</span>
          </div>
        ) : (
          <div className="space-y-3">
            {relevantPeriods.map((period) => {
              const status = getPeriodStatus(period.start_date, period.end_date);
              const isActive = status === "active";

              return (
                <div
                  key={period.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    isActive
                      ? "bg-amber-50 border-amber-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  {isActive && (
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {format(new Date(period.start_date), "d MMM", { locale: nl })}
                        {" – "}
                        {format(new Date(period.end_date), "d MMM yyyy", { locale: nl })}
                      </span>
                      <Badge
                        variant={isActive ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {isActive ? "Nu actief" : "Gepland"}
                      </Badge>
                    </div>
                    {period.reason && (
                      <p className="text-sm text-slate-600 mt-1">
                        {period.reason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {periods.length > relevantPeriods.length && (
          <p className="text-xs text-slate-400 mt-3">
            + {periods.length - relevantPeriods.length} verlopen periode(s) niet getoond
          </p>
        )}
      </CardContent>
    </Card>
  );
}
