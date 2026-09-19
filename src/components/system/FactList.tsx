import { cn } from "@/lib/utils";

/**
 * Korte feiten als label en waarde, bijvoorbeeld de eilandfeiten naast de
 * intro van een landingspagina (ontwerpsysteem fase 3).
 */
interface FactListProps {
  items: { label: string; value: string }[];
  className?: string;
}

export const FactList = ({ items, className }: FactListProps) => (
  <dl className={cn("divide-y divide-border rounded-lg border border-border bg-card", className)}>
    {items.map((item) => (
      <div key={item.label} className="px-4 py-3">
        <dt className="text-eyebrow font-medium uppercase text-primary">{item.label}</dt>
        <dd className="mt-1 text-sm text-foreground">{item.value}</dd>
      </div>
    ))}
  </dl>
);
