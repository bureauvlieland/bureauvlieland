import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Keuzekaart met radiogedrag (ontwerpsysteem fase 2): één stijl voor alle
 * "kies één"-vragen in de wizards. Toegankelijk (`role="radio"`,
 * `aria-checked`), 8px hoeken zoals een kaart, geselecteerd in merkblauw.
 */
interface OptionCardProps {
  selected: boolean;
  onSelect: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Icoon of emoji links (of boven bij `align="center"`). */
  icon?: ReactNode;
  disabled?: boolean;
  align?: "left" | "center";
  className?: string;
}

export const OptionCard = ({
  selected,
  onSelect,
  title,
  description,
  icon,
  disabled = false,
  align = "left",
  className,
}: OptionCardProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    aria-disabled={disabled || undefined}
    disabled={disabled}
    onClick={() => {
      if (!disabled) onSelect();
    }}
    className={cn(
      "w-full min-h-[44px] rounded-lg border-2 p-3 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      selected ? "border-primary bg-accent-soft/50" : "border-border bg-card hover:border-primary/50",
      disabled && "cursor-not-allowed opacity-60 hover:border-border",
      align === "center" ? "flex flex-col items-center gap-1 text-center" : "flex items-start gap-2.5 text-left",
      className,
    )}
  >
    {icon && (
      <span className={cn("shrink-0 text-primary [&_svg]:h-4 [&_svg]:w-4", align === "left" && "mt-0.5")}>{icon}</span>
    )}
    <span className="min-w-0">
      <span className="block text-sm font-medium text-foreground">{title}</span>
      {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
    </span>
  </button>
);

const COLUMN_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

interface OptionGroupProps {
  label: ReactNode;
  /** Voor `aria-label` als het label geen platte tekst is. */
  name?: string;
  help?: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}

/** Groep keuzekaarten met een label erboven. */
export const OptionGroup = ({ label, name, help, columns = 2, className, children }: OptionGroupProps) => (
  <div role="radiogroup" aria-label={name ?? (typeof label === "string" ? label : undefined)} className={cn("space-y-2", className)}>
    <p className="flex items-center gap-2 text-sm font-medium text-foreground">{label}</p>
    {help && <p className="text-xs text-muted-foreground">{help}</p>}
    <div className={cn("grid gap-2", COLUMN_CLASSES[columns])}>{children}</div>
  </div>
);
