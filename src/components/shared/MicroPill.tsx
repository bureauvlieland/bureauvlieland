import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Eén consistente "micro pill" voor alle status-/info-labels in het product.
 * Lichte achtergrond, subtiele rand, geen icoon — dezelfde grootte en
 * typografie overal (admin, klantportaal, partnerportaal).
 *
 * Gebruik altijd deze component in plaats van losse `<Badge>` varianten met
 * eigen `bg-*-100 text-*-700` combinaties, zodat de UI nergens net iets
 * anders oogt.
 */
export type MicroPillTone =
  | "blue"
  | "amber"
  | "emerald"
  | "slate"
  | "red"
  | "purple";

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

interface MicroPillProps {
  tone?: MicroPillTone;
  className?: string;
  children: ReactNode;
}

export const MICRO_PILL_BASE_CLASSES =
  "inline-flex items-center self-start whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium leading-tight";

export const MicroPill = ({ tone = "slate", className, children }: MicroPillProps) => (
  <span className={cn(MICRO_PILL_BASE_CLASSES, TONE_CLASSES[tone], className)}>
    {children}
  </span>
);
