import { Helmet } from "react-helmet";
import { Award, BookOpen, Briefcase, GraduationCap, Handshake, MapPin, MessageSquareHeart, Package, PenLine, Truck, UserCheck, Utensils } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { Container, PageHero, RouteChooser, Section, SectionHeader, type RouteChooserRoute } from "@/components/system";
import { BodySection } from "@/components/landing/sections";
import { sectionCounter } from "@/components/landing/sectionCounter";
import type { LandingSection } from "@/content/landings/types";
import rmdBeachTraining from "@/assets/rmd-beach-training.jpg";
import mindset22Indoor from "@/assets/mindset22-indoor.jpg";
import rmdBeachGroup from "@/assets/rmd-beach-group.jpg";

const URL = "https://bureauvlieland.nl/samenwerken";

const SECTIONS: LandingSection[] = [
  {
    kind: "prose",
    title: "U de inhoud, wij de uitvoering",
    align: "center",
    paragraphs: [
      "Bureau Vlieland werkt samen met professionals die hun klanten of deelnemers naar Vlieland willen brengen. Als lokale partner leveren wij de kennis, logistiek en uitvoering op het eiland, zodat u zich kunt richten op wat u het beste doet.",
      "Of het nu gaat om een eenmalig project of een structurele samenwerking: wij zijn uw betrouwbare verlengstuk op Vlieland.",
    ],
  },
  {
    kind: "features",
    title: "Wat wij voor partners betekenen",
    intro: "Van accommodatie tot catering, van vervoer tot begeleiding: wij ontzorgen volledig.",
    columns: 3,
    items: [
      { icon: MapPin, title: "Lokale kennis", text: "Wij kennen alle locaties, leveranciers en mogelijkheden op Vlieland. Van vergaderruimtes tot strandlocaties." },
      { icon: Truck, title: "Logistiek en vervoer", text: "Transfers, fietsen, busjes en materiaalvervoer. Alles geregeld, zonder dat u zich er zorgen over hoeft te maken." },
      { icon: Utensils, title: "Catering", text: "Van ontbijt tot diner, van strandborrel tot walking dinner. Onze cateringpartners leveren topkwaliteit." },
      { icon: Package, title: "Materiaal en faciliteiten", text: "Tenten, meubilair, AV-apparatuur, flipovers: alles wat u nodig heeft voor een geslaagd programma." },
      { icon: UserCheck, title: "Begeleiding", text: "Lokale gidsen en coördinatie op de dag zelf. Wij zijn de ogen en handen op het eiland." },
      { icon: Handshake, title: "White-label", text: "Uw naam, onze handen. Wij werken op de achtergrond, zodat uw relatie met de klant centraal blijft." },
    ],
  },
  {
    kind: "split",
    title: "Voordelen van samenwerking",
    paragraphs: ["Waarom kiezen evenementenbureaus, trainers en coaches voor Bureau Vlieland als lokale partner?"],
    checklist: [
      "Geen overhead van een eigen kantoor op Vlieland",
      "Toegang tot ons netwerk van betrouwbare leveranciers",
      "Flexibele samenwerking: per project of structureel",
      "Transparante prijsopbouw voor doorberekening",
      "Snelle respons en korte lijnen",
      "Ervaring met groepen van 10 tot 150 personen",
    ],
    image: { src: rmdBeachGroup, alt: "Groep tijdens een training op het strand van Vlieland" },
  },
  {
    kind: "features",
    title: "Voor wie is dit interessant?",
    columns: 3,
    items: [
      { icon: Briefcase, title: "Evenementenbureaus", text: "U heeft een klant die naar Vlieland wil, maar geen lokale kennis. Wij zijn uw verlengstuk op het eiland." },
      { icon: GraduationCap, title: "Trainers en coaches", text: "U levert de inhoud, wij de setting. Richt u op uw training, terwijl wij alles eromheen regelen." },
      { icon: Award, title: "Incentivebureaus", text: "Een bijzondere beloning voor een team? Wij maken van Vlieland een onvergetelijke ervaring." },
    ],
  },
];

const CASES = [
  {
    image: { src: rmdBeachGroup, alt: "RMD Trainingen op het strand van Vlieland" },
    title: "RMD Trainingen",
    text: "RMD Trainingen biedt ervaringsgerichte programma's voor leiderschaps- en teamtrainingen. Bureau Vlieland verzorgt de lokale organisatie: accommodatie, catering, vervoer en eilandactiviteiten. RMD levert de inhoud, wij de setting.",
    quote: "De samenwerking met Bureau Vlieland zorgt ervoor dat wij ons volledig kunnen focussen op de training. De logistiek is in vertrouwde handen.",
  },
  {
    image: { src: mindset22Indoor, alt: "Sessie van Mindset22 op Vlieland" },
    title: "Mindset22",
    text: "Mindset22 helpt teams en individuen hun talenten te benutten door positieve, op groei gerichte denkpatronen te ontwikkelen. Vlieland biedt de perfecte setting voor focus en verdieping; Bureau Vlieland regelt de rest.",
    quote: "Op Vlieland is er ruimte om echt na te denken. Bureau Vlieland maakt het praktisch mogelijk.",
  },
];

const ROUTES: RouteChooserRoute[] = [
  {
    icon: MessageSquareHeart,
    title: "Neem contact op",
    text: "Vertel ons over uw klant of deelnemers. Dan bespreken wij de rolverdeling en maken we afspraken over commissie en facturatie.",
    to: "/contact",
    label: "Neem contact op",
    primary: true,
  },
  {
    icon: BookOpen,
    title: "Bekijk de bouwstenen",
    text: "Alle activiteiten, catering en vervoer die wij op het eiland boeken, met prijzen per onderdeel.",
    to: "/bouwstenen",
    label: "Bekijk de bouwstenen",
  },
  {
    icon: PenLine,
    title: "Voorbeeldprogramma's",
    text: "Programma's van eerdere groepen, om te zien wat er op Vlieland mogelijk is.",
    to: "/voorbeeldprogrammas",
    label: "Bekijk de voorbeelden",
  },
];

const FAQ = [
  {
    question: "Voor wie is deze samenwerking bedoeld?",
    answer:
      "Voor trainers, coaches en evenementenbureaus van de vaste wal die hun klanten of deelnemers naar Vlieland brengen. U verzorgt de inhoud, wij de uitvoering op het eiland. Aanbieders op Vlieland zelf (logies, activiteiten, horeca) zijn [eilandpartners](/partners); daarvoor gelden andere afspraken.",
  },
  {
    question: "Hoe zijn commissie en facturatie geregeld?",
    answer:
      "Dat spreken wij per samenwerking af, passend bij uw rol en die van ons. Wie de klant factureert en welke vergoeding of commissie daar tegenover staat, leggen wij vooraf vast, zodat iedereen weet waar hij aan toe is.",
  },
  {
    question: "Wat verzorgt Bureau Vlieland precies?",
    answer:
      "De lokale organisatie: accommodatie, vergader- en buitenlocaties, catering, vervoer op het eiland en de coördinatie tijdens het programma. Wij kennen de eilandpartners persoonlijk en boeken alles voor u.",
  },
  {
    question: "Hoe start een samenwerking?",
    answer:
      "Neem contact op via hallo@bureauvlieland.nl of het [contactformulier](/contact). Na een kennismaking maken wij afspraken over de rolverdeling, commissie en facturatie en werken wij uw eerste programma samen uit.",
  },
];

const Programmas = () => {
  const next = sectionCounter();
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Samenwerken met Bureau Vlieland | Lokale partner op Vlieland</title>
        <meta
          name="description"
          content="Lokale partner voor evenementenbureaus, trainers en coaches op Vlieland. Wij verzorgen logistiek, catering en coördinatie. U de inhoud, wij de uitvoering."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Samenwerken met Bureau Vlieland | Lokale partner" />
        <meta property="og:description" content="Lokale partner voor evenementenbureaus, trainers en coaches op Vlieland. Logistiek, catering en coördinatie uit één hand." />
        <meta property="og:url" content={URL} />
      </Helmet>
      <Navigation />
      <main id="main-content">
        <PageHero
          image={rmdBeachTraining}
          alt="Training op het strand van Vlieland"
          eyebrow="Voor professionals"
          title="Samenwerken met Bureau Vlieland"
          intro="Lokale partner voor evenementenbureaus, trainers en coaches. U de inhoud, wij de uitvoering op het eiland."
          cta={{ label: "Neem contact op", to: "/contact" }}
          secondary={{ label: "Bekijk de bouwstenen", to: "/bouwstenen" }}
        />

        {SECTIONS.map((section, i) => {
          const { number, tone } = next();
          return <BodySection key={`${section.kind}-${i}`} section={section} tone={tone} eyebrow="Samenwerken" number={number} />;
        })}

        {(() => {
          const { number, tone } = next();
          return (
            <Section tone={tone}>
              <Container size="wide">
                <SectionHeader
                  eyebrow="Samenwerken"
                  number={number}
                  title="Voorbeelden van samenwerkingen"
                  intro="Bureau Vlieland werkt al jaren samen met trainers en coaches. Twee voorbeelden van hoe zo'n samenwerking eruitziet."
                  align="center"
                />
                <div className="mt-12 grid gap-4 md:grid-cols-2">
                  {CASES.map((c) => (
                    <article key={c.title} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
                      <figure className="aspect-[16/10] w-full overflow-hidden bg-muted">
                        <img src={c.image.src} alt={c.image.alt} className="h-full w-full object-cover" loading="lazy" />
                      </figure>
                      <div className="flex flex-1 flex-col p-6">
                        <h3 className="font-display text-display-md font-medium text-foreground">{c.title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
                        <blockquote className="mt-5 border-l-2 border-primary pl-4 font-display text-lg font-light leading-snug text-foreground">
                          <span aria-hidden="true">“</span>
                          {c.quote}
                          <span aria-hidden="true">”</span>
                        </blockquote>
                      </div>
                    </article>
                  ))}
                </div>
              </Container>
            </Section>
          );
        })()}

        <RouteChooser
          title="Laten we kennismaken"
          intro="Wilt u verkennen hoe Bureau Vlieland uw lokale partner kan zijn? Wij bespreken graag de mogelijkheden, vrijblijvend."
          routes={ROUTES}
        />
        <FaqSection schemaId="samenwerken" pageUrl={URL} title="Veelgestelde vragen van samenwerkingspartners" items={FAQ} />
        <RelatedLinks />
      </main>
      <Footer />
    </div>
  );
};

export default Programmas;
