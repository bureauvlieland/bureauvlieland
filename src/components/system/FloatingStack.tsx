import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFloatingHidden } from "@/hooks/useFloatingLayer";

/**
 * De stapel zwevende knoppen rechtsonder (chat, programma). Staat boven een
 * eventuele vaste balk (`--floating-offset`) en wijkt zodra de footer of de
 * knoppenrij van een wizardstap in beeld komt, zodat hij nooit over een
 * primaire knop staat. `z-40`: onder sheets en dialogen (`z-50`), boven de
 * vaste balk (`z-30`).
 */
interface FloatingStackProps {
  /** Blijf zichtbaar, bijvoorbeeld zolang het chatpaneel open is. */
  forceVisible?: boolean;
  className?: string;
  children: ReactNode;
}

export const FloatingStack = ({ forceVisible = false, className, children }: FloatingStackProps) => {
  const hidden = useFloatingHidden() && !forceVisible;
  return (
    <div
      className={cn(
        "fixed right-4 z-40 flex flex-col items-end gap-3 transition-opacity duration-base",
        hidden ? "pointer-events-none opacity-0" : "opacity-100",
        className,
      )}
      style={{ bottom: "calc(1rem + var(--floating-offset, 0px))" }}
    >
      {children}
    </div>
  );
};
