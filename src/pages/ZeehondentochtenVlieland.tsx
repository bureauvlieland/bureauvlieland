/**
 * ZeehondentochtenVlieland — SEO landing page voor "zeehondentocht vlieland".
 *
 * Productframing: boottocht vanaf Vlieland naar de zandbanken (o.a. Richel)
 * om grijze en gewone zeehonden te spotten. Te boeken los of als onderdeel
 * van een groepsprogramma.
 */
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import {
  Clock,
  Users,
  MapPin,
  ShieldCheck,
  Anchor,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { WaddenAmbassadeurBadge } from "@/components/WaddenAmbassadeurBadge";
import heroImage from "@/assets/zeehondentocht-vlieland-zandbank.jpg";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Wat is een zeehondentocht op Vlieland?",
    a: "Een zeehondentocht is een begeleide boottocht vanaf de haven van Vlieland naar de zandbanken in de Waddenzee waar zeehonden uitrusten. Met een verrekijker (en vaak ook op het blote oog) zie je grijze en gewone zeehonden van dichtbij — zonder ze te storen.",
  },
  {
    q: "Hoe lang duurt een zeehondentocht vanaf Vlieland?",
    a: "Een tocht duurt gemiddeld 2 tot 3 uur, afhankelijk van het tij en de route. De boot vertrekt vanaf de haven van Oost-Vlieland.",
  },
  {
    q: "Wat is de beste tijd om zeehonden te spotten?",
    a: "Zeehonden liggen vooral rond laag water op de zandbanken — dan zijn de banken droog. De vertrektijden worden daarom afgestemd op het getij. In de zomer (juni–september) is de kans het grootst, maar ook in andere seizoenen worden vrijwel altijd zeehonden gezien.",
  },
  {
    q: "Welke zeehonden zie je rond Vlieland?",
    a: "Twee soorten: de gewone zeehond (kleiner, ronder kopje) en de grote grijze zeehond (langere snuit, fors). Bij Vlieland — vooral op de Richel — komen ze in grote groepen voor.",
  },
  {
    q: "Is een zeehondentocht geschikt voor kinderen?",
    a: "Ja. De boot is overdekt, kinderen kunnen rondlopen en de bemanning vertelt onderweg over de zeehonden, het wad en de eilanden. Ook voor ouderen en minder mobiele bezoekers is de tocht goed te doen.",
  },
  {
    q: "Wat moet ik meenemen?",
    a: "Warme, winddichte kleding (ook in de zomer kan het op het water fris zijn), een verrekijker (vaak ook aan boord te leen) en eventueel zonnebrand of een pet. Drinken en een snack zijn meestal aan boord verkrijgbaar.",
  },
  {
    q: "Wat kost een zeehondentocht vanaf Vlieland?",
    a: "Reken op ongeveer €25 tot €35 per volwassene; kinderen vaak met korting. De exacte prijs en beschikbaarheid hangen af van de aanbieder en datum.",
  },
  {
    q: "Kan een groep een zeehondentocht boeken?",
    a: "Ja. Voor groepen vanaf ongeveer 20 personen reserveren we een tocht op een tijd die past in jullie programma — vaak gecombineerd met de overtocht, lunch en een fietstocht. Eén aanvraag, één factuur.",
  },
];

const ZeehondentochtenVlieland = () => {
  const url = "https://bureauvlieland.nl/zeehondentochten-vlieland";
  const heroImageAbs = `https://bureauvlieland.nl${heroImage}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Zeehondentocht Vlieland boeken | Zeehonden spotten op de zandbanken</title>
        <meta
          name="description"
          content="Een zeehondentocht vanaf Vlieland — per boot naar de zandbanken in de Waddenzee. Gewone én grijze zeehonden van dichtbij. Direct online te boeken of als groep."
        />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="Zeehondentocht Vlieland boeken | Zeehonden spotten" />
        <meta
          property="og:description"
          content="Per boot naar de zandbanken rond Vlieland — gewone én grijze zeehonden spotten. Direct online te boeken."
        />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={heroImageAbs} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TouristTrip",
          name: "Zeehondentocht Vlieland",
          description:
            "Begeleide boottocht vanaf Vlieland naar de zandbanken in de Waddenzee om gewone en grijze zeehonden te spotten.",
          touristType: "Gezinnen, natuurliefhebbers, groepen, alle leeftijden",
          url,
          image: heroImageAbs,
          provider: { "@type": "Organization", name: "Bureau Vlieland" },
          offers: {
            "@type": "AggregateOffer",
            lowPrice: "25.00",
            highPrice: "35.00",
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            url,
          },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://bureauvlieland.nl/" },
            { "@type": "ListItem", position: 2, name: "Zeehondentochten Vlieland", item: url },
          ],
        })}</script>
      </Helmet>

      <Navigation />

      <main id="main-content">
        {/* Hero */}
        <section className="relative h-[55vh] min-h-[420px] flex items-end overflow-hidden">
          <img
            src={heroImage}
            alt="Zeehonden rusten op een zandbank in de Waddenzee bij Vlieland in zacht avondlicht"
            width={1920}
            height={1080}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ocean-deep via-ocean-deep/60 to-transparent" />
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl pb-12 text-primary-foreground">
            <nav aria-label="Kruimelpad" className="text-sm text-primary-foreground/80 mb-3">
              <ol className="flex items-center gap-1">
                <li><Link to="/" className="hover:text-primary-foreground">Home</Link></li>
                <li><ChevronRight className="h-3.5 w-3.5" /></li>
                <li aria-current="page">Zeehondentochten Vlieland</li>
              </ol>
            </nav>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight max-w-3xl">
              Zeehondentochten Vlieland — spotten op de zandbanken
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mb-6">
              Per boot vanaf de haven naar de zandbanken in de Waddenzee — gewone én grijze zeehonden van dichtbij, zonder ze te storen.
            </p>
            <Link to="/snel-aanvragen?categorie=excursies&onderwerp=zeehondentocht">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                Boek je zeehondentocht
              </Button>
            </Link>
          </div>
        </section>

        {/* Intro + trust */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16">
          <div className="prose prose-neutral max-w-none text-foreground space-y-4">
            <p>
              Vlieland ligt midden in het Werelderfgoed Waddenzee — en op een steenworp afstand liggen de beroemde zandbanken (zoals de Richel) waar honderden zeehonden uitrusten. Tijdens een zeehondentocht vaar je vanaf de haven met een ervaren schipper het wad op, op zoek naar gewone en grijze zeehonden. Op afstand, met respect voor de dieren, maar zo dichtbij dat je ze prachtig kunt bekijken.
            </p>
            <p>
              De tocht duurt 2 tot 3 uur en wordt afgestemd op het getij — bij laag water zijn de zandplaten droog en liggen de zeehonden eropuit te rusten. Tussendoor vertelt de schipper over het wad, de eilanden en hoe deze unieke zee werkt.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <WaddenAmbassadeurBadge variant="compact" />
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Lokale, ervaren schippers</li>
              <li className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Geschikt voor alle leeftijden</li>
              <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Onderdeel van een groepsprogramma mogelijk</li>
            </ul>
          </div>
        </section>

        {/* Wat ga je zien / waarom Vlieland */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl space-y-10">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">
                Welke zeehonden zie je rond Vlieland?
              </h2>
              <p className="text-foreground">
                In de Waddenzee leven twee soorten: de gewone zeehond — kleiner, rond kopje, vaak in grote groepen — en de grijze zeehond, met zijn langere snuit en stevige postuur het grootste roofdier van Nederland. Beide soorten zijn vrijwel zeker te zien op de zandbanken rond Vlieland; vooral op de Richel komen ze met honderden tegelijk samen.
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">
                Waarom een zeehondentocht vanaf Vlieland?
              </h2>
              <p className="text-foreground">
                Vlieland ligt korter bij de grote zeehondenkolonies dan vrijwel elk ander vertrekpunt. Dat betekent: minder varen, meer tijd bij de dieren. Dat we Werelderfgoed-ambassadeur zijn helpt: we werken met aanbieders die het gebied kennen en respecteren — geen toeristische pretboot, maar een serieuze natuurtocht.
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">
                Voor groepen — als onderdeel van je dag op Vlieland
              </h2>
              <p className="text-foreground">
                Voor bedrijfsuitjes, teambuilding of familieweekenden combineren we de zeehondentocht graag met de overtocht vanuit Harlingen, fietsverhuur, een lunch in het dorp en eventueel een wadexcursie. Eén aanvraag, één aanspreekpunt, één factuur.
              </p>
            </div>
          </div>
        </section>

        {/* Praktisch */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl py-16">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8 text-center">Praktisch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Clock, title: "Duur", text: "2 tot 3 uur, afhankelijk van het tij." },
              { icon: Anchor, title: "Vertrekpunt", text: "Haven van Oost-Vlieland — vertrektijden afgestemd op laagwater." },
              { icon: Users, title: "Voor wie", text: "Alle leeftijden. Overdekte boot, toegankelijk voor minder mobiele bezoekers." },
              { icon: MapPin, title: "Waar zie je ze", text: "Zandbanken in de Waddenzee (o.a. de Richel) rond Vlieland." },
            ].map(({ icon: Icon, title, text }) => (
              <Card key={title}>
                <CardContent className="p-6 text-center">
                  <Icon className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-display font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted-foreground text-center max-w-2xl mx-auto">
            <strong>Meenemen:</strong> warme winddichte kleding (ook in de zomer), verrekijker (vaak aan boord te leen), zonnebrand en pet bij zon.
          </p>
        </section>

        {/* CTA / boeken */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">
              Boek je zeehondentocht op Vlieland
            </h2>
            <p className="text-muted-foreground mb-2">
              Reserveer een individuele plek of laat ons de tocht inplannen als onderdeel van een compleet programma voor je groep.
            </p>
            <p className="text-foreground mb-6">
              <strong>Volwassenen vanaf ±€25</strong>{" "}
              <span className="text-muted-foreground">(richtprijs €25–€35; kinderen met korting)</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/snel-aanvragen?categorie=excursies&onderwerp=zeehondentocht">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto">
                  Direct boeken
                </Button>
              </Link>
              <Link to="/programma-samenstellen">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Toevoegen aan mijn programma
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6">
            Veelgestelde vragen over de zeehondentocht op Vlieland
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map(({ q, a }, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left font-semibold">{q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Interne links */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-display font-bold text-foreground mb-8 text-center">
                Bekijk ook
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Link
                  to="/wadlopen-vlieland"
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Wadexcursie op Vlieland</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link
                  to="/activiteiten-vlieland"
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Alle activiteiten op Vlieland</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link
                  to="/familieweekend-vlieland"
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Familieweekend op Vlieland</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link
                  to="/bedrijfsuitje-vlieland"
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Bedrijfsuitje op Vlieland</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ZeehondentochtenVlieland;
