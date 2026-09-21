import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "./Container";
import { SectionHeader } from "./SectionHeader";

/**
 * Hero van een marketingpagina (ontwerpsysteem fase 3): foto met een
 * donker verloop, eyebrow, lichte Fraunces-kop, intro en één primaire
 * actie. Geen Ken Burns; de foto staat stil (rustiger en respecteert
 * `prefers-reduced-motion` vanzelf).
 */
interface PageHeroProps {
  image: string;
  alt: string;
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  /** `to` mag een anker op dezelfde pagina zijn (`#boeken`). */
  cta?: { label: string; to: string };
  /** Tweede, ondergeschikte link naast de knop. */
  secondary?: { label: string; to: string };
  className?: string;
}

export const PageHero = ({ image, alt, eyebrow, title, intro, cta, secondary, className }: PageHeroProps) => (
  <section className={className}>
    <div className="relative flex min-h-[26rem] items-end overflow-hidden bg-ocean-deep md:min-h-[32rem]">
      <img
        src={image}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        decoding="sync"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ocean-deep via-ocean-deep/60 to-ocean-deep/20" aria-hidden="true" />
      <Container size="wide" className="relative py-12 md:py-16">
        <SectionHeader as="h1" onDark eyebrow={eyebrow} title={title} intro={intro} />
        {(cta || secondary) && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            {cta && (
              <Button asChild size="lg">
                {cta.to.startsWith("#") ? (
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
                <Link to={secondary.to}>{secondary.label}</Link>
              </Button>
            )}
          </div>
        )}
      </Container>
    </div>
  </section>
);
