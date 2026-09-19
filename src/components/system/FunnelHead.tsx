import type { ReactNode } from "react";
import { Container } from "./Container";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

/**
 * De kop van elke funnelpagina (ontwerpsysteem fase 2): een rustige donkere
 * band met eyebrow, h1 en intro, zonder foto of beweging. Daaronder komt
 * meestal een `StepperBar`. Marketingpagina's krijgen in fase 3 een
 * `PageHero` met foto; dit is bewust de stillere variant.
 */
interface FunnelHeadProps {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  /** Onder de kop, bijvoorbeeld een korte toelichting. */
  children?: ReactNode;
  className?: string;
}

export const FunnelHead = ({ eyebrow, title, intro, children, className }: FunnelHeadProps) => (
  <Section tone="dark" spacing="compact" className={className}>
    <Container size="content">
      <SectionHeader as="h1" size="lg" onDark eyebrow={eyebrow} title={title} intro={intro} />
      {children && <div className="mt-6">{children}</div>}
    </Container>
  </Section>
);
