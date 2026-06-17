/**
 * WadlopenVlieland — SEO landing page voor keyword "wadlopen vlieland".
 *
 * DRAFT — wacht op input Erwin:
 *  1. USP (waarom via Bureau Vlieland en niet rechtstreeks bij een gids?)
 *  2. Vanaf-prijs of "op aanvraag"?
 *  3. Welke partner-gids(en) noemen?
 *  4. Eigen foto (anders blijft placeholder dunes-group.jpg).
 *
 * Pagina staat live maar krijgt NOINDEX tot Erwin akkoord geeft.
 */
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Clock, Users, MapPin, Compass, ShieldCheck, Calendar, ChevronRight } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import heroImage from "@/assets/dunes-group.jpg"; // placeholder — vervangen door wadloop-foto

const FAQ: { q: string; a: string }[] = [
  {
    q: "Wanneer kun je wadlopen op Vlieland?",
    a: "Wadlopen is afhankelijk van het getij en kan globaal van maart tot en met oktober. Een ervaren wadloopgids plant de tocht rond laagwater zodat u veilig over de wadbodem kunt lopen.",
  },
  {
    q: "Hoe lang duurt een wadlooptocht vanaf Vlieland?",
    a: "Een wadlooptocht vanaf Vlieland duurt doorgaans 3 tot 4 uur, inclusief instructie en pauzes. Wij plannen de starttijd op het getij en stemmen het programma af op uw groep.",
  },
  {
    q: "Welk niveau is wadlopen?",
    a: "Een korte wadlooptocht op Vlieland is geschikt voor iedereen met een basisconditie vanaf circa 12 jaar. U loopt door zacht slik en geulen — uitdagend, maar zeer goed te doen onder begeleiding.",
  },
  {
    q: "Wat moet u meenemen voor wadlopen?",
    a: "Oude sport- of waterschoenen die vast om de voet zitten, een korte broek of legging, zonnebrand, drinken en eventueel een waterdichte tas. Wij sturen u vooraf een complete voorbereidingsmail.",
  },
  {
    q: "Wat kost wadlopen op Vlieland?",
    a: "De prijs is afhankelijk van groepsgrootte en datum. Vraag een vrijblijvende offerte aan en wij koppelen u aan een gecertificeerde gids met de juiste vergunning.",
  },
];

const WadlopenVlieland = () => {
  const url = "https://bureauvlieland.nl/wadlopen-vlieland";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Wadlopen op Vlieland — met gecertificeerde gids | Bureau Vlieland</title>
        <meta
          name="description"
          content="Wadlopen op Vlieland boeken? Bureau Vlieland regelt uw wadlooptocht met een gecertificeerde gids. Geschikt voor groepen, bedrijfsuitjes en families."
        />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="Wadlopen op Vlieland — met gecertificeerde gids" />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={`https://bureauvlieland.nl${heroImage}`} />
        {/* DRAFT — noindex tot Erwin tekst en USP heeft goedgekeurd */}
        <meta name="robots" content="noindex,follow" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TouristAttraction",
          name: "Wadlopen op Vlieland",
          description: "Begeleide wadlooptochten vanaf Vlieland, geboekt via Bureau Vlieland.",
          touristType: ["Groepen", "Bedrijfsuitjes", "Families"],
          isAccessibleForFree: false,
          url,
          image: `https://bureauvlieland.nl${heroImage}`,
          address: { "@type": "PostalAddress", addressLocality: "Vlieland", addressCountry: "NL" },
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
            { "@type": "ListItem", position: 2, name: "Wadlopen op Vlieland", item: url },
          ],
        })}</script>
      </Helmet>

      <Navigation />

      <main id="main-content">
        {/* Hero */}
        <section className="relative h-[55vh] min-h-[400px] flex items-end overflow-hidden">
          <img src={heroImage} alt="Wadlopen op Vlieland" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ocean-deep via-ocean-deep/60 to-transparent" />
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl pb-12 text-primary-foreground">
            <nav aria-label="Kruimelpad" className="text-sm text-primary-foreground/80 mb-3">
              <ol className="flex items-center gap-1">
                <li><Link to="/" className="hover:text-primary-foreground">Home</Link></li>
                <li><ChevronRight className="h-3.5 w-3.5" /></li>
                <li aria-current="page">Wadlopen op Vlieland</li>
              </ol>
            </nav>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight max-w-3xl">
              Wadlopen op Vlieland
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mb-6">
              Loop met een gecertificeerde gids over de bodem van de Waddenzee — Bureau Vlieland regelt de tocht, vergunningen en planning voor uw groep.
            </p>
            <Link to="/snel-aanvragen?categorie=excursies&onderwerp=wadlopen">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                Vraag wadlopen aan
              </Button>
            </Link>
          </div>
        </section>

        {/* Intro */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Een unieke ervaring op het Wad
          </h2>
          <div className="prose prose-neutral max-w-none text-foreground space-y-4">
            <p>
              Wadlopen op Vlieland is een van de meest bijzondere manieren om de Waddenzee — UNESCO Werelderfgoed — te ervaren. Bij laagwater valt een groot deel van de zeebodem droog en kunt u onder begeleiding van een gecertificeerde wadloopgids dwars over het slik wandelen, langs zandplaten waar zeehonden liggen en geulen die u doorwaadt tot aan uw middel.
            </p>
            <p>
              Voor groepen vanaf 8 personen is wadlopen een onvergetelijke teamactiviteit. U loopt samen door een steeds veranderend landschap, helpt elkaar door de geulen en sluit af met een warme douche en een goed verhaal. Wij koppelen uw aanvraag aan een gids met de juiste vergunning, plannen de tocht rond het getij en regelen de logistiek vanaf de haven van Vlieland.
            </p>
            <p>
              Bureau Vlieland is uw centrale aanspreekpunt: één offerte, één factuur, één contactpersoon. Geen gedoe met losse aanbieders — wij combineren de wadlooptocht desgewenst met overtocht, lunch, fietshuur en overnachting in één compleet programma.
            </p>
          </div>
        </section>

        {/* Praktische info kaarten */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8 text-center">
              Praktische info
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Calendar, title: "Seizoen", text: "Maart t/m oktober, afhankelijk van het getij." },
                { icon: Clock, title: "Duur", text: "Ongeveer 3 tot 4 uur, inclusief instructie." },
                { icon: Users, title: "Groepsgrootte", text: "Vanaf 8 personen, op aanvraag ook kleiner of veel groter." },
                { icon: ShieldCheck, title: "Veiligheid", text: "Altijd onder begeleiding van een gecertificeerde wadloopgids." },
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
          </div>
        </section>

        {/* USP */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6">
            Waarom wadlopen boeken via Bureau Vlieland?
          </h2>
          <ul className="space-y-4 text-foreground">
            {[
              { icon: Compass, title: "Lokale specialist", text: "Wij wonen en werken op Vlieland en kennen iedere gids persoonlijk." },
              { icon: ShieldCheck, title: "Eén factuur, één aanspreekpunt", text: "Bureau Vlieland regelt boeking, betaling en eventuele wijzigingen — u hoeft niet langs vijf partijen." },
              { icon: MapPin, title: "Compleet programma", text: "Combineer wadlopen met overtocht, lunch, fietshuur en overnachting in één offerte." },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <Icon className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6">
              Veelgestelde vragen over wadlopen op Vlieland
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
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Plan uw wadlooptocht op Vlieland
          </h2>
          <p className="text-muted-foreground mb-6">
            Vraag vrijblijvend een offerte aan. Wij koppelen u aan de juiste gids en regelen alles eromheen.
          </p>
          <Link to="/snel-aanvragen?categorie=excursies&onderwerp=wadlopen">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              Vraag wadlopen aan
            </Button>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default WadlopenVlieland;
