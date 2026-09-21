import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container, FactList, PageHero, Pill, RouteChooser, Section, SectionHeader, type SectionTone } from "@/components/system";
import { Paragraphs } from "@/components/landing/sections";
import { sectionCounter } from "@/components/landing/sectionCounter";
import vuurtorenloopImage from "@/assets/vuurtorenloop.jpg";
import amuseTourImage from "@/assets/amuse-tour.jpg";

const URL = "https://bureauvlieland.nl/evenementen";

interface Event {
  pill: string;
  title: string;
  intro: string;
  paragraphs: string[];
  facts: { label: string; value: string }[];
  image: { src: string; alt: string };
  more: string;
}

const EVENTS: Event[] = [
  {
    pill: "26 september 2026",
    title: "Amusetour Vlieland",
    intro: "Vlieland moet u proeven. Een beetje vakantie aan het begin van de herfst, tijdens deze zaterdagse Amusetour op Vlieland.",
    paragraphs: [
      "De Amusetour op Vlieland is al jaren een groot succes. Een frisse zeebries, heerlijk eten, goede wijn en een supersfeertje. Het eiland heeft een grote hoeveelheid goede restaurants die deelnemen aan dit culinaire evenement. Een unieke manier om Vlieland te ontdekken.",
    ],
    facts: [
      { label: "Datum", value: "Zaterdag 26 september 2026" },
      { label: "Locatie", value: "Diverse restaurants op Vlieland" },
    ],
    image: { src: amuseTourImage, alt: "Amusetour Vlieland: culinair genieten" },
    more: "https://www.amusetour.nl/destinations/vlieland/",
  },
  {
    pill: "18 april 2027",
    title: "Vuurtorenloop Vlieland",
    intro: "Het hardloopfeest Vuurtorenloop Vlieland is mooi zwaar: een unieke hardloopervaring langs de stranden en door de natuur van Vlieland.",
    paragraphs: [
      "Hardlopen op zondag is een uitstekende bezigheid, zeker op een Waddeneiland als Vlieland. Elke deelnemer krijgt een medaille en na afloop worden er heerlijke broodjes geserveerd. Dit evenement is zeer verslavend.",
    ],
    facts: [
      { label: "Datum", value: "Zondag 18 april 2027" },
      { label: "Locatie", value: "Vlieland" },
    ],
    image: { src: vuurtorenloopImage, alt: "Vuurtorenloop: hardlopers op het strand van Vlieland" },
    more: "https://vuurtorenloop.nl/",
  },
];

const EventSection = ({ event, number, tone, flip }: { event: Event; number: string; tone: SectionTone; flip?: boolean }) => (
  <Section tone={tone}>
    <Container size="wide">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className={cn(flip && "lg:order-2")}>
          <Pill tone="brand">{event.pill}</Pill>
          <SectionHeader className="mt-4" eyebrow="Agenda" number={number} title={event.title} intro={event.intro} />
          <FactList items={event.facts} className="mt-8 max-w-md" />
          <Paragraphs items={event.paragraphs} className="mt-8" />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/programma-op-maat">
                Organiseer met Bureau Vlieland
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={event.more} target="_blank" rel="noopener noreferrer">
                Meer informatie
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
        <figure className={cn("aspect-[4/3] overflow-hidden rounded-lg bg-muted", flip && "lg:order-1")}>
          <img src={event.image.src} alt={event.image.alt} className="h-full w-full object-cover" loading="lazy" />
        </figure>
      </div>
    </Container>
  </Section>
);

const FAQ = [
  {
    question: "Welke evenementen zijn er op Vlieland?",
    answer:
      "Op Vlieland vinden het hele jaar door evenementen plaats, van Into The Great Wide Open en de Vlieland Marathon tot kleinere culturele en sportieve activiteiten in het dorp.",
  },
  {
    question: "Kan ik mijn groepsprogramma combineren met een evenement?",
    answer:
      "Ja. Wij plannen programma's graag rondom een eilandevenement, maar houd rekening met beperkte beschikbaarheid van logies en boot op die dagen.",
  },
  {
    question: "Waarom is logies rond evenementen lastig te krijgen?",
    answer: "Tijdens grote evenementen is vrijwel alle accommodatie op het eiland bezet. Boek dan minimaal een half jaar vooraf.",
  },
  {
    question: "Organiseert Bureau Vlieland ook eigen evenementen voor bedrijven?",
    answer:
      "Ja. Van bedrijfsfeest en jubileum tot netwerkevent: wij verzorgen locatie, catering, techniek en programma. Zie [zakelijk evenement op Vlieland](/zakelijk-evenement-vlieland).",
  },
];

const Evenementen = () => {
  const next = sectionCounter();
  return (
    <>
      <Helmet>
        <title>Agenda en evenementen Vlieland | Bureau Vlieland</title>
        <meta
          name="description"
          content="De agenda van Vlieland: Vuurtorenloop, Amusetour en meer. Bureau Vlieland regelt boot, logies en programma rond het evenement: één partij, één factuur."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Agenda en evenementen Vlieland | Bureau Vlieland" />
        <meta property="og:description" content="De agenda van Vlieland: Vuurtorenloop, Amusetour en meer. Bureau Vlieland regelt boot, logies en programma rond het evenement." />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.jpg" />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
      </Helmet>

      <Navigation />

      <main id="main-content">
        <PageHero
          image={amuseTourImage}
          alt="Gasten aan tafel tijdens de Amusetour op Vlieland"
          eyebrow="Agenda"
          title="Agenda en evenementen op Vlieland"
          intro="Van sportief tot culinair: Bureau Vlieland regelt de boot, het verblijf en het programma rond het evenement."
          cta={{ label: "Vertel ons uw wensen", to: "/programma-op-maat" }}
          secondary={{ label: "Zakelijk evenement organiseren", to: "/zakelijk-evenement-vlieland" }}
        />
        {EVENTS.map((event, i) => {
          const { number, tone } = next();
          return <EventSection key={event.title} event={event} number={number} tone={tone} flip={i % 2 === 1} />;
        })}
        <RouteChooser
          title="Deelnemen met uw groep?"
          intro="Wij regelen boot, verblijf en het programma rond het evenement. Kies hoe u wilt starten."
        />
        <FaqSection schemaId="evenementen" pageUrl={URL} items={FAQ} />
        <RelatedLinks />
      </main>
      <Footer />
    </>
  );
};

export default Evenementen;
