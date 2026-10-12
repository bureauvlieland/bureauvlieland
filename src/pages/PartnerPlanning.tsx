import { useState, useMemo } from "react";
import { format, startOfWeek, addWeeks } from "date-fns";
import { nl } from "date-fns/locale";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPlanningCalendar } from "@/components/partner-portal/PartnerPlanningCalendar";
import { usePartnerPortal } from "@/hooks/usePartnerPortal";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { useMapActivities } from "@/hooks/useMapActivities";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const PartnerPlanningContent = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  );
  const weekEnd = useMemo(() => addWeeks(currentWeekStart, 1), [currentWeekStart]);

  const dateStart = format(currentWeekStart, "yyyy-MM-dd");
  const dateEnd = format(weekEnd, "yyyy-MM-dd");

  const { partner, data: dashboardData, isLoading: dashLoading } = usePartnerPortal();
  const partnerInfo = { id: partner.id, map_tenant_slug: partner.map_tenant_slug };

  const { data: mapActivities = [], isLoading: mapLoading } = useMapActivities(
    partnerInfo?.map_tenant_slug || null,
    dateStart,
    dateEnd,
    !!partnerInfo?.map_tenant_slug,
    partnerInfo?.id
  );

  const isLoading = dashLoading || mapLoading;

  return (
    <PartnerPage
      title="Planning"
      icon={<CalendarDays />}
      description="Uw week: de onderdelen van Bureau Vlieland naast de boekingen uit uw eigen agenda."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o - 1)} aria-label="Vorige week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            Vandaag
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o + 1)} aria-label="Volgende week">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm text-muted-foreground">
            {format(currentWeekStart, "d MMM", { locale: nl })} tot {format(addWeeks(currentWeekStart, 1), "d MMM yyyy", { locale: nl })}
          </span>
        </>
      }
    >
        <PartnerPlanningCalendar
          weekStart={currentWeekStart}
          mapActivities={mapActivities}
          bvItems={dashboardData?.items || []}
          isLoading={isLoading}
        />
    </PartnerPage>
  );
};

const PartnerPlanning = () => (
  <PartnerLayout>
    <PartnerPlanningContent />
  </PartnerLayout>
);

export default PartnerPlanning;
