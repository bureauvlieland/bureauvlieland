import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isPlainHref } from "@/lib/href";
import { Container } from "./Container";
import { SectionHeader } from "./SectionHeader";

/**
 * Hero van een marketingpagina (ontwerpsysteem fase 3): foto met een
 * donker verloop, eyebrow, lichte Fraunces-kop, intro en één primaire
 * actie. Geen Ken Burns; de foto staat stil (rustiger en respecteert
 * `prefers-reduced-motion` vanzelf). Zonder foto wordt het een rustige
 * donkere band (Contact, Veelgestelde vragen, 404).
 */
interface PageHeroProps {
  image?: string;
  alt?: string;
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  /** `to` mag een pad, een anker op dezelfde pagina (`#boeken`) of een `mailto:` zijn. */
  cta?: { label: string; to: string };
  /** Tweede, ondergeschikte link naast de knop. */
  secondary?: { label: string; to: string };
  className?: string;
}

export const PageHero = ({ image, alt = "", eyebrow, title, intro, cta, secondary, className }: PageHeroProps) => (
  <section className={className}>
    <div className={cn("relative flex items-end overflow-hidden bg-ocean-deep", image && "min-h-[26rem] md:min-h-[32rem]")}>
      {image && (
        <>
          <img
            src={image}
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ocean-deep via-ocean-deep/60 to-ocean-deep/20" aria-hidden="true" />
        </>
      )}
      <Container size="wide" className={cn("relative", image ? "py-12 md:py-16" : "py-14 md:py-20")}>
        <SectionHeader as="h1" onDark eyebrow={eyebrow} title={title} intro={intro} />
        {(cta || secondary) && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            {cta && (
              <Button asChild size="lg">
                {isPlainHref(cta.to) ? (
                  <a href={cta.to}>
                    {cta.label}
                    <ArrowRight aria-hidden="true" />
                  </a>
                ) : (
                  <Link to={cta.to}>
                    {cta.label}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                )}
              </Button>
            )}
            {secondary && (
              <Button asChild size="lg" variant="inverseOutline">
                {isPlainHref(secondary.to) ? <a href={secondary.to}>{secondary.label}</a> : <Link to={secondary.to}>{secondary.label}</Link>}
              </Button>
            )}
          </div>
        )}
      </Container>
    </div>
  </section>
);
