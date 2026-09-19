import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Eén bevestigingsscherm na versturen (ontwerpsysteem fase 2): wat er is
 * gebeurd, wat er nu gebeurt, en één duidelijke volgende stap. Geen
 * aftelling en geen automatische doorverwijzing.
 */
interface SuccessAction {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface SuccessScreenProps {
  title: ReactNode;
  intro?: ReactNode;
  /** Referentienummer van de aanvraag, als dat er is. */
  reference?: string | null;
  primary?: SuccessAction;
  secondary?: SuccessAction;
  /** `h1` op een pagina zonder eigen kop, anders `h2`. */
  as?: "h1" | "h2";
  className?: string;
  children?: ReactNode;
}

const ActionButton = ({ action, variant }: { action: SuccessAction; variant: "default" | "outline" }) => {
  if (action.to) {
    return (
      <Button asChild size="lg" variant={variant} className="w-full sm:w-auto">
        <Link to={action.to}>
          {action.label}
          {variant === "default" && <ArrowRight aria-hidden="true" />}
        </Link>
      </Button>
    );
  }
  return (
    <Button size="lg" variant={variant} onClick={action.onClick} className="w-full sm:w-auto">
      {action.label}
      {variant === "default" && <ArrowRight aria-hidden="true" />}
    </Button>
  );
};

export const SuccessScreen = ({ title, intro, reference, primary, secondary, as: Tag = "h2", className, children }: SuccessScreenProps) => (
  <div className={cn("mx-auto max-w-lg py-8 text-center", className)} role="status" aria-live="polite">
    <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
      <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
    </span>
    <Tag className="font-display text-display-md font-medium text-foreground">{title}</Tag>
    {intro && <p className="mt-2 text-muted-foreground leading-relaxed">{intro}</p>}
    {reference && (
      <p className="mt-3 text-sm text-muted-foreground">
        Referentie: <span className="font-medium text-foreground">{reference}</span>
      </p>
    )}
    {(primary || secondary) && (
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {primary && <ActionButton action={primary} variant="default" />}
        {secondary && <ActionButton action={secondary} variant="outline" />}
      </div>
    )}
    {children && <div className="mt-8 text-left">{children}</div>}
  </div>
);
