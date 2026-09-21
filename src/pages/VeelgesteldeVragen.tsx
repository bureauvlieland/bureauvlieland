import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Mail, MessageCircle } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { RESPONSE_TIME } from "@/content/promises";
import { buildWhatsAppHref, openWhatsApp } from "@/lib/whatsappLink";
import { renderRichText, stripRichText } from "@/lib/richText";
import { Container, PageHero, RouteChooser, Section, SectionHeader } from "@/components/system";
import { sectionCounter } from "@/components/landing/sectionCounter";

const URL = "https://bureauvlieland.nl/veelgestelde-vragen";

type FaqItem = { id: string; q: string; a: string };

const GROUPS: { id: string; title: string; items: FaqItem[] }[] = [
  {
    id: "kosten",
    title: "Prijzen en offerte",
    items: [
      {
        id: "kosten",
        q: "Wat kost een bedrijfsuitje op Vlieland?",
        a: "De prijs hangt af van het aantal deelnemers, de duur en de gekozen activiteiten, catering en overnachting. Een dagprogramma begint vanaf circa € 95 per persoon inclusief btw. Voor een meerdaags programma met overnachting rekent u indicatief op € 275 tot € 450 per persoon per etmaal. U ontvangt altijd een volledig gespecificeerde offerte zonder verrassingen achteraf.",
      },
      {
        id: "offerte",
        q: "Hoe snel krijg ik een offerte?",
        a: `${RESPONSE_TIME.sentence} Bij een eenvoudige aanvraag vaak sneller; bij maatwerk stemmen wij meerdere partners op het eiland af. U kunt uw programma alvast [zelf samenstellen](/programma-samenstellen) en direct de prijzen per onderdeel zien.`,
      },
      {
        id: "factuur",
        q: "Krijg ik één factuur of losse facturen van elke partner?",
        a: "U krijgt één centrale factuur van Bureau Vlieland voor het volledige programma: activiteiten, catering, overnachting en vervoer. Wij verrekenen zelf met de eilandpartners; u heeft één aanspreekpunt en één administratieve afhandeling.",
      },
    ],
  },
  {
    id: "programma",
    title: "Programma en maatwerk",
    items: [
      {
        id: "maatwerk",
        q: "Kan ik ook helemaal op maat boeken?",
        a: "Ja. U kunt kiezen uit onze [voorbeeldprogramma's](/voorbeeldprogrammas), losse activiteiten combineren, of ons vragen om een [programma op maat](/programma-op-maat) uit te werken op basis van uw doel, groep en budget.",
      },
      {
        id: "wijzigen",
        q: "Kan ik later nog wijzigingen doorgeven?",
        a: "Ja. Deelnemersaantal en programmaonderdelen zijn tot enkele dagen voor aanvang aan te passen. Definitieve deelnemersaantallen ontvangen wij graag uiterlijk 7 dagen van tevoren. Grote wijzigingen vlak voor de datum kunnen wij niet altijd meer accommoderen.",
      },
      {
        id: "groepsgrootte",
        q: "Wat is de minimale of maximale groepsgrootte?",
        a: "Wij organiseren programma's vanaf 8 personen. Er is nagenoeg geen bovengrens; wij hebben ervaring met groepen tot meer dan 400 deelnemers. Bij grote groepen splitsen wij op in deelactiviteiten, zodat alles logistiek soepel verloopt.",
      },
    ],
  },
  {
    id: "praktisch",
    title: "Praktisch",
    items: [
      {
        id: "overnachten",
        q: "Regelt Bureau Vlieland ook de overnachting?",
        a: "Ja. Wij werken samen met vrijwel alle [hotels, groepsaccommodaties en campings](/logies-vlieland) op Vlieland. U geeft uw wensen door en wij zoeken de best passende optie binnen uw budget en de beschikbaarheid.",
      },
      {
        id: "boot",
        q: "Boekt Bureau Vlieland ook de veerboot vanaf Harlingen?",
        a: "Ja. Groepstickets bij Rederij Doeksen, de watertaxi en bagagevervoer regelen wij in één keer mee met uw programma. U hoeft niets zelf bij de rederij te boeken.",
      },
      {
        id: "annulering",
        q: "Wat als het weer tegenzit of ik moet annuleren?",
        a: "Bij annulering gelden onze [algemene voorwaarden](/algemene-voorwaarden). Bij slecht weer schuiven wij waar mogelijk activiteiten naar een alternatief binnen, zodat het programma gewoon doorgaat.",
      },
    ],
  },
];

export default function VeelgesteldeVragen() {
  const next = sectionCounter();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${URL}#faq`,
    url: URL,
    inLanguage: "nl-NL",
    mainEntity: GROUPS.flatMap((g) =>
      g.items.map((i) => ({
        "@type": "Question",
        name: i.q,
        acceptedAnswer: { "@type": "Answer", text: stripRichText(i.a) },
      })),
    ),
  };

  return (
    <>
      <Helmet>
        <title>Veelgestelde vragen – Bureau Vlieland</title>
        <meta
          name="description"
          content="Antwoorden op de meestgestelde vragen over bedrijfsuitjes, groepsprogramma's, offerte en logistiek op Vlieland."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Veelgestelde vragen – Bureau Vlieland" />
        <meta property="og:description" content="Prijzen, offerte, maatwerk en logistiek voor bedrijfsuitjes en groepsprogramma's op Vlieland." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Navigation />

      <main id="main-content">
        <PageHero
          eyebrow="Veelgestelde vragen"
          title="Veelgestelde vragen"
          intro="De meestgestelde vragen over programma's, prijzen en praktische zaken op Vlieland. Staat uw vraag er niet bij? Stel hem via de chat of neem contact op."
          cta={{ label: "Stel uw programma samen", to: "/programma-samenstellen" }}
          secondary={{ label: "Neem contact op", to: "/contact" }}
        />

        {GROUPS.map((group) => {
          const { number, tone } = next();
          return (
            <Section key={group.id} id={group.id} tone={tone} spacing="compact" className="scroll-mt-24">
              <Container size="prose">
                <SectionHeader eyebrow="Veelgestelde vragen" number={number} title={group.title} />
                <Accordion type="multiple" className="mt-6 w-full">
                  {group.items.map((item) => (
                    <AccordionItem key={item.id} value={item.id} id={item.id} className="scroll-mt-24">
                      <AccordionTrigger className="text-left text-base font-medium md:text-lg">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-base leading-relaxed text-muted-foreground">{renderRichText(item.a)}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Container>
            </Section>
          );
        })}

        <Section tone="sand" spacing="compact">
          <Container size="prose">
            <SectionHeader as="h2" size="md" weight="medium" title="Staat uw vraag er niet bij?" intro="Neem gerust direct contact op. Wij denken graag met u mee, vrijblijvend en zonder verplichtingen." />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/contact">
                  <Mail aria-hidden="true" />
                  Contact opnemen
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a
                  href={buildWhatsAppHref({ phone: "31562700208" })}
                  onClick={(e) => {
                    e.preventDefault();
                    openWhatsApp({ phone: "31562700208" });
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle aria-hidden="true" />
                  Chat via WhatsApp
                </a>
              </Button>
            </div>
          </Container>
        </Section>

        <RouteChooser />
        <RelatedLinks />
      </main>

      <Footer />
    </>
  );
}
