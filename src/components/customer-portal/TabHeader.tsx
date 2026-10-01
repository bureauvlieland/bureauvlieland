import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, Users, Hash } from "lucide-react";
import { PortalHead, type PortalHeadFact } from "@/components/system";
import type { PillTone } from "@/components/system";

export interface TabHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  /** Hoogstens één status bij de kop. */
  badge?: { label: string; tone?: PillTone };
  selectedDates?: Date[];
  numberOfPeople?: number;
  referenceNumber?: string | null;
  className?: string;
}

/**
 * De kop van een tabblad: `PortalHead` met de titel van dit onderwerp, één
 * regel feiten (datum, personen, kenmerk) en één status. De teksten komen
 * uit `tabHeaderConfig.ts`, zodat elke weergave hetzelfde zegt.
 */
export const TabHeader = ({
  icon: Icon,
  title,
  subtitle,
  badge,
  selectedDates,
  numberOfPeople,
  referenceNumber,
  className,
}: TabHeaderProps) => {
  const dateRange =
    selectedDates && selectedDates.length > 0
      ? selectedDates.length === 1
        ? format(selectedDates[0], "EEE d MMM yyyy", { locale: nl })
        : `${format(selectedDates[0], "d MMM", { locale: nl })} t/m ${format(
            selectedDates[selectedDates.length - 1],
            "d MMM yyyy",
            { locale: nl },
          )}`
      : null;

  const facts: PortalHeadFact[] = [];
  if (dateRange) facts.push({ key: "datum", icon: <Calendar />, label: dateRange });
  if (numberOfPeople) facts.push({ key: "personen", icon: <Users />, label: `${numberOfPeople} personen` });
  if (referenceNumber) facts.push({ key: "kenmerk", icon: <Hash />, label: referenceNumber });

  return (
    <PortalHead
      icon={<Icon />}
      title={title}
      description={subtitle || undefined}
      facts={facts}
      status={badge ? { label: badge.label, tone: badge.tone } : null}
      className={className}
    />
  );
};
