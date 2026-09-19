import { useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFloatingClearance } from "@/hooks/useFloatingLayer";

/**
 * Vorige/volgende onder elke wizardstap (ontwerpsysteem fase 2): Terug
 * links als ghost, de volgende stap rechts als primaire knop, op een
 * telefoon gestapeld met de primaire knop bovenaan. Eén labelset:
 * "Terug" en "Volgende: …", op de laatste stap "Aanvraag versturen".
 */
interface WizardFooterProps {
  onBack?: () => void;
  backLabel?: string;
  nextLabel: string;
  /** `submit` als de knop een formulier verstuurt, anders `button` met `onNext`. */
  nextType?: "button" | "submit";
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  nextLoadingLabel?: string;
  /** Regel onder de knoppen, bijvoorbeeld "Vrijblijvend. Binnen 5 werkdagen een voorstel." */
  note?: ReactNode;
  className?: string;
}

export const WizardFooter = ({
  onBack,
  backLabel = "Terug",
  nextLabel,
  nextType = "button",
  onNext,
  nextDisabled = false,
  nextLoading = false,
  nextLoadingLabel = "Versturen…",
  note,
  className,
}: WizardFooterProps) => {
  // Zolang deze knoppenrij in beeld is, wijken de zwevende knoppen (chat).
  const ref = useRef<HTMLDivElement>(null);
  useFloatingClearance(ref);
  return (
  <div ref={ref} className={cn("pt-4", className)}>
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} className="w-full sm:w-auto">
          <ArrowLeft aria-hidden="true" />
          {backLabel}
        </Button>
      ) : (
        <span aria-hidden="true" />
      )}
      <Button
        type={nextType}
        size="lg"
        onClick={nextType === "button" ? onNext : undefined}
        disabled={nextDisabled || nextLoading}
        className="w-full sm:w-auto sm:min-w-[14rem]"
      >
        {nextLoading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            {nextLoadingLabel}
          </>
        ) : (
          <>
            {nextLabel}
            <ArrowRight aria-hidden="true" />
          </>
        )}
      </Button>
    </div>
    {note && <div className="mt-3 text-xs leading-relaxed text-muted-foreground sm:ml-auto sm:max-w-md sm:text-right">{note}</div>}
  </div>
  );
};
