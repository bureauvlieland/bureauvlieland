import { type ItemStatus } from "@/types/programRequest";
import { MicroPill, type MicroPillTone } from "@/components/shared/MicroPill";
import { cn } from "@/lib/utils";

interface ItemStatusBadgeProps {
  status: ItemStatus;
  className?: string;
  showLabel?: boolean;
  overrideLabel?: string;
}

/**
 * Klant-portaal label voor partner-zijde item-status. Dezelfde MicroPill
 * stijl als alle andere statuslabels in het product, geen iconen meer.
 */
const TONE_BY_STATUS: Record<ItemStatus, MicroPillTone> = {
  pending: "blue",
  confirmed: "emerald",
  accepted: "emerald",
  unavailable: "red",
  alternative: "amber",
  cancelled: "slate",
  executed: "emerald",
  invoiced: "emerald",
  counter_proposed: "amber",
};

const LABEL_BY_STATUS: Record<ItemStatus, string> = {
  pending: "Wacht op aanbieder",
  confirmed: "Beschikbaar",
  accepted: "Akkoord",
  unavailable: "Niet beschikbaar",
  alternative: "Alternatief voorstel",
  cancelled: "Geannuleerd",
  executed: "Uitgevoerd",
  invoiced: "Uitgevoerd",
  counter_proposed: "Tegenvoorstel",
};

export const ItemStatusBadge = ({
  status,
  className,
  showLabel = true,
  overrideLabel,
}: ItemStatusBadgeProps) => {
  const tone = TONE_BY_STATUS[status] ?? "slate";
  const label = overrideLabel ?? LABEL_BY_STATUS[status] ?? status;
  return (
    <MicroPill tone={tone} className={cn(className)}>
      {showLabel ? label : ""}
    </MicroPill>
  );
};
