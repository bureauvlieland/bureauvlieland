import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail } from "lucide-react";
import { buildWhatsAppHref, openWhatsApp } from "@/lib/whatsappLink";

type FaqItem = { id: string; q: string; a: React.ReactNode; plain: string };

const groups: { id: string; title: string; items: FaqItem[] }[] = [
  {
    id: "kosten",
    title: "Prijzen & offerte",
    items: [
      {
        id: "kosten",
        q: "Wat kost een bedrijfsuitje op Vlieland?",
        plain:
          "De prijs hangt af van het aantal deelnemers, de duur en de gekozen activiteiten, catering en overnachting. Een dagprogramma begint vanaf circa €95 p.p. inclusief BTW. Voor een meerdaags programma met overnachting rekent u indicatief op €275–€450 p.p. per etmaal.",
        a: (
          <>
            De prijs hangt af van het aantal deelnemers, de duur en de gekozen
            activiteiten, catering en overnachting. Een dagprogramma begint vanaf
            circa <strong>€95 p.p. incl. BTW</strong>. Voor een meerdaags programma
            met overnachting rekent u indicatief op <strong>€275–€450 p.p. per etmaal</strong>.
            U ontvangt altijd een volledig gespecificeerde offerte zonder verrassingen achteraf.
          </>
        ),
      },
      {
        id: "offerte",
        q: "Hoe snel krijg ik een offerte?",
        plain:
          "Standaard binnen 2 werkdagen. Voor complexere maatwerkaanvragen kan het 3–5 werkdagen duren omdat we dan meerdere partners op het eiland afstemmen.",
        a: (
          <>
            Standaard binnen <strong>2 werkdagen</strong>. Voor complexere
            maatwerkaanvragen 3–5 werkdagen omdat we dan meerdere partners op het
            eiland afstemmen. U kunt uw programma alvast zelf samenstellen via{" "}
            <Link to="/programma-samenstellen" className="text-primary underline">
              programma samenstellen
            </Link>{" "}
            en direct een indicatieve prijs zien.
          </>
        ),
      },
      {
        id: "factuur",
        q: "Krijg ik één factuur of losse facturen van elke partner?",
        plain:
          "U krijgt één centrale factuur van Bureau Vlieland voor het volledige programma. Wij verrekenen daarna zelf met de eilander partners.",
        a: (
          <>
            U krijgt <strong>één centrale factuur</strong> van Bureau Vlieland voor
            het volledige programma — activiteiten, catering, overnachting en
            vervoer. Wij verrekenen zelf met de eilander partners, u heeft één
            aanspreekpunt en één administratieve afhandeling.
          </>
        ),
      },
    ],
  },
  {
    id: "programma",
    title: "Programma & maatwerk",
    items: [
      {
        id: "maatwerk",
        q: "Kan ik ook helemaal op maat boeken?",
        plain:
          "Ja. Naast onze voorbeeldprogramma's en losse activiteiten stellen we ook volledig op maat programma's samen op basis van uw doel, groep en budget.",
        a: (
          <>
            Ja. U kunt kiezen uit onze{" "}
            <Link to="/voorbeeldprogrammas" className="text-primary underline">
              voorbeeldprogramma's
            </Link>
            , losse activiteiten combineren, of ons vragen om een{" "}
            <Link to="/programma-op-maat" className="text-primary underline">
              programma op maat
            </Link>{" "}
            uit te werken op basis van uw doel, groep en budget.
          </>
        ),
      },
      {
        id: "wijzigen",
        q: "Kan ik later nog wijzigingen doorgeven?",
        plain:
          "Ja. Deelnemersaantal en programmaonderdelen zijn tot enkele dagen voor aanvang aan te passen. Definitieve deelnemersaantallen ontvangen we graag uiterlijk 7 dagen van tevoren.",
        a: (
          <>
            Ja. Deelnemersaantal en programmaonderdelen zijn tot enkele dagen voor
            aanvang aan te passen. Definitieve deelnemersaantallen ontvangen we
            graag <strong>uiterlijk 7 dagen van tevoren</strong>. Grote wijzigingen
            vlak voor de datum kunnen we niet altijd meer accommoderen.
          </>
        ),
      },
      {
        id: "groepsgrootte",
        q: "Wat is de minimale of maximale groepsgrootte?",
        plain:
          "We organiseren programma's vanaf 8 personen. Er is nagenoeg geen bovengrens; we hebben ervaring met groepen tot 400+ deelnemers.",
        a: (
          <>
            We organiseren programma's vanaf <strong>8 personen</strong>. Er is
            nagenoeg geen bovengrens; we hebben ervaring met groepen tot{" "}
            <strong>400+ deelnemers</strong>. Bij grote groepen splitsen we op in
            deelactiviteiten om alles logistiek soepel te laten verlopen.
          </>
        ),
      },
    ],
  },
  {
    id: "praktisch",
    title: "Praktisch",
    items: [
      {
        id: "overnachten",
        q: "Regelen jullie ook overnachting?",
        plain:
          "Ja. We werken samen met hotels, groepsaccommodaties en campings op Vlieland. U geeft de wensen door en wij zoeken de best passende optie.",
        a: (
          <>
            Ja. We werken samen met vrijwel alle{" "}
            <Link to="/logies-vlieland" className="text-primary underline">
              hotels, groepsaccommodaties en campings
            </Link>{" "}
            op Vlieland. U geeft uw wensen door en wij zoeken de best passende
            optie binnen uw budget en beschikbaarheid.
          </>
        ),
      },
      {
        id: "boot",
        q: "Boeken jullie ook de veerboot vanaf Harlingen?",
        plain:
          "Ja. Groepstickets, watertaxi en bagagevervoer regelen we in één keer mee met uw programma. U hoeft niets zelf bij de rederij te boeken.",
        a: (
          <>
            Ja. Groepstickets bij Rederij Doeksen, de watertaxi en bagagevervoer
            regelen we in één keer mee met uw programma. U hoeft niets zelf bij de
            rederij te boeken.
          </>
        ),
      },
      {
        id: "annulering",
        q: "Wat als het weer tegenzit of ik moet annuleren?",
        plain:
          "Bij annulering gelden onze algemene voorwaarden. Bij slecht weer schuiven we waar mogelijk activiteiten naar een indoor alternatief zodat het programma doorgaat.",
        a: (
          <>
            Bij annulering gelden onze{" "}
            <Link to="/algemene-voorwaarden" className="text-primary underline">
              algemene voorwaarden
            </Link>
            . Bij slecht weer schuiven we waar mogelijk activiteiten naar een
            indoor alternatief zodat het programma gewoon doorgaat.
          </>
        ),
      },
    ],
  },
];

export default function VeelgesteldeVragen() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((g) =>
      g.items.map((i) => ({
        "@type": "Question",
        name: i.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: i.plain,
        },
      }))
    ),
  };

  return (
    <>
      <Helmet>
        <title>Veelgestelde vragen — Bureau Vlieland</title>
        <meta
          name="description"
          content="Antwoorden op de meestgestelde vragen over bedrijfsuitjes, groepsprogramma's, offerte en logistiek op Vlieland."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/veelgestelde-vragen" />
        <meta property="og:title" content="Veelgestelde vragen — Bureau Vlieland" />
        <meta
          property="og:description"
          content="Prijzen, offerte, maatwerk en logistiek voor bedrijfsuitjes en groepsprogramma's op Vlieland."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Navigation />

      <main id="main-content" className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Veelgestelde vragen
          </h1>
          <p className="text-lg text-muted-foreground">
            De meestgestelde vragen over programma's, prijzen en praktische zaken
            op Vlieland. Staat uw vraag er niet bij? Stel hem dan via de chat of
            neem contact op — we reageren snel.
          </p>
        </header>

        {groups.map((g) => (
          <section key={g.id} id={g.id} className="mb-10 scroll-mt-24">
            <h2 className="text-xl font-semibold text-foreground mb-4">{g.title}</h2>
            <Accordion type="multiple" className="border border-border rounded-lg divide-y divide-border">
              {g.items.map((item) => (
                <AccordionItem key={item.id} value={item.id} id={item.id} className="scroll-mt-24 border-0 px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="font-medium">{item.q}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}

        <section className="mt-12 p-6 rounded-lg border border-border bg-primary/5">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Staat uw vraag er niet bij?
          </h2>
          <p className="text-muted-foreground mb-4">
            Neem gerust direct contact op. We denken graag mee — vrijblijvend en
            zonder verplichtingen.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/contact">
              <Button className="gap-2">
                <Mail className="h-4 w-4" /> Contact opnemen
              </Button>
            </Link>
            <a
              href="https://wa.me/31562700208"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" /> Chat via WhatsApp
              </Button>
            </a>
          </div>
        </section>
      </main>

      <RelatedLinks />
      <Footer />
    </>
  );
}
