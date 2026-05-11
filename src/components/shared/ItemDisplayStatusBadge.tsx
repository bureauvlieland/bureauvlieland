import { cn } from "@/lib/utils";
import {
  type ItemDisplayStatus,
  itemDisplayStatusConfig,
} from "@/lib/itemStatus";

interface ItemDisplayStatusBadgeProps {
  status: ItemDisplayStatus;
  audience?: "admin" | "customer";
  className?: string;
}

/**
 * Toonkleurmapping per statuskey → minimalistische pill (lichte achtergrond
 * + subtiele rand, geen icoon). Eén plek voor het uiterlijk van alle
 * item-statusbadges in admin/klant.
 */
const toneByStatus: Record<ItemDisplayStatus, string> = {
  wacht_op_partner:
    "bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60",
  wacht_op_klant:
    "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
  prijs_gewijzigd:
    "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
  geaccepteerd:
    "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60",
  uitgevoerd:
    "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60",
  geannuleerd:
    "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
  niet_beschikbaar:
    "bg-red-50 text-red-700 border-red-200/70 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60",
  self_arranged:
    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
};

export const ItemDisplayStatusBadge = ({
  status,
  audience = "admin",
  className,
}: ItemDisplayStatusBadgeProps) => {
  const cfg = itemDisplayStatusConfig[status];
  const label = audience === "customer" ? cfg.customerLabel : cfg.adminLabel;
  const tone =
    toneByStatus[status] ??
    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800";
  return (
    <span
      className={cn(
        "inline-flex items-center self-start whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium leading-tight",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
};
