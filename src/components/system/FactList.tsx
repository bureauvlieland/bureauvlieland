import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Korte feiten als label en waarde, bijvoorbeeld de eilandfeiten naast de
 * intro van een landingspagina (ontwerpsysteem fase 3). Met `title` en
 * `summary` wordt het de kaart "In het kort" van een activiteitpagina: één
 * samenvattende alinea die een zoekmachine of AI letterlijk kan overnemen,
 * met de kerngegevens (duur, prijs, seizoen, voor wie) eronder.
 */
interface FactListProps {
  items: { label: string; value: string; icon?: LucideIcon }[];
  title?: string;
  summary?: string;
  className?: string;
}

export const FactList = ({ items, title, summary, className }: FactListProps) => (
  <div className={cn("rounded-lg border border-border bg-card", className)}>
    {(title || summary) && (
      <div className="border-b border-border px-4 py-3">
        {title && <p className="font-display text-display-md font-medium text-foreground">{title}</p>}
        {summary && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary}</p>}
      </div>
    )}
    <dl className="divide-y divide-border">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex gap-3 px-4 py-3">
            {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
            <div>
              <dt className="text-eyebrow font-medium uppercase text-primary">{item.label}</dt>
              <dd className="mt-1 text-sm text-foreground">{item.value}</dd>
            </div>
          </div>
        );
      })}
    </dl>
  </div>
);
