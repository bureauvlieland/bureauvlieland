import { cva, type VariantProps } from "class-variance-authority";

/**
 * Klassen van de `Pill` (los van de component, zodat andere componenten ze
 * kunnen hergebruiken zonder de fast-refresh-regel te breken).
 */
export const pillVariants = cva(
  "inline-flex items-center self-start whitespace-nowrap rounded-md border font-medium leading-tight",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground border-border",
        info: "bg-info-soft text-info-ink border-info/30",
        success: "bg-success-soft text-success-ink border-success/30",
        warning: "bg-warning-soft text-warning-ink border-warning/40",
        danger: "bg-destructive-soft text-destructive-ink border-destructive/30",
        purple: "bg-invoice-soft text-invoice border-invoice/30",
        brand: "bg-accent-soft text-primary border-primary/20",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export type PillTone = NonNullable<VariantProps<typeof pillVariants>["tone"]>;
export type PillVariantProps = VariantProps<typeof pillVariants>;
