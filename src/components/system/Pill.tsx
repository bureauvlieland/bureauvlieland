import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { pillVariants, type PillVariantProps } from "./pillVariants";

/**
 * Eén pill voor alle status- en infolabels (ontwerpsysteem fase 1). De toon
 * volgt de betekenis, niet een kleurnaam: `info` (wacht op iemand anders),
 * `success` (klaar, akkoord), `warning` (vraagt aandacht), `danger` (kan
 * niet), `neutral` (informatief), `purple` (tegenvoorstel), `brand`.
 * Kleuren komen uit de statustokens in index.css, dus licht en donker
 * kloppen vanzelf.
 */
export interface PillProps extends PillVariantProps {
  className?: string;
  title?: string;
  children: ReactNode;
}

export const Pill = ({ tone, size, className, title, children }: PillProps) => (
  <span title={title} className={cn(pillVariants({ tone, size }), className)}>
    {children}
  </span>
);
