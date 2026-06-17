/**
 * WadlopenVlieland — SEO landing page voor keyword "wadlopen vlieland".
 *
 * Kernframing: je kunt NIET vanaf het vasteland naar Vlieland wadlopen
 * (geulen zijn ook bij eb te diep). Product = wadEXCURSIE óp/rond Vlieland
 * met een lokale gids. Nergens "loop naar Vlieland" suggereren.
 *
 * Eigen beeldmateriaal aanwezig — pagina is indexeerbaar.
 */
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import {
  Clock,
  Users,
  MapPin,
  ShieldCheck,
  Footprints,
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
import heroAsset from "@/assets/wadexcursie-vlieland-wad-schelpen.webp.asset.json";
import gidsAsset from "@/assets/wadexcursie-vlieland-gids-wadworm.webp.asset.json";
import gezinAsset from "@/assets/wadexcursie-vlieland-gezin-wadlopen.webp.asset.json";

const heroImage = heroAsset.url;
const gidsImage = gidsAsset.url;
const gezinImage = gezinAsset.url;

const FAQ: { q: string; a: string }[] = [
  {
    q: "Kun je vanaf het vasteland naar Vlieland wadlopen?",
    a: "Nee. De geulen tussen de Friese kust (Harlingen) en Vlieland zijn ook bij eb te diep en de stroming te sterk. Wadlopen náár Vlieland is dus niet mogelijk. Wat wél kan: een wadexcursie óp Vlieland, waarbij je met een gids het wad rond het eiland verkent.",
  },
  {
    q: "Is de wadexcursie geschikt voor kinderen?",
    a: "Ja, de excursie is geschikt voor alle leeftijden en daarmee ook leuk voor gezinnen met kinderen.",
  },
  {
    q: "Hoe lang duurt een wadexcursie?",
    a: "Een wadexcursie op Vlieland duurt ongeveer 1,5 uur.",
  },
  {
    q: "Wat moet ik meenemen?",
    a: "Laarzen zijn inbegrepen, dus die hoef je niet mee te nemen. Neem wel kleding die nat en vies mag worden, reservekleding en -sokken en drinken mee. Bij mooi weer een pet en zonnebrand.",
  },
  {
    q: "Is wadlopen gevaarlijk?",
    a: "Niet onder begeleiding. Ga nooit alleen het wad op; met een ervaren, erkende gids is het veilig en juist heel leerzaam.",
  },
  {
    q: "Wat kost een wadexcursie op Vlieland?",
    a: "Voor volwassenen ligt de prijs rond €17,50 tot €20. De exacte actuele prijs en beschikbaarheid zie je bij het boeken of aanvragen.",
  },
];

const WadlopenVlieland = () => {
  const url = "https://bureauvlieland.nl/wadlopen-vlieland";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Wadexcursie Vlieland boeken | Wadlopen met gids, alle leeftijden</title>
        <meta
          name="description"
          content="Het wad op met een ervaren gids op Vlieland — leerzaam, voor alle leeftijden. Ontdek zeehonden, vogels en wad-leven. Boek je wadexcursie direct online."
        />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="Wadexcursie Vlieland boeken | Wadlopen met gids" />
        <meta
          property="og:description"
          content="Het wad op met een ervaren gids op Vlieland — leerzaam, voor alle leeftijden. Boek je wadexcursie direct online."
        />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={`https://bureauvlieland.nl${heroImage}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TouristTrip",
          name: "Wadexcursie Vlieland",
          description:
            "Begeleide wadexcursie op Vlieland: met een ervaren gids het wad op. Leerzaam en geschikt voor alle leeftijden.",
          touristType: "Gezinnen, natuurliefhebbers, alle leeftijden",
          url,
          image: `https://bureauvlieland.nl${heroImage}`,
          provider: { "@type": "Organization", name: "Bureau Vlieland" },
          offers: {
            "@type": "AggregateOffer",
            lowPrice: "17.50",
            highPrice: "20.00",
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
            { "@type": "ListItem", position: 2, name: "Wadexcursie Vlieland", item: url },
          ],
        })}</script>
      </Helmet>

      <Navigation />

      <main id="main-content">
        {/* Hero */}
        <section className="relative h-[55vh] min-h-[400px] flex items-end overflow-hidden">
          <img
            src={heroImage}
            alt="Wadexcursie op Vlieland: groep loopt met gids over het wad"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ocean-deep via-ocean-deep/60 to-transparent" />
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl pb-12 text-primary-foreground">
            <nav aria-label="Kruimelpad" className="text-sm text-primary-foreground/80 mb-3">
              <ol className="flex items-center gap-1">
                <li><Link to="/" className="hover:text-primary-foreground">Home</Link></li>
                <li><ChevronRight className="h-3.5 w-3.5" /></li>
                <li aria-current="page">Wadexcursie Vlieland</li>
              </ol>
            </nav>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight max-w-3xl">
              Wadexcursie Vlieland: het wad op met een gids
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mb-6">
              Met een lokale gids het wad op — leerzaam, avontuurlijk en geschikt voor het hele gezin.
            </p>
            <Link to="/snel-aanvragen?categorie=excursies&onderwerp=wadexcursie">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                Boek je wadexcursie
              </Button>
            </Link>
          </div>
        </section>

        {/* Intro + trust */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16">
          <div className="prose prose-neutral max-w-none text-foreground space-y-4">
            <p>
              Trek je laarzen aan en ontdek het Werelderfgoed Waddenzee van de mooiste kant: te voet. Tijdens een wadexcursie op Vlieland neemt een lokale gids — die het eiland en het wad op zijn duimpje kent — je mee het wad op, vertelt over het leven onder je voeten en wijst je zeehonden, vogels en bijzondere wadbewoners aan. Een avontuur middenin de natuur — geschikt voor alle leeftijden, dus ook leuk met (klein)kinderen.
            </p>
            <p>
              Als Werelderfgoed-ambassadeur weten we precies wat dit gebied zo bijzonder maakt, en dat merk je tijdens elke excursie.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <WaddenAmbassadeurBadge variant="compact" />
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Lokale, ervaren gidsen</li>
              <li className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Geschikt voor alle leeftijden</li>
              <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Direct online te boeken</li>
            </ul>
          </div>
        </section>

        {/* Wat / voor wie / wat zie je / waarom */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl space-y-10">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">Wat is een wadexcursie?</h2>
              <p className="text-foreground">
                Bij laag water valt de zeebodem droog en kun je over het wad lopen. Onder begeleiding van een gids ontdek je dit unieke landschap van zandbanken, slik en geulen. De gids kent het gebied, de getijden en de gevaren, en leert je onderweg van alles over de Waddenzee.
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">Voor wie is het geschikt?</h2>
              <p className="text-foreground">
                De wadexcursie is geschikt voor alle leeftijden. Het is geen zware tocht maar een leerzame wandeling, dus ook ideaal voor gezinnen met kinderen. Goede gezondheid en een beetje doorzettingsvermogen (het kan modderig zijn!) zijn wel handig.
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">Wat ga je zien en leren?</h2>
              <p className="text-foreground">
                Je leert hoe eb en vloed het wad vormen, welke dieren en planten hier leven en hoe je sporen leest in het slik. Met een beetje geluk spot je zeehonden op een zandplaat of zie je wadvogels foerageren.
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">Waarom met ons?</h2>
              <p className="text-foreground">
                We werken samen met lokale gidsen die het eiland en het wad door en door kennen, en we zijn Werelderfgoed-ambassadeur. Je gaat dus op pad met mensen die het gebied écht kennen — veilig, en met verhalen die je nergens anders hoort.
              </p>
            </div>
          </div>
        </section>

        {/* Praktisch */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl py-16">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8 text-center">Praktisch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Clock, title: "Duur", text: "Ongeveer 1,5 uur." },
              { icon: MapPin, title: "Vertrekpunt", text: "Varieert per excursie — je krijgt het startpunt bij je boeking door." },
              { icon: Footprints, title: "Laarzen inbegrepen", text: "Geen waterschoenen nodig — wij zorgen voor laarzen." },
              { icon: ShieldCheck, title: "Veiligheid", text: "Altijd met een ervaren, lokale gids. Ga nooit alleen het wad op." },
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
            <strong>Meenemen:</strong> kleren die nat/vies mogen, reservekleding en -sokken, drinken; bij zon: pet en zonnebrand.
          </p>
        </section>

        {/* CTA / boeken */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">
              Boek je wadexcursie op Vlieland
            </h2>
            <p className="text-muted-foreground mb-2">
              Kies je datum en boek direct online, of voeg de excursie toe aan je programma op Vlieland.
            </p>
            <p className="text-foreground mb-6">
              <strong>Volwassenen vanaf €17,50</strong> <span className="text-muted-foreground">(richtprijs €17,50–€20, laarzen inbegrepen)</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/snel-aanvragen?categorie=excursies&onderwerp=wadexcursie">
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
            Veelgestelde vragen over de wadexcursie op Vlieland
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
      </main>

      <Footer />
    </div>
  );
};

export default WadlopenVlieland;
