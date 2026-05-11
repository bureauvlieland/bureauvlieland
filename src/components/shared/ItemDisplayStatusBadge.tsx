import { cn } from "@/lib/utils";
import {
  type ItemDisplayStatus,
  itemDisplayStatusConfig,
} from "@/lib/itemStatus";
import { MICRO_PILL_BASE_CLASSES, type MicroPillTone } from "./MicroPill";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ItemDisplayStatusBadgeProps {
  status: ItemDisplayStatus;
  audience?: "admin" | "customer";
  className?: string;
}

const TONE_BY_STATUS: Record<ItemDisplayStatus, MicroPillTone> = {
  wacht_op_partner: "blue",
  wacht_op_klant: "amber",
  prijs_gewijzigd: "amber",
  geaccepteerd: "emerald",
  uitgevoerd: "emerald",
  geannuleerd: "slate",
  niet_beschikbaar: "red",
  self_arranged: "slate",
};

const TONE_CLASSES: Record<MicroPillTone, string> = {
  blue:
    "bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60",
  amber:
    "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
  emerald:
    "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60",
  slate:
    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
  red:
    "bg-red-50 text-red-700 border-red-200/70 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60",
  purple:
    "bg-purple-50 text-purple-700 border-purple-200/70 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60",
};

const ACTOR_LABEL: Record<string, string> = {
  partner: "Aanbieder",
  klant: "Klant",
  bureau: "Bureau Vlieland",
  geen: "—",
};

export const ItemDisplayStatusBadge = ({
  status,
  audience = "admin",
  className,
}: ItemDisplayStatusBadgeProps) => {
  const cfg = itemDisplayStatusConfig[status];
  const label = audience === "customer" ? cfg.customerLabel : cfg.adminLabel;
  const tooltip = audience === "customer" ? cfg.customerTooltip : cfg.adminTooltip;
  const tone = TONE_BY_STATUS[status] ?? "slate";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              MICRO_PILL_BASE_CLASSES,
              TONE_CLASSES[tone],
              "cursor-help",
              className,
            )}
          >
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs leading-snug">
          <p className="font-medium">{label}</p>
          <p className="mt-0.5 text-muted-foreground">{tooltip}</p>
          {cfg.actor !== "geen" && (
            <p className="mt-1 text-[11px]">
              <span className="text-muted-foreground">Aan zet: </span>
              <span className="font-medium">{ACTOR_LABEL[cfg.actor]}</span>
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
