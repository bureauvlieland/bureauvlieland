import erwinImage from "@/assets/erwin-profile.jpg";
import { renderRichText } from "@/lib/richText";
import { Container, Section, SectionHeader, type SectionTone } from "@/components/system";
import { Paragraphs } from "@/components/landing/sections";

const ONDERNEMEN = [
  "Oprichter en bestuurslid van de lokale krant [De Geitenbode](https://www.geitenbode.nl)",
  "Mede-eigenaar van [Trattoria Oliva](https://olivavlieland.nl) en [Café Boven](https://cafeboven.nl)",
  "Eigenaar van softwarebedrijf [Mijn Fietsverhuur](https://mijnfietsverhuur.nl), oplossingen voor fietsverhuurbedrijven",
  "Vertegenwoordiger Ondernemersvereniging Vlieland",
];

const EVENEMENTEN = [
  "[Vuurtorenloop](https://vuurtorenloop.nl): hardloopfeest door de duinen van Vlieland",
  "[Amusetour Vlieland](https://www.amusetour.nl/destinations/vlieland/): culinaire wandeling langs restaurants op het eiland",
];

const Dots = ({ items }: { items: string[] }) => (
  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-foreground">
    {items.map((item) => (
      <li key={item} className="flex gap-3">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        <span>{renderRichText(item)}</span>
      </li>
    ))}
  </ul>
);

/** Wie er achter Bureau Vlieland zit, op de pagina Over ons. */
export const AboutErwin = ({ number, tone }: { number: string; tone: SectionTone }) => (
  <Section id="over-erwin" tone={tone}>
    <Container size="wide">
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeader eyebrow="Over ons" number={number} title="Over Erwin Soolsma en Bureau Vlieland" />
          <Paragraphs
            className="mt-6 max-w-3xl"
            items={[
              "Ik ben geboren op Vlieland en werk al jaren op het snijvlak van ondernemen, evenementen, leefbaarheid en samenwerking op het eiland. Bureau Vlieland is mijn manier om groepen en projecten te verbinden met wat Vlieland echt te bieden heeft.",
              "Door mijn werk voor ondernemers, de lokale krant, vrijwilligersinitiatieven en projecten rond leefbaarheid heb ik een breed netwerk op Vlieland. Dat gebruik ik om programma's te maken die passen bij het dorp, de natuur en de mensen die hier wonen.",
              "Gasten die met Bureau Vlieland werken, dragen direct bij aan de leefbaarheid van het eiland: lokale ondernemers verdienen mee, voorzieningen blijven bestaan en jonge eilanders zien dat er toekomst is in werk en ondernemerschap op Vlieland.",
            ]}
          />
        </div>
        <figure className="overflow-hidden rounded-lg bg-muted lg:self-start">
          <img
            src={erwinImage}
            alt="Erwin Soolsma, oprichter van Bureau Vlieland, op het strand van Vlieland"
            className="aspect-[3/4] w-full object-cover"
            loading="lazy"
          />
        </figure>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-display text-display-md font-medium text-foreground">Ondernemen op Vlieland</h3>
          <Dots items={ONDERNEMEN} />
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-display text-display-md font-medium text-foreground">Publieksevenementen</h3>
          <p className="mt-2 text-sm text-muted-foreground">Bureau Vlieland helpt mee met de organisatie van grote publieksevenementen op het eiland.</p>
          <Dots items={EVENEMENTEN} />
        </div>
      </div>
    </Container>
  </Section>
);
