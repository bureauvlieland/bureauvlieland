import type { ReactNode } from "react";
import { Pill } from "@/components/system/Pill";
import type { PillTone } from "@/components/system/pillVariants";

/**
 * Oude naam voor de `Pill` uit het ontwerpsysteem, met kleurnamen als toon.
 * Nieuwe code gebruikt `Pill` met een betekenis-toon (info, success, warning,
 * danger, neutral, purple); deze laag blijft bestaan tot alle aanroepen zijn
 * omgezet.
 */
export type MicroPillTone = "blue" | "amber" | "emerald" | "slate" | "red" | "purple";

const TONE_MAP: Record<MicroPillTone, PillTone> = {
  blue: "info",
  amber: "warning",
  emerald: "success",
  slate: "neutral",
  red: "danger",
  purple: "purple",
};

interface MicroPillProps {
  tone?: MicroPillTone;
  className?: string;
  children: ReactNode;
}

export const MicroPill = ({ tone = "slate", className, children }: MicroPillProps) => (
  <Pill tone={TONE_MAP[tone]} className={className}>
    {children}
  </Pill>
);
