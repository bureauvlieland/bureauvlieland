import { format } from "date-fns";
import { CalendarCheck } from "lucide-react";
import { useMapActivities } from "@/hooks/useMapActivities";
import { summarizeDayAvailability } from "@/lib/mapAvailability";

interface MapAvailabilityLineProps {
  tenantSlug: string;
  activityTypeId: number;
  date: Date | undefined;
  groupSize?: number | null;
}

/**
 * Regel met de beschikbaarheid uit Mijnactiviteitenplanner voor de dag van
 * het programmaonderdeel. Informatie, geen blokkade.
 */
export const MapAvailabilityLine = ({ tenantSlug, activityTypeId, date, groupSize }: MapAvailabilityLineProps) => {
  const dayIso = date && !Number.isNaN(date.getTime()) ? format(date, "yyyy-MM-dd") : undefined;
  const { data } = useMapActivities(tenantSlug, dayIso, dayIso, !!dayIso);
  if (!dayIso || !data) return null;
  const availability = summarizeDayAvailability(data, activityTypeId, dayIso, groupSize);
  if (!availability.summary) return null;
  return (
    <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
      <CalendarCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>{availability.summary} <span className="text-muted-foreground/70">(live uit de agenda van de aanbieder)</span></span>
    </p>
  );
};
