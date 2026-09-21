import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Compass, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Kaart uit een catalogus met prijs en knoppen (ontwerpsysteem fase 4):
 * de bouwstenen, een direct boekbare activiteit uit de boekmodule. Foto en
 * titel linken naar de detailpagina; onderin staan de prijs en één primaire
 * knop, met optioneel een tweede knop en een kleine tekstlink. Een kaart
 * die in zijn geheel één link is, is een `MediaCard`.
 */
export interface CatalogAction {
  label: string;
  to: string;
  icon?: LucideIcon;
}

interface CatalogCardProps {
  image?: string | null;
  alt?: string;
  /** De detailpagina; foto en titel linken erheen. */
  to: string;
  /** Pills linksboven op de foto: categorie, "Direct boekbaar". */
  badge?: ReactNode;
  title: string;
  /** Bijvoorbeeld "door Zeehondentochten Vlieland". */
  byline?: string;
  text?: string;
  /** Regel onder de tekst: eerstvolgend moment, beperkte beschikbaarheid. */
  note?: ReactNode;
  price?: { value: string; note?: string };
  primary?: CatalogAction;
  secondary?: CatalogAction;
  /** Kleine tekstlink onder de knoppen. */
  tertiary?: CatalogAction;
  className?: string;
}

const ActionButton = ({ action, variant }: { action: CatalogAction; variant: "default" | "outline" }) => {
  const Icon = action.icon;
  return (
    <Button asChild size="sm" variant={variant} className="w-full">
      <Link to={action.to}>
        {Icon && <Icon aria-hidden="true" />}
        {action.label}
      </Link>
    </Button>
  );
};

export const CatalogCard = ({ image, alt = "", to, badge, title, byline, text, note, price, primary, secondary, tertiary, className }: CatalogCardProps) => (
  <article className={cn("flex flex-col overflow-hidden rounded-lg border border-border bg-card", className)}>
    <Link to={to} className="group relative block aspect-[4/3] w-full overflow-hidden bg-accent-soft" aria-label={`Bekijk ${title}`}>
      {image ? (
        <img
          src={image}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
          <Compass className="h-12 w-12 text-primary/30" strokeWidth={1.25} />
        </div>
      )}
      {badge && <div className="absolute left-3 top-3 flex flex-wrap gap-2">{badge}</div>}
    </Link>
    <div className="flex flex-1 flex-col gap-3 p-5">
      <div>
        <h3 className="font-display text-display-md font-medium text-foreground">
          <Link to={to} className="transition-colors duration-fast hover:text-primary">
            {title}
          </Link>
        </h3>
        {byline && <p className="mt-1 text-xs text-muted-foreground">{byline}</p>}
      </div>
      {text && <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{text}</p>}
      {note && <div className="text-xs text-muted-foreground">{note}</div>}
      {(price || primary || secondary || tertiary) && (
        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
          {price && (
            <p className="text-foreground">
              <span className="font-medium">{price.value}</span>
              {price.note && <span className="ml-1 text-xs text-muted-foreground">{price.note}</span>}
            </p>
          )}
          {primary && <ActionButton action={primary} variant="default" />}
          {secondary && <ActionButton action={secondary} variant="outline" />}
          {tertiary && (
            <Link to={tertiary.to} className="text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
              {tertiary.label}
            </Link>
          )}
        </div>
      )}
    </div>
  </article>
);
