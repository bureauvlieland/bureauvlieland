import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sandwich, GlassWater, Flame, UtensilsCrossed, Sparkles, MapPin, ChefHat, Check } from "lucide-react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { useKenBurns } from "@/hooks/use-ken-burns";

import sunsetDinnerImage from "@/assets/sunset-dinner.jpg";
import strandBbqImage from "@/assets/strand-bbq.jpg";
import outdoorDiningImage from "@/assets/outdoor-dining.jpg";
import foodPlattersImage from "@/assets/food-platters.jpg";
import outdoorDrinksImage from "@/assets/outdoor-drinks.jpg";
import lunchBuffetImage from "@/assets/lunch-buffet.jpg";
import cateringFoodImage from "@/assets/catering-food.jpg";
import lexenceChefPlatingAsset from "@/assets/lexence/lexence-chef-plating.jpg.asset.json";
import lexenceChefsPlatingAsset from "@/assets/lexence/lexence-chefs-plating.jpg.asset.json";
import lexenceAmusesRowAsset from "@/assets/lexence/lexence-amuses-row.jpg.asset.json";
import lexenceTablesettingAsset from "@/assets/lexence/lexence-tablesetting.jpg.asset.json";
import lexenceAmuseBowlAsset from "@/assets/lexence/lexence-amuse-bowl.jpg.asset.json";
import lexenceMarqueeSetupAsset from "@/assets/lexence/lexence-marquee-setup.jpg.asset.json";
import lexenceVenueCrowdAsset from "@/assets/lexence/lexence-venue-crowd.jpg.asset.json";

const lexence1 = lexenceChefPlatingAsset.url;
const lexence2 = lexenceChefsPlatingAsset.url;
const lexence3 = lexenceAmusesRowAsset.url;
const lexence4 = lexenceTablesettingAsset.url;
const lexence5 = lexenceAmuseBowlAsset.url;
const lexence6 = lexenceMarqueeSetupAsset.url;
const lexenceVenueCrowd = lexenceVenueCrowdAsset.url;

const moments = [
  {
    key: "lunch",
    label: "Lunch op locatie",
    desc: "Belegde broodjes, soep en salades — eenvoudig of uitgebreid.",
    image: lunchBuffetImage,
  },
  {
    key: "borrel",
    label: "Borrel & receptie",
    desc: "Hapjes en drankpakket, binnen of buiten.",
    image: outdoorDrinksImage,
  },
  {
    key: "bbq",
    label: "Beach Grill experience",
    desc: "Onze chefs grillen op het strand — voeten in het zand.",
    image: strandBbqImage,
  },
  {
    key: "diner",
    label: "High-end diner",
    desc: "3-gangen, walking dinner of geplate gangen door eigen chefs.",
    image: lexence5,
  },
];

const locations = [
  {
    name: "Brouwerij Fortuna",
    desc: "Proeflokaal en brouwerij-setting — sfeervol en lokaal.",
    image: lexenceVenueCrowd,
  },
  {
    name: "Kampeerterrein De Lange Paal",
    desc: "Buitenlocatie aan het wad — ruim, ruig en uniek.",
    image: outdoorDiningImage,
  },
  {
    name: "De Bolder",
    desc: "Zaal met podium en grote bar op kampeerterrein Stortemelk.",
    image: lexence6,
  },
];

const Catering = () => {
  const kenBurns = useKenBurns();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Helmet>
        <title>Catering Vlieland – koken op locatie door eigen chefs | Bureau Vlieland</title>
        <meta
          name="description"
          content="Catering op Vlieland door eigen chefs Robert Buurma en Roland Bakker. Lunch, borrel, Beach Grill en high-end diner — één aanvraag, één factuur. Offerte binnen 2 werkdagen."
        />
        <meta
          name="keywords"
          content="catering Vlieland, koken op locatie Vlieland, high-end diner Vlieland, lunch Vlieland, BBQ Vlieland, Beach Grill Vlieland, strand BBQ Vlieland, borrel Vlieland, walking dinner Vlieland, zakelijke catering Vlieland, Zuiver Traiteur"
        />
        <link rel="canonical" href="https://bureauvlieland.nl/catering" />
        <meta property="og:title" content="Catering op Vlieland – koken op locatie door eigen chefs" />
        <meta property="og:description" content="Lunch, borrel, Beach Grill of high-end diner. Door eigen chefs op uw locatie. Eén aanspreekpunt, één factuur." />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.png" />
        <meta property="og:url" content="https://bureauvlieland.nl/catering" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="nl_NL" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Catering op Vlieland",
          serviceType: "Catering",
          provider: {
            "@type": "Organization",
            name: "Bureau Vlieland",
            url: "https://bureauvlieland.nl",
            telephone: "+31562700208",
            email: "info@bureauvlieland.nl",
          },
          areaServed: { "@type": "Place", name: "Vlieland" },
          url: "https://bureauvlieland.nl/catering",
          description:
            "Koken op locatie door eigen chefs op Vlieland: lunch, borrel, Beach Grill experience en high-end diner. Eén aanspreekpunt, één factuur.",
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Catering-arrangementen",
            itemListElement: [
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Lunch op locatie" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Borrel & receptie" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Beach Grill experience" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "High-end diner" } },
            ],
          },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Hoe snel ontvang ik een offerte voor catering op Vlieland?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Na uw aanvraag ontvangt u binnen 2 werkdagen een definitieve offerte. Een indicatieve totaalprijs incl. BTW is direct zichtbaar in de wizard.",
              },
            },
            {
              "@type": "Question",
              name: "Wat is de minimale groepsgrootte voor catering?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Onze arrangementen zijn bedoeld voor zakelijke groepen vanaf 8 personen. Voor maatwerk of grote partijen (50+) kijkt u op onze pagina 'Grote partijen' of belt u 0562 700 208.",
              },
            },
            {
              "@type": "Question",
              name: "Verzorgen jullie ook catering op het strand?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Ja. Onze Beach Grill experience is een complete grill op het strand, verzorgd door onze eigen chefs met verse lokale producten.",
              },
            },
            {
              "@type": "Question",
              name: "Krijg ik één factuur voor de catering?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Ja. Bureau Vlieland factureert alles centraal — u heeft één aanspreekpunt en ontvangt één overzichtelijke factuur, ook bij meerdere leveranciers.",
              },
            },
          ],
        })}</script>
      </Helmet>

      <div className="min-h-screen">
        <Navigation />
        <main>
          {/* Hero — editorial split */}
          <section className="relative bg-foreground text-background overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24 pb-12 md:pb-20">
              <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-end">
                {/* Left: copy */}
                <div className="lg:col-span-6 lg:pb-8">
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] mb-8 opacity-80">
                    <ChefHat className="h-3.5 w-3.5" /> Catering · Vlieland
                  </span>
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-[1.02] tracking-tight">
                    Koken op locatie.
                    <span className="block italic font-normal opacity-80">Op Vlieland.</span>
                  </h1>
                  <p className="text-lg md:text-xl max-w-xl mb-10 opacity-85 leading-relaxed">
                    Met een <strong className="font-semibold opacity-100">professionele horecakeuken</strong> op het eiland, eigen chefs
                    en compleet materiaal koken wij van lunch tot high-end diner — op vrijwel elke locatie.
                    De enige partij op Vlieland die dit op dit niveau levert.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mb-10">
                    <Button size="lg" onClick={() => scrollToSection("aanvraag")} className="bg-background text-foreground hover:bg-background/90">
                      Start uw aanvraag
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => scrollToSection("momenten")} className="border-background/40 text-background bg-transparent hover:bg-background/10 hover:text-background">
                      Bekijk de mogelijkheden <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm opacity-70 border-t border-background/15 pt-6">
                    <span>Professionele horecakeuken</span>
                    <span className="h-1 w-1 rounded-full bg-background/40" />
                    <span>Eigen chefs &amp; materiaal</span>
                    <span className="h-1 w-1 rounded-full bg-background/40" />
                    <span>Lunch tot high-end diner</span>
                  </div>
                </div>

                {/* Right: image collage */}
                <div className="lg:col-span-6">
                  <div className="grid grid-cols-5 grid-rows-6 gap-3 md:gap-4 h-[420px] md:h-[560px]">
                    <div className="col-span-3 row-span-4 rounded-lg overflow-hidden shadow-2xl">
                      <img
                        src={lexence1}
                        alt="Chefs aan het plateren in onze keuken op Vlieland"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="col-span-2 row-span-3 rounded-lg overflow-hidden shadow-2xl">
                      <img
                        src={lexence3}
                        alt="Amuses op rij"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="col-span-2 row-span-3 rounded-lg overflow-hidden shadow-2xl">
                      <img
                        src={lexence4}
                        alt="Tablesetting Lexence"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="col-span-3 row-span-2 rounded-lg overflow-hidden shadow-2xl">
                      <img
                        src={lexence6}
                        alt="Diner-marquee op locatie"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Intro statement */}
          <section className="py-20 md:py-28 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
              <p className="text-2xl md:text-3xl font-display leading-snug text-foreground">
                Bureau Vlieland en Zuiver Traiteur vormen één keuken op het eiland.
                Onze chefs koken op uw locatie — van eenvoudige lunch tot geplate gangen die
                niet onderdoen voor een sterrenrestaurant.
              </p>
            </div>
          </section>

          {/* Chefs & keuken */}
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden shadow-lg">
                      <img src={lexence1} alt="Plating door chefs op Vlieland" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden shadow-lg">
                      <img src={lexence2} alt="Gerecht uit de keuken" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  </div>
                  <div className="space-y-4 pt-12">
                    <div className="aspect-square rounded-lg overflow-hidden shadow-lg">
                      <img src={lexence3} alt="Mise-en-place op locatie" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="aspect-[3/4] rounded-lg overflow-hidden shadow-lg">
                      <img src={lexence4} alt="Diner-setting Lexence" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm uppercase tracking-[0.15em] text-primary mb-4">
                    <ChefHat className="h-4 w-4" /> Chefs & keuken
                  </div>
                  <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-foreground leading-tight">
                    High-end koken op locatie. Op Vlieland uniek.
                  </h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    Chefs <strong className="text-foreground">Robert Buurma</strong> en <strong className="text-foreground">Roland Bakker</strong> staan
                    samen met hun team aan het roer. Verse lokale producten, vakmanschap en een keuken die
                    zich aanpast aan uw locatie — niet andersom.
                  </p>
                  <p className="text-lg text-muted-foreground mb-8">
                    Voor groepen vanaf 8 personen voor lunch en borrel, vanaf 20 voor diner.
                    Voor evenementen van 50+ personen kijkt u op onze pagina Grote partijen.
                  </p>
                  <blockquote className="border-l-4 border-primary pl-5 py-1 italic text-foreground/80 mb-8">
                    "Of het nu een walking dinner is voor 80 of een chef's table voor 12 — het niveau blijft hetzelfde."
                  </blockquote>
                  <Link
                    to="/grote-partijen-vlieland"
                    className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
                  >
                    Bekijk hoe we dit voor Lexence deden <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Voor welk moment */}
          <section id="momenten" className="py-16 md:py-24 bg-background scroll-mt-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
                <div>
                  <div className="text-sm uppercase tracking-[0.15em] text-primary mb-3">Voor welk moment</div>
                  <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
                    Vier formats. Eén keuken.
                  </h2>
                </div>
                <p className="text-muted-foreground max-w-md">
                  Kies een format om direct aan te vragen. Indicatieve prijs incl. BTW direct zichtbaar.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {moments.map((m) => (
                  <Link
                    key={m.key}
                    to={`/catering-aanvragen?type=${m.key}`}
                    className="group relative aspect-[3/4] rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all"
                  >
                    <img
                      src={m.image}
                      alt={m.label}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-background">
                      <div className="font-display text-2xl font-semibold mb-1">{m.label}</div>
                      <p className="text-sm opacity-90 mb-3">{m.desc}</p>
                      <span className="inline-flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all">
                        Start aanvraag <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-8 text-center">
                <Link
                  to="/catering-aanvragen?type=maatwerk"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  Iets anders? Start een maatwerk-aanvraag
                </Link>
              </div>
            </div>
          </section>

          {/* Locaties */}
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
              <div className="max-w-2xl mb-12">
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.15em] text-primary mb-3">
                  <MapPin className="h-4 w-4" /> Locaties op Vlieland
                </div>
                <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
                  Wij koken waar u wilt.
                </h2>
                <p className="text-muted-foreground mt-4 text-lg">
                  We werken samen met de mooiste locaties op het eiland. Of u kiest een eigen plek — wij regelen het.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                {locations.map((loc) => (
                  <div key={loc.name} className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-border">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img src={loc.image} alt={loc.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-5">
                      <div className="font-display text-lg font-semibold mb-1 text-foreground">{loc.name}</div>
                      <p className="text-sm text-muted-foreground">{loc.desc}</p>
                    </div>
                  </div>
                ))}
                <Link
                  to="/catering-aanvragen?type=maatwerk"
                  className="group bg-foreground text-background rounded-xl p-5 flex flex-col justify-between min-h-[240px] hover:bg-foreground/90 transition-colors"
                >
                  <Sparkles className="h-6 w-6 opacity-80" />
                  <div>
                    <div className="font-display text-lg font-semibold mb-1">Andere locatie?</div>
                    <p className="text-sm opacity-80 mb-3">Wij regelen het. Vertel ons wat u in gedachten heeft.</p>
                    <span className="inline-flex items-center gap-1 text-sm group-hover:gap-2 transition-all">
                      Start maatwerk <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* Beach Grill highlight */}
          <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="relative h-[420px] rounded-lg overflow-hidden shadow-lg order-2 md:order-1">
                  <img src={strandBbqImage} alt="Beach Grill experience op Vlieland" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="order-1 md:order-2">
                  <div className="text-sm uppercase tracking-[0.15em] text-primary mb-3 flex items-center gap-2">
                    <Flame className="h-4 w-4" /> Signature
                  </div>
                  <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-foreground leading-tight">
                    Beach Grill experience
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Onze chefs grillen op het strand — verse lokale producten, vuur, het geluid van de zee. Geen
                    standaard BBQ, maar koken op locatie in zijn meest pure vorm.
                  </p>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Chefs grillen ter plaatse",
                      "Verse, lokale producten",
                      "Inclusief strandlocatie en setup",
                      "Volledig verzorgd — u hoeft alleen te genieten",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{t}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild size="lg">
                    <Link to="/catering-aanvragen?type=bbq">Vraag Beach Grill aan</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Aanvraagblok (secundair) */}
          <section id="aanvraag" className="py-16 md:py-20 bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <div className="text-sm uppercase tracking-[0.15em] text-primary mb-3">Direct aanvragen</div>
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-3 text-foreground">
                  Start uw aanvraag
                </h2>
                <p className="text-muted-foreground">
                  Kies een type om de 5-stappen wizard te starten. Indicatieve totaalprijs incl. BTW direct zichtbaar;
                  definitieve offerte binnen 2 werkdagen. <span className="font-medium text-foreground">Aanvragen graag minimaal 7 dagen vóór de gewenste datum.</span>
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: "lunch", label: "Lunch", icon: Sandwich, desc: "Broodjes, soep, salade — vanaf 8 personen" },
                  { key: "borrel", label: "Borrel & receptie", icon: GlassWater, desc: "Hapjes + drankpakket" },
                  { key: "bbq", label: "Beach Grill", icon: Flame, desc: "Op het strand of op locatie" },
                  { key: "diner", label: "Diner", icon: UtensilsCrossed, desc: "3-gangen, buffet of walking dinner" },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <Link
                      key={t.key}
                      to={`/catering-aanvragen?type=${t.key}`}
                      className="group rounded-xl border-2 border-border p-6 bg-card hover:border-primary hover:shadow-lg transition-all"
                    >
                      <Icon className="h-8 w-8 mb-4 text-primary" />
                      <div className="font-display text-xl font-semibold mb-1">{t.label}</div>
                      <p className="text-sm text-muted-foreground mb-4">{t.desc}</p>
                      <span className="inline-flex items-center text-sm font-medium text-primary group-hover:gap-2 gap-1 transition-all">
                        Start aanvraag <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-6 text-center">
                <Link
                  to="/catering-aanvragen?type=maatwerk"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  Iets anders? Start een maatwerk-aanvraag
                </Link>
              </div>
            </div>
          </section>

          {/* Banner naar Grote partijen */}
          <section className="relative py-20 md:py-28 overflow-hidden bg-foreground">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url(${lexence2})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40" />
            <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-background">
              <div className="max-w-2xl">
                <div className="text-sm uppercase tracking-[0.2em] opacity-80 mb-4">Vanaf 50 personen</div>
                <h2 className="text-3xl md:text-5xl font-display font-bold mb-6 leading-tight">
                  Een evenement voor 50+ personen?
                </h2>
                <p className="text-lg opacity-90 mb-8">
                  Bekijk hoe we high-end diner op locatie verzorgen voor grote groepen — inclusief de case van Lexence.
                </p>
                <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90">
                  <Link to="/grote-partijen-vlieland">
                    Naar grote partijen <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 md:py-24 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                Liever persoonlijk advies?
              </h2>
              <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
                Wij denken graag mee over uw evenement. Bel ons of stuur een bericht — u krijgt binnen
                één werkdag antwoord van een vast aanspreekpunt.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="heroPrimary" className="text-lg px-8">
                  <Link to="/contact">Neem contact op</Link>
                </Button>
                <Button asChild size="lg" variant="heroOutline" className="text-lg px-8">
                  <Link to="/programma-samenstellen">Stel uw programma samen</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Catering;
