import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Knoppen van het ontwerpsysteem (fase 1, docs/design-systeem.md).
 *
 * - `default`: dé primaire actie, in de actiekleur (publiek oranje, portalen
 *   blauw via `--action`). Eén per scherm.
 * - `secondary`: lichte knop naast een primaire, op een lichte achtergrond.
 * - `outline` / `ghost` / `link`: ondergeschikte acties.
 * - `inverse` / `inverseOutline`: op een donkere achtergrond (hero, CTA-band).
 * - `destructive`: verwijderen en annuleren.
 * - `brand`: merkblauw voor zwevende hulpknoppen (chat, programma-knop), nooit de primaire actie.
 *
 * `heroPrimary` en `heroOutline` zijn oude namen die blijven werken tot alle
 * plekken zijn omgezet (`heroPrimary` is nu ook de actiekleur).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium ring-offset-background transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 coarse:min-h-11",
  {
    variants: {
      variant: {
        default: "bg-action text-action-foreground shadow-soft hover:bg-action-hover",
        secondary: "bg-accent-soft text-primary hover:bg-accent-soft/70",
        outline: "border border-input bg-background text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        inverse: "bg-primary-foreground text-primary shadow-soft hover:bg-primary-foreground/90",
        inverseOutline: "border-2 border-primary-foreground/80 text-primary-foreground hover:bg-primary-foreground/10",
        // Merkblauw voor zwevende hulpknoppen (chat, "Uw programma"); nooit de primaire actie.
        brand: "bg-primary text-primary-foreground shadow-medium hover:bg-ocean-deep",
        heroPrimary: "bg-action text-action-foreground shadow-soft hover:bg-action-hover",
        heroOutline: "border-2 border-primary-foreground/80 text-primary-foreground hover:bg-primary-foreground/10",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10 coarse:h-11 coarse:w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
