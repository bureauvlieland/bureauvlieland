import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Een sheet die op een telefoon van onderen komt (bottom sheet, ronde
 * bovenhoeken, maximaal 85% van het scherm) en op een groter scherm van
 * rechts. Gebruik dit voor alle sheets in de funnel (ontwerpsysteem fase 2
 * deel 3); het navigatiemenu blijft van rechts komen.
 */
type SheetContentProps = ComponentPropsWithoutRef<typeof SheetContent>;

export const ResponsiveSheetContent = forwardRef<ElementRef<typeof SheetContent>, Omit<SheetContentProps, "side">>(
  ({ className, ...props }, ref) => {
    const isMobile = useIsMobile();
    return (
      <SheetContent
        ref={ref}
        side={isMobile ? "bottom" : "right"}
        className={cn(
          isMobile && "max-h-[85vh] rounded-t-lg pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          className,
        )}
        {...props}
      />
    );
  },
);
ResponsiveSheetContent.displayName = "ResponsiveSheetContent";
