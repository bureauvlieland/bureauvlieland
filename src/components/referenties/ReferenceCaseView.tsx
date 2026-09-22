import { BedDouble, Calendar, Clock, Compass, Users, type LucideIcon } from "lucide-react";
import { Container, FactList, PageHero, PersonQuote, Section, SectionHeader } from "@/components/system";
import { Paragraphs } from "@/components/landing/sections";
import { sectionCounter } from "@/components/landing/sectionCounter";
import { caseKind, paragraphsOf, type ReferenceCaseContent } from "@/lib/referenceCases";
import { heroImageFor, REFERENCE_EYEBROW } from "./heroImage";
import { ReferenceTimeline } from "./ReferenceTimeline";

/**
 * De inhoud van een referentiepagina zoals de bezoeker hem ziet: foto-hero,
 * het verhaal met de feiten ernaast, het programma per dag en het citaat.
 * Gedeeld door de publieke pagina en de akkoordpagina voor de klant, zodat
 * de klant precies ziet wat online komt.
 */
const FACT_ICONS: Record<string, LucideIcon> = {
  Soort: Compass,
  Groepsgrootte: Users,
  Periode: Calendar,
  Duur: Clock,
  Overnachting: BedDouble,
};

interface ReferenceCaseViewProps {
  item: ReferenceCaseContent;
  cta?: { label: string; to: string };
  secondary?: { label: string; to: string };
}

export const ReferenceCaseView = ({ item, cta, secondary }: ReferenceCaseViewProps) => {
  const kind = caseKind(item);
  const paragraphs = paragraphsOf(item.body);
  const facts = item.facts.map((f) => ({ ...f, icon: FACT_ICONS[f.label] }));
  const hasProgram = item.program.some((d) => d.items.length > 0);
  const next = sectionCounter();
  const programAt = hasProgram ? next() : null;

  return (
    <>
      <PageHero
        image={heroImageFor(item)}
        alt={item.photos[0]?.alt ?? ""}
        eyebrow={kind ? `${REFERENCE_EYEBROW} · ${kind}` : REFERENCE_EYEBROW}
        title={item.title}
        intro={item.intro || undefined}
        cta={cta}
        secondary={secondary}
      />

      <Section>
        <Container size="wide">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionHeader title="Zo zag het programma eruit" />
              {paragraphs.length > 0 && <Paragraphs items={paragraphs} className="mt-6 max-w-3xl" />}
            </div>
            {facts.length > 0 && (
              <div className="self-start">
                <FactList title="In het kort" items={facts} />
              </div>
            )}
          </div>
        </Container>
      </Section>

      {programAt && (
        <Section tone={programAt.tone}>
          <Container size="content">
            <SectionHeader
              eyebrow={REFERENCE_EYEBROW}
              number={programAt.number}
              title="Programma per dag"
              intro="De onderdelen zoals de groep ze deed, met de geplande tijden."
            />
            <div className="mt-10">
              <ReferenceTimeline program={item.program} />
            </div>
          </Container>
        </Section>
      )}

      {item.quote && (
        <Section tone="sand">
          <Container size="content">
            <PersonQuote
              text={item.quote}
              author={[item.quote_author, item.quote_role].filter(Boolean).join(", ") || "De opdrachtgever"}
              company={item.company || undefined}
            />
          </Container>
        </Section>
      )}
    </>
  );
};
