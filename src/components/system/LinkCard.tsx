import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPlainHref } from "@/lib/href";

/**
 * Kleine linkkaart zonder foto: titel, één regel tekst en een pijl
 * (ontwerpsysteem fase 4). Voor linkblokken zoals "Bekijk ook", de thema's
 * op Activiteiten op Vlieland en de resultaten van de activiteitenfilter.
 * Optioneel pills onder de tekst (duur, geschiktheid).
 */
interface LinkCardProps {
  title: ReactNode;
  text?: ReactNode;
  to: string;
  pills?: ReactNode;
  /** Icoon in een accentcirkel vóór de tekst (de routes op de homepage). */
  icon?: LucideIcon;
  className?: string;
}

export const LinkCard = ({ title, text, to, pills, icon: Icon, className }: LinkCardProps) => {
  const classes = cn(
    "group flex h-full items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors duration-fast hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    className,
  );
  const inner = (
    <>
      {Icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        {text && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{text}</span>}
        {pills && <span className="mt-3 flex flex-wrap gap-1.5">{pills}</span>}
      </span>
      <ArrowRight
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-fast group-hover:translate-x-1 group-hover:text-primary"
        aria-hidden="true"
      />
    </>
  );
  return isPlainHref(to) ? (
    <a href={to} className={classes}>
      {inner}
    </a>
  ) : (
    <Link to={to} className={classes}>
      {inner}
    </Link>
  );
};
