/**
 * ActiviteitenVlieland — redactioneel SEO-overzicht van wat je op Vlieland kunt doen.
 *
 * Verschil met /bouwstenen (transactionele catalogus): deze pagina is een
 * thematisch overzicht dat doorlinkt naar de juiste landingspagina of
 * bouwsteen-detail. Doel-zoekwoorden: "vlieland activiteiten",
 * "wat te doen op vlieland", "uitjes vlieland".
 */
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Waves,
  Bike,
  Landmark,
  UtensilsCrossed,
  Users,
  Compass,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GoogleReviewsBlock } from "@/components/GoogleReviewsBlock";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Thema = {
  icon: typeof Waves;
  title: string;
  intro: string;
  items: { label: string; to: string; description: string }[];
};

const themas: Thema[] = [
  {
    icon: Waves,
    title: "Wadden & natuur",
    intro:
      "Vlieland ligt midden in het UNESCO-Werelderfgoed Waddenzee. Het wad, de zandbanken en de duinen zijn dé reden om te komen.",
    items: [
      {
        label: "Wadexcursie / wadlopen",
        to: "/wadlopen-vlieland",
        description: "Met een lokale gids het wad op — voor alle leeftijden.",
      },
      {
        label: "Zeehondentocht",
        to: "/zeehondentochten-vlieland",
        description: "Per boot naar de zandbanken om zeehonden te spotten.",
      },
      {
        label: "Excursies Staatsbosbeheer",
        to: "/bouwstenen",
        description: "Strandjutten, vogels kijken, paddenstoelen — onder leiding.",
      },
    ],
  },
  {
    icon: Bike,
    title: "Actief op het eiland",
    intro:
      "Vlieland is autoluw — fiets, voet en strand zijn koning. Van rustige fietstocht tot stevige strandsessie.",
    items: [
      {
        label: "Begeleide fietstocht",
        to: "/activiteit/fietstocht-met-begeleiding",
        description: "Ontdek de mooiste plekken met een lokale gids.",
      },
      {
        label: "Blokarten op het strand",
        to: "/bouwstenen",
        description: "Zeilen op wielen over het Vliehors-strand.",
      },
      {
        label: "Vuurtoren beklimmen",
        to: "/bouwstenen",
        description: "Honderden treden naar het hoogste punt van het eiland.",
      },
    ],
  },
  {
    icon: Landmark,
    title: "Cultuur & historie",
    intro:
      "Eilandverhalen: van walvisvaarders tot Drenkelingenhuisje. Kleinschalig maar verrassend.",
    items: [
      {
        label: "Museum Tromp's Huys",
        to: "/bouwstenen",
        description: "Het oudste huis van Vlieland — eilandgeschiedenis.",
      },
      {
        label: "Dorpsommetje Oost-Vlieland",
        to: "/bouwstenen",
        description: "Een wandeling langs de mooiste plekjes van het dorp.",
      },
      {
        label: "Vuurboetsduin",
        to: "/bouwstenen",
        description: "Hoogste duin met uitzicht over het hele eiland.",
      },
    ],
  },
  {
    icon: UtensilsCrossed,
    title: "Eten & drinken",
    intro:
      "Lunches met uitzicht, BBQ op het strand of een diner in het dorp — we regelen het.",
    items: [
      {
        label: "Catering & lunches",
        to: "/catering",
        description: "Van borrelhap tot warm buffet, op locatie geleverd.",
      },
      {
        label: "Restaurants & terrassen",
        to: "/bouwstenen",
        description: "Eilandadressen die we zelf graag aanbevelen.",
      },
      {
        label: "BBQ op het strand",
        to: "/catering-aanvragen",
        description: "Vergunning, koks en setup — wij regelen het volledige programma.",
      },
    ],
  },
  {
    icon: Users,
    title: "Voor groepen",
    intro:
      "Bedrijfsuitje, teambuilding of familieweekend: we stellen een compleet programma samen — één partij, één factuur.",
    items: [
      {
        label: "Bedrijfsuitje Vlieland",
        to: "/bedrijfsuitje-vlieland",
        description: "Compleet dag- of meerdaagsprogramma voor teams.",
      },
      {
        label: "Teambuilding",
        to: "/teamuitje-vlieland",
        description: "Activiteiten die je team echt dichter bij elkaar brengen.",
      },
      {
        label: "Familieweekend",
        to: "/familieweekend-vlieland",
        description: "Een weekend dat voor jong én oud werkt.",
      },
      {
        label: "Voorbeeldprogramma's",
        to: "/voorbeeldprogrammas",
        description: "Concrete dagindelingen uit eerdere groepen — gratis inspiratie.",
      },
    ],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Wat zijn de leukste activiteiten op Vlieland?",
    a: "Een wadexcursie en een zeehondentocht zijn klassiekers. Fietsen door de duinen, blokarten op de Vliehors en de vuurtoren beklimmen horen ook in elk programma thuis. Voor groepen combineren we activiteiten tot een compleet dagprogramma.",
  },
  {
    q: "Wat kun je doen op Vlieland bij slecht weer?",
    a: "Museum Tromp's Huys, het Centrum voor Natuur en Landschap, een proeverij of een workshop binnen zijn goede alternatieven. Veel buitenactiviteiten — zoals een wadexcursie of fietstocht — gaan trouwens ook gewoon door bij regen; daar zijn we op gekleed.",
  },
  {
    q: "Wat is er te doen met kinderen op Vlieland?",
    a: "De Vliehors Expres, een wadexcursie, vuurtoren beklimmen, strandzeilen en strandjutten zijn populair bij kinderen. Vlieland is autoluw, dus kinderen kunnen overal veilig fietsen.",
  },
  {
    q: "Wanneer is het beste seizoen voor activiteiten op Vlieland?",
    a: "Mei tot oktober is hoogseizoen — alle aanbieders draaien dan vol. Buiten dat seizoen kan veel ook nog, maar het aanbod is beperkter. Voor groepen plannen we het hele jaar door.",
  },
  {
    q: "Kun je activiteiten op Vlieland vooraf reserveren?",
    a: "Ja. Wadexcursies, zeehondentochten, fietstochten met gids en catering zijn allemaal te reserveren. Via Bureau Vlieland boek je in één keer alles voor je groep, inclusief de boot en eventueel overnachting.",
  },
  {
    q: "Hoe kom ik op Vlieland?",
    a: "Met de boot van Rederij Doeksen vanuit Harlingen. Auto's mogen niet mee — Vlieland is autoluw. Reken voor de overtocht ongeveer 1,5 uur (gewone boot) of 45 minuten (snelboot).",
  },
];

const ActiviteitenVlieland = () => {
  const url = "https://bureauvlieland.nl/activiteiten-vlieland";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Activiteiten Vlieland: wat te doen op het eiland | Bureau Vlieland</title>
        <meta
          name="description"
          content="Wat te doen op Vlieland? Wadexcursies, zeehondentochten, fietsen, blokarten, vuurtoren, museum en meer. Het complete overzicht — los te boeken of als compleet programma."
        />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Activiteiten Vlieland: wat te doen op het eiland" />
        <meta
          property="og:description"
          content="Het complete overzicht van activiteiten op Vlieland — wadlopen, zeehonden, fietsen, cultuur en meer."
        />
        <meta property="og:url" content={url} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://bureauvlieland.nl/" },
            { "@type": "ListItem", position: 2, name: "Activiteiten Vlieland", item: url },
          ],
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Activiteiten op Vlieland",
          itemListElement: themas.flatMap((thema, ti) =>
            thema.items.map((item, ii) => ({
              "@type": "ListItem",
              position: ti * 10 + ii + 1,
              name: item.label,
              url: `https://bureauvlieland.nl${item.to}`,
            })),
          ),
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
      </Helmet>

      <Navigation />

      <main id="main-content">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-ocean-deep via-ocean-deep to-primary py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-primary-foreground">
            <nav aria-label="Kruimelpad" className="text-sm text-primary-foreground/80 mb-3">
              <ol className="flex items-center gap-1">
                <li><Link to="/" className="hover:text-primary-foreground">Home</Link></li>
                <li><ChevronRight className="h-3.5 w-3.5" /></li>
                <li aria-current="page">Activiteiten Vlieland</li>
              </ol>
            </nav>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight max-w-3xl">
              Activiteiten op Vlieland — wat kun je doen?
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mb-6">
              Het complete overzicht van wat er op het eiland te beleven valt. Los te boeken of in één keer geregeld als compleet programma.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/bouwstenen">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto">
                  Bekijk alle bouwstenen
                </Button>
              </Link>
              <Link to="/programma-samenstellen">
                <Button size="lg" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10 w-full sm:w-auto">
                  Stel een programma samen
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Intro */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16">
          <div className="prose prose-neutral max-w-none text-foreground space-y-4">
            <p>
              Vlieland is het kleinste bewoonde Waddeneiland — autoluw, ongerept en middenin UNESCO-Werelderfgoed. Juist die schaal maakt het eiland bijzonder: in een paar dagen ervaar je het wad, de duinen, het strand, de bossen én het dorp. Of je nu komt voor een dag, een bedrijfsuitje of een familieweekend, er is meer te doen dan veel bezoekers verwachten.
            </p>
            <p>
              Hieronder vind je de activiteiten op Vlieland thematisch geordend. Alles is los te boeken, maar voor groepen stellen we vaak een compleet programma samen — inclusief de overtocht, lunch en eventueel overnachting. Eén aanvraag, één factuur, één aanspreekpunt.
            </p>
          </div>
        </section>

        {/* Thema's */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl space-y-12">
            {themas.map(({ icon: Icon, title, intro, items }) => (
              <div key={title}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
                      {title}
                    </h2>
                    <p className="text-muted-foreground mt-1">{intro}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {items.map((item) => (
                    <Link key={item.label + item.to} to={item.to} className="group">
                      <Card className="h-full transition-colors hover:border-primary/50">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-display font-semibold text-foreground">
                              {item.label}
                            </h3>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Plan een dag */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-lg bg-accent/10 p-2.5">
              <Compass className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
                Een dag op Vlieland — hoe deel je 'm in?
              </h2>
            </div>
          </div>
          <div className="prose prose-neutral max-w-none text-foreground space-y-4">
            <p>
              Een dagje Vlieland begint meestal met de boot van 9:00 of 10:30 vanuit Harlingen. Na aankomst pak je een fiets bij de haven en ben je in tien minuten in het dorp. Een wadexcursie of fietstocht met gids vult de ochtend, lunch in het dorp of op het strand, 's middags een zeehondentocht, blokarten of een wandeling door de duinen. Begin van de avond is de boot terug — of je blijft slapen.
            </p>
            <p>
              Voor groepen plannen we dit van A tot Z. Bekijk onze{" "}
              <Link to="/voorbeeldprogrammas" className="text-primary underline underline-offset-2">
                voorbeeldprogramma's
              </Link>{" "}
              voor concrete dagindelingen, of{" "}
              <Link to="/programma-samenstellen" className="text-primary underline underline-offset-2">
                stel zelf een programma samen
              </Link>.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6">
              Veelgestelde vragen over activiteiten op Vlieland
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map(({ q, a }, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left font-semibold">{q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">
            Liever in één keer geregeld?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            We stellen voor groepen een compleet programma samen — boot, activiteiten, lunch en eventueel overnachting. Eén aanvraag, één factuur.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/programma-samenstellen">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto">
                Stel een programma samen
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Of neem contact op
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <GoogleReviewsBlock title="Reviews over Bureau Vlieland" />
      <Footer />
    </div>
  );
};

export default ActiviteitenVlieland;
