import { useState, useMemo } from "react";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { nl } from "date-fns/locale";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPlanningCalendar } from "@/components/partner-portal/PartnerPlanningCalendar";
import { usePartnerDashboard } from "@/hooks/usePartnerDashboard";
import { useMapActivities } from "@/hooks/useMapActivities";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const PartnerPlanning = () => {
  const [searchParams] = useSearchParams();
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  );
  const weekEnd = useMemo(() => addWeeks(currentWeekStart, 1), [currentWeekStart]);

  const dateStart = format(currentWeekStart, "yyyy-MM-dd");
  const dateEnd = format(weekEnd, "yyyy-MM-dd");

  // Get partner info including map_tenant_slug
  const { data: partnerInfo } = useQuery({
    queryKey: ["partner-planning-info"],
    queryFn: async () => {
      const impersonateId = searchParams.get("impersonate");
      if (impersonateId) {
        const { data } = await supabase
          .from("partners")
          .select("id, partner_token, map_tenant_slug")
          .eq("id", impersonateId)
          .single();
        return data;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data } = await supabase
        .from("partners")
        .select("id, partner_token, map_tenant_slug")
        .eq("auth_user_id", session.user.id)
        .eq("is_active", true)
        .single();
      return data;
    },
  });

  const { data: dashboardData, isLoading: dashLoading } = usePartnerDashboard(
    partnerInfo?.partner_token || ""
  );

  const { data: mapActivities = [], isLoading: mapLoading } = useMapActivities(
    partnerInfo?.map_tenant_slug || null,
    dateStart,
    dateEnd,
    !!partnerInfo?.map_tenant_slug,
    partnerInfo?.id
  );

  const isLoading = dashLoading || mapLoading;

  return (
    <PartnerLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Planning</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset((o) => o - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(0)}
              className="text-xs"
            >
              Vandaag
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset((o) => o + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground ml-2">
              {format(currentWeekStart, "d MMM", { locale: nl })} –{" "}
              {format(addWeeks(currentWeekStart, 1), "d MMM yyyy", { locale: nl })}
            </span>
          </div>
        </div>

        <PartnerPlanningCalendar
          weekStart={currentWeekStart}
          mapActivities={mapActivities}
          bvItems={dashboardData?.items || []}
          isLoading={isLoading}
        />
      </div>
    </PartnerLayout>
  );
};

export default PartnerPlanning;
