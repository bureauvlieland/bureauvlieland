import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Kaart met foto, kop en korte tekst, als link (ontwerpsysteem fase 3).
 * Voor echte programma's en activiteiten uit de database; niet voor
 * statische tegels. Sinds fase 4 met een pill op de foto (`badge`), een
 * kleine regel onder de tekst (`footer`, bijvoorbeeld de prijs) en een
 * eigen linktekst (`linkLabel`). Een kaart met knoppen erin is een
 * `CatalogCard`.
 */
interface MediaCardProps {
  image?: string | null;
  alt?: string;
  /** Pill(s) linksboven op de foto, bijvoorbeeld "Nieuw". */
  badge?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  text?: ReactNode;
  /** Kleine regel onder de tekst, bijvoorbeeld "Vanaf € 245 p.p. · 15 tot 80 personen". */
  footer?: ReactNode;
  to: string;
  /** Tekst van de linkregel onderaan; standaard "Bekijk". */
  linkLabel?: string;
  className?: string;
}

export const MediaCard = ({ image, alt = "", badge, title, meta, text, footer, to, linkLabel = "Bekijk", className }: MediaCardProps) => (
  <Link
    to={to}
    className={cn(
      "group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft transition-shadow duration-base hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
  >
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-accent-soft">
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
    </div>
    <div className="flex flex-1 flex-col p-5">
      {meta && <p className="text-eyebrow font-medium uppercase text-primary">{meta}</p>}
      <h3 className="mt-1 font-display text-display-md font-medium text-foreground">{title}</h3>
      {text && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>}
      {footer && <p className="mt-3 text-xs text-muted-foreground">{footer}</p>}
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-primary">
        {linkLabel}
        <ArrowRight className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </div>
  </Link>
);
