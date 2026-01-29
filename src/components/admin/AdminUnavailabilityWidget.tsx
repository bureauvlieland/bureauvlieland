import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format, isWithinInterval, isToday, isFuture, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CalendarOff, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

interface UnavailabilityPeriod {
  id: string;
  partner_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  partner_name: string;
}

export function AdminUnavailabilityWidget() {
  const [periods, setPeriods] = useState<UnavailabilityPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUnavailability();
  }, []);

  const fetchUnavailability = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const nextWeek = addDays(today, 7);
      
      // Fetch all unavailability periods that are active or upcoming (within 7 days)
      const { data: unavailabilityData, error: unavError } = await supabase
        .from("partner_unavailability")
        .select("id, partner_id, start_date, end_date, reason")
        .gte("end_date", today.toISOString().split("T")[0])
        .order("start_date", { ascending: true });

      if (unavError) throw unavError;

      // Fetch partner names
      const partnerIds = [...new Set((unavailabilityData || []).map(p => p.partner_id))];
      
      if (partnerIds.length === 0) {
        setPeriods([]);
        return;
      }

      const { data: partnersData, error: partnerError } = await supabase
        .from("partners")
        .select("id, name")
        .in("id", partnerIds);

      if (partnerError) throw partnerError;

      const partnerMap = new Map(partnersData?.map(p => [p.id, p.name]) || []);

      // Filter to only active or upcoming within 7 days
      const relevantPeriods = (unavailabilityData || [])
        .filter(period => {
          const startDate = new Date(period.start_date);
          const endDate = new Date(period.end_date);
          
          // Active now
          if (isWithinInterval(today, { start: startDate, end: endDate }) || isToday(startDate) || isToday(endDate)) {
            return true;
          }
          
          // Upcoming within 7 days
          if (isFuture(startDate) && startDate <= nextWeek) {
            return true;
          }
          
          return false;
        })
        .map(period => ({
          ...period,
          partner_name: partnerMap.get(period.partner_id) || "Onbekend",
        }));

      setPeriods(relevantPeriods);
    } catch (error) {
      console.error("Error fetching unavailability:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isActive = (startDate: string, endDate: string) => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return isWithinInterval(today, { start, end }) || isToday(start) || isToday(end);
  };

  const activeCount = periods.filter(p => isActive(p.start_date, p.end_date)).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Partner Beschikbaarheid
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="h-5 w-5" />
          Partner Beschikbaarheid
        </CardTitle>
        <CardDescription>
          Geblokkeerde periodes (nu en komende 7 dagen)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {periods.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Alle partners zijn beschikbaar</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            {activeCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm text-amber-800 font-medium">
                  {activeCount} partner{activeCount !== 1 ? "s" : ""} momenteel niet beschikbaar
                </span>
              </div>
            )}

            {/* List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {periods.slice(0, 5).map((period) => {
                const active = isActive(period.start_date, period.end_date);
                return (
                  <Link
                    key={period.id}
                    to={`/admin/partners/${period.partner_id}`}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-colors hover:bg-slate-50 ${
                      active ? "bg-amber-50/50 border-amber-200" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {active && (
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{period.partner_name}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(period.start_date), "d MMM", { locale: nl })}
                          {" – "}
                          {format(new Date(period.end_date), "d MMM", { locale: nl })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={active ? "destructive" : "secondary"} className="text-xs flex-shrink-0">
                      {active ? "Nu" : "Binnenkort"}
                    </Badge>
                  </Link>
                );
              })}
            </div>

            {periods.length > 5 && (
              <p className="text-xs text-slate-500 text-center">
                + {periods.length - 5} meer
              </p>
            )}

            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/admin/partners">
                Alle partners bekijken
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
