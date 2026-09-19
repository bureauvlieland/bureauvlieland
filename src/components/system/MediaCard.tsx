import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Kaart met foto, kop en korte tekst, als link (ontwerpsysteem fase 3).
 * Voor echte programma's en activiteiten uit de database; niet voor
 * statische tegels.
 */
interface MediaCardProps {
  image?: string | null;
  alt?: string;
  title: ReactNode;
  meta?: ReactNode;
  text?: ReactNode;
  to: string;
  className?: string;
}

export const MediaCard = ({ image, alt = "", title, meta, text, to, className }: MediaCardProps) => (
  <Link
    to={to}
    className={cn(
      "group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft transition-shadow duration-base hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
  >
    <div className="aspect-[4/3] w-full overflow-hidden bg-accent-soft">
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
    </div>
    <div className="flex flex-1 flex-col p-5">
      {meta && <p className="text-eyebrow font-medium uppercase text-primary">{meta}</p>}
      <h3 className="mt-1 font-display text-display-md font-medium text-foreground">{title}</h3>
      {text && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>}
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        Bekijk
        <ArrowRight className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </div>
  </Link>
);
