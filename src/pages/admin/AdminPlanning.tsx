import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  addDays,
} from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Activity, Hotel, Users } from "lucide-react";

interface PlanningItem {
  type: "activity" | "arrival" | "departure";
  date: Date;
  label: string;
  sublabel: string;
  linkTo: string;
  status?: string;
  partnerName?: string;
  customerName: string;
  groupSize?: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  proposed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

const AdminPlanningContent = () => {
  const [weekOffset, setWeekOffset] = useState(0);

  const currentWeekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return weekOffset === 0 ? base : addWeeks(base, weekOffset);
  }, [weekOffset]);

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const startStr = format(currentWeekStart, "yyyy-MM-dd");
  const endStr = format(currentWeekEnd, "yyyy-MM-dd");

  // Fetch program request items with proposed_date in range
  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ["planning-items", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_request_items")
        .select("id, block_name, provider_name, status, proposed_date, proposed_time, preferred_time, request_id, day_index")
        .gte("proposed_date", startStr)
        .lte("proposed_date", endStr)
        .neq("status", "cancelled");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch program requests for items (and for date-based fallback)
  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ["planning-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_requests")
        .select("id, customer_name, customer_company, number_of_people, selected_dates, reference_number, status")
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch items without proposed_date that fall in this week based on selected_dates + day_index
  const { data: allItemsNoDates, isLoading: loadingNoDates } = useQuery({
    queryKey: ["planning-items-nodate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_request_items")
        .select("id, block_name, provider_name, status, proposed_date, day_index, request_id, proposed_time, preferred_time")
        .is("proposed_date", null)
        .neq("status", "cancelled");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch accommodation requests with arrival/departure in range
  const { data: accommodations, isLoading: loadingAccom } = useQuery({
    queryKey: ["planning-accommodations", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accommodation_requests")
        .select("id, customer_name, customer_company, number_of_guests, arrival_date, departure_date, status, linked_program_id")
        .or(`arrival_date.gte.${startStr},departure_date.lte.${endStr}`)
        .neq("status", "cancelled");
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingItems || loadingRequests || loadingNoDates || loadingAccom;

  // Build planning items
  const planningItems: PlanningItem[] = useMemo(() => {
    const result: PlanningItem[] = [];
    const requestMap = new Map(requests?.map((r) => [r.id, r]) || []);

    // Items with proposed_date
    items?.forEach((item) => {
      if (!item.proposed_date) return;
      const req = requestMap.get(item.request_id);
      result.push({
        type: "activity",
        date: parseISO(item.proposed_date),
        label: item.block_name,
        sublabel: `${item.provider_name} · ${item.proposed_time || item.preferred_time || ""}`,
        linkTo: `/admin/projecten/${item.request_id}`,
        status: item.status,
        partnerName: item.provider_name,
        customerName: req?.customer_name || "Onbekend",
        groupSize: req?.number_of_people,
      });
    });

    // Items without proposed_date — calculate from selected_dates + day_index
    allItemsNoDates?.forEach((item) => {
      const req = requestMap.get(item.request_id);
      if (!req?.selected_dates) return;
      const dates = req.selected_dates as string[];
      if (!dates.length) return;
      const baseDate = parseISO(dates[0]);
      const itemDate = addDays(baseDate, item.day_index || 0);

      // Check if in current week
      if (itemDate >= currentWeekStart && itemDate <= currentWeekEnd) {
        result.push({
          type: "activity",
          date: itemDate,
          label: item.block_name,
          sublabel: `${item.provider_name} · ${item.preferred_time || ""}`,
          linkTo: `/admin/projecten/${item.request_id}`,
          status: item.status,
          partnerName: item.provider_name,
          customerName: req.customer_name,
          groupSize: req.number_of_people,
        });
      }
    });

    // Accommodation arrivals and departures
    accommodations?.forEach((acc) => {
      if (acc.arrival_date) {
        const arrDate = parseISO(acc.arrival_date);
        if (arrDate >= currentWeekStart && arrDate <= currentWeekEnd) {
          result.push({
            type: "arrival",
            date: arrDate,
            label: `Aankomst: ${acc.customer_name}`,
            sublabel: `${acc.number_of_guests} gasten · ${acc.customer_company || ""}`,
            linkTo: acc.linked_program_id ? `/admin/projecten/${acc.linked_program_id}` : `/admin/logies/${acc.id}`,
            customerName: acc.customer_name,
            groupSize: acc.number_of_guests,
          });
        }
      }
      if (acc.departure_date) {
        const depDate = parseISO(acc.departure_date);
        if (depDate >= currentWeekStart && depDate <= currentWeekEnd) {
          result.push({
            type: "departure",
            date: depDate,
            label: `Vertrek: ${acc.customer_name}`,
            sublabel: `${acc.number_of_guests} gasten`,
            linkTo: acc.linked_program_id ? `/admin/projecten/${acc.linked_program_id}` : `/admin/logies/${acc.id}`,
            customerName: acc.customer_name,
            groupSize: acc.number_of_guests,
          });
        }
      }
    });

    return result;
  }, [items, allItemsNoDates, accommodations, requests, currentWeekStart, currentWeekEnd]);

  const getItemsForDay = (day: Date) =>
    planningItems
      .filter((item) => isSameDay(item.date, day))
      .sort((a, b) => {
        // Arrivals first, then activities, then departures
        const order = { arrival: 0, activity: 1, departure: 2 };
        return order[a.type] - order[b.type];
      });

  const isToday = (day: Date) => isSameDay(day, new Date());

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekplanning</h1>
          <p className="text-sm text-muted-foreground">Operationeel overzicht per week</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(0)}
            className={weekOffset === 0 ? "bg-primary text-primary-foreground" : ""}
          >
            Vandaag
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground ml-2">
            {format(currentWeekStart, "d MMM", { locale: nl })} – {format(currentWeekEnd, "d MMM yyyy", { locale: nl })}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayItems = getItemsForDay(day);
            const today = isToday(day);
            return (
              <Card
                key={day.toISOString()}
                className={`min-h-[200px] ${today ? "ring-2 ring-primary/50" : ""}`}
              >
                <CardHeader className="py-2 px-3">
                  <CardTitle className={`text-xs font-medium ${today ? "text-primary" : "text-muted-foreground"}`}>
                    {format(day, "EEEE", { locale: nl })}
                    <span className={`ml-1 text-base font-bold ${today ? "text-primary" : "text-foreground"}`}>
                      {format(day, "d")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2 space-y-1.5">
                  {dayItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">—</p>
                  ) : (
                    dayItems.map((item, idx) => (
                      <Link
                        key={idx}
                        to={item.linkTo}
                        className="block p-2 rounded-md border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-1.5">
                          {item.type === "activity" ? (
                            <Activity className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                          ) : item.type === "arrival" ? (
                            <Hotel className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Hotel className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{item.customerName}</p>
                            {item.sublabel && (
                              <p className="text-[10px] text-muted-foreground truncate">{item.sublabel}</p>
                            )}
                            {item.status && (
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1 py-0 mt-0.5 ${STATUS_COLORS[item.status] || ""}`}
                              >
                                {item.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Week summary */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-blue-600" />
          <span>{planningItems.filter((i) => i.type === "activity").length} activiteiten</span>
        </div>
        <div className="flex items-center gap-1">
          <Hotel className="h-3 w-3 text-green-600" />
          <span>{planningItems.filter((i) => i.type === "arrival").length} aankomsten</span>
        </div>
        <div className="flex items-center gap-1">
          <Hotel className="h-3 w-3 text-red-500" />
          <span>{planningItems.filter((i) => i.type === "departure").length} vertrekken</span>
        </div>
      </div>
    </div>
  );
};

const AdminPlanning = () => (
  <>
    <Helmet>
      <title>Planning | Bureau Vlieland</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <AdminLayout>
      <AdminPlanningContent />
    </AdminLayout>
  </>
);

export default AdminPlanning;
