import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Eén sectie-ritme voor de hele site (ontwerpsysteem fase 1). Vervangt de
 * negen losse paddings en de losse achtergrondkeuzes per pagina.
 *
 * Tonen: `default` (achtergrond), `muted` (licht vlak), `sand` (warm vlak),
 * `dark` (oceaan, lichte tekst), `card` (wit).
 * Ruimte: `compact` voor de funnel, `default` voor marketingpagina's,
 * `spacious` rond een hero of een slot.
 */
export type SectionTone = "default" | "muted" | "sand" | "dark" | "card";
export type SectionSpacing = "compact" | "default" | "spacious";

const TONE_CLASSES: Record<SectionTone, string> = {
  default: "bg-background text-foreground",
  muted: "bg-muted/30 text-foreground",
  sand: "bg-sand/40 text-foreground",
  dark: "bg-ocean-deep text-primary-foreground",
  card: "bg-card text-card-foreground",
};

const SPACING_CLASSES: Record<SectionSpacing, string> = {
  compact: "py-8 md:py-12",
  default: "py-16 md:py-24",
  spacious: "py-20 md:py-32",
};

interface SectionProps extends HTMLAttributes<HTMLElement> {
  tone?: SectionTone;
  spacing?: SectionSpacing;
  children?: ReactNode;
}

export const Section = ({ tone = "default", spacing = "default", className, children, ...rest }: SectionProps) => (
  <section className={cn("relative", TONE_CLASSES[tone], SPACING_CLASSES[spacing], className)} {...rest}>
    {children}
  </section>
);
