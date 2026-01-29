import { useMemo } from "react";
import { format, parseISO, isAfter, addDays, isBefore } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, Clock, Users, ChevronRight, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PartnerItem } from "@/types/partner";

interface PartnerUpcomingActivitiesProps {
  items: PartnerItem[];
  onSelectItem: (item: PartnerItem) => void;
  maxItems?: number;
  daysAhead?: number;
}

export const PartnerUpcomingActivities = ({
  items,
  onSelectItem,
  maxItems = 5,
  daysAhead = 14,
}: PartnerUpcomingActivitiesProps) => {
  const upcomingItems = useMemo(() => {
    const now = new Date();
    const cutoffDate = addDays(now, daysAhead);

    // Helper to determine effective status
    const getEffectiveStatus = (item: PartnerItem) => {
      const hasCustomerAccepted = !!item.customer_accepted_at;
      return (item.status === "confirmed" && hasCustomerAccepted) ? "accepted" : item.status;
    };

    // Filter items that are confirmed/accepted and in the future
    const filtered = items.filter((item) => {
      const effectiveStatus = getEffectiveStatus(item);
      if (!["confirmed", "accepted", "alternative"].includes(effectiveStatus)) return false;

      const dates = (item.program_requests.selected_dates || []) as string[];
      const activityDate = dates[item.day_index];
      if (!activityDate) return false;

      const date = parseISO(activityDate);
      return isAfter(date, now) && isBefore(date, cutoffDate);
    });

    // Sort by date and time
    return filtered
      .sort((a, b) => {
        const datesA = (a.program_requests.selected_dates || []) as string[];
        const datesB = (b.program_requests.selected_dates || []) as string[];
        const dateA = datesA[a.day_index] || "";
        const dateB = datesB[b.day_index] || "";

        const dateCompare = dateA.localeCompare(dateB);
        if (dateCompare !== 0) return dateCompare;

        // Sort by time
        const timeA = a.confirmed_time || a.proposed_time || a.preferred_time || "23:59";
        const timeB = b.confirmed_time || b.proposed_time || b.preferred_time || "23:59";
        return timeA.localeCompare(timeB);
      })
      .slice(0, maxItems);
  }, [items, daysAhead, maxItems]);

  if (upcomingItems.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            Aankomende activiteiten
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground text-center py-4">
            Geen activiteiten gepland in de komende {daysAhead} dagen
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          Aankomende activiteiten
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {upcomingItems.map((item) => {
            const dates = (item.program_requests.selected_dates || []) as string[];
            const activityDate = dates[item.day_index];
            const effectiveTime = item.confirmed_time || item.proposed_time || item.preferred_time;

            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">
                      {activityDate
                        ? format(parseISO(activityDate), "EEE d MMM", { locale: nl })
                        : `Dag ${item.day_index + 1}`}
                    </span>
                    {effectiveTime && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {effectiveTime}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm truncate">{item.block_name}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {item.program_requests.number_of_people}
                    </span>
                  </div>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                  "group-hover:translate-x-0.5"
                )} />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
