import { Calendar, BedDouble, LayoutGrid, Receipt, ClipboardList, FileSignature, Sparkles, MapPin } from "lucide-react";
import { PortalTabs, type PortalTab } from "@/components/system";
import type { PillTone } from "@/components/system";

/** De weergaven van het klantportaal: de tabbladen plus de evenementweergaven. */
export type PortalView =
  | "splash"
  | "accommodation"
  | "program"
  | "practical"
  | "billing"
  | "accept"
  | "today"
  | "map";

export interface TabBadge {
  label: string;
  tone?: PillTone;
}

interface ProgramNavigationProps {
  className?: string;
  isMultiDay?: boolean;
  activeView?: PortalView;
  onNavigate?: (view: PortalView) => void;
  badges?: Partial<Record<PortalView, TabBadge | undefined>>;
  /** Toon "Vandaag" en "Kaart" (evenementmodus). */
  showEventTabs?: boolean;
}

/**
 * De tabbalk van het klantportaal op `PortalTabs` (klantportaal fase 1).
 * Welke tabbladen er zijn hangt af van het programma: Overzicht en Logies
 * alleen bij meerdere dagen, Vandaag en Kaart alleen tijdens het verblijf.
 */
export const ProgramNavigation = ({
  className,
  isMultiDay = false,
  activeView = "program",
  onNavigate,
  badges = {},
  showEventTabs = false,
}: ProgramNavigationProps) => {
  const tab = (key: PortalView, label: string, icon: PortalTab["icon"]): PortalTab => ({
    key,
    label,
    icon,
    badge: badges[key] ?? null,
  });

  const tabs: PortalTab[] = [
    ...(isMultiDay ? [tab("splash", "Overzicht", <LayoutGrid />)] : []),
    ...(showEventTabs ? [tab("today", "Vandaag", <Sparkles />), tab("map", "Kaart", <MapPin />)] : []),
    ...(isMultiDay ? [tab("accommodation", "Logies", <BedDouble />)] : []),
    tab("program", "Programma", <Calendar />),
    tab("practical", "Praktisch", <ClipboardList />),
    tab("billing", "Facturatie", <Receipt />),
    tab("accept", "Akkoord", <FileSignature />),
  ];

  return (
    <PortalTabs
      tabs={tabs}
      current={activeView}
      onChange={(key) => onNavigate?.(key as PortalView)}
      label="Programma navigatie"
      className={className}
    />
  );
};
