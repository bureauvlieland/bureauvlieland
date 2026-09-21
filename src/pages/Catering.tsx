import { Helmet } from "react-helmet";
import { ChefHat, Clock, FileText, MapPin, MessageSquareHeart, Sparkles, Users } from "lucide-react";
import { RESPONSE_TIME } from "@/content/promises";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { BodySection, Paragraphs } from "@/components/landing/sections";
import { sectionCounter } from "@/components/landing/sectionCounter";
import { Container, FactList, MediaCard, PageHero, RouteChooser, Section, SectionHeader, type RouteChooserRoute, type SectionTone } from "@/components/system";
import { usePublishedBuildingBlocks } from "@/hooks/useBuildingBlocks";
import { getBlockImage } from "@/lib/buildingBlockUtils";
import { renderRichText } from "@/lib/richText";
import { formatBlockPrice, formatPriceNote } from "@/types/buildingBlock";
import type { LandingSection } from "@/content/landings/types";

import sunsetDinnerImage from "@/assets/sunset-dinner.jpg";
import strandBbqImage from "@/assets/strand-bbq.jpg";
import outdoorDiningImage from "@/assets/outdoor-dining.jpg";
import outdoorDrinksImage from "@/assets/outdoor-drinks.jpg";
import lunchBuffetImage from "@/assets/lunch-buffet.jpg";
import lexence1 from "@/assets/lexence/lexence-chef-plating.jpg";
import lexence2 from "@/assets/lexence/lexence-chefs-plating.jpg";
import lexence3 from "@/assets/lexence/lexence-amuses-row.jpg";
import lexence4 from "@/assets/lexence/lexence-tablesetting.jpg";
import lexence5 from "@/assets/lexence/lexence-dessert.jpg";
import lexence6 from "@/assets/lexence/lexence-marquee-setup.jpg";
import lexenceVenueCrowd from "@/assets/lexence/lexence-venue-crowd.jpg";

const URL = "https://bureauvlieland.nl/catering";
const EYEBROW = "Catering op Vlieland";

const moments = [
  { key: "lunch", label: "Lunch op locatie", desc: "Belegde broodjes, soep en salades, eenvoudig of uitgebreid.", image: lunchBuffetImage },
  { key: "borrel", label: "Borrel en receptie", desc: "Hapjes en drankpakket, binnen of buiten.", image: outdoorDrinksImage },
  { key: "bbq", label: "BBQ op locatie", desc: "Compleet verzorgde barbecue op uw verblijf of een buitenlocatie.", image: strandBbqImage },
  { key: "diner", label: "High-end diner", desc: "Driegangendiner, walking dinner of geplate gangen door eigen chefs.", image: sunsetDinnerImage },
];

/** Bouwsteen van Pizza en Borrel bij Café Boven; getoond zolang hij gepubliceerd is. */
const PIZZA_BORREL_BLOCK_ID = "italian-shared-dining-kopie";

const faq = [
  {
    question: "Hoe snel ontvang ik een offerte voor catering op Vlieland?",
    answer: `Na uw aanvraag ontvangt u ${RESPONSE_TIME.within} een definitieve offerte. Een indicatieve totaalprijs inclusief btw ziet u direct in het aanvraagformulier.`,
  },
  {
    question: "Wat is de minimale groepsgrootte voor catering?",
    answer: "Onze catering is bedoeld voor groepen vanaf 8 personen; voor een diner vanaf 20. Voor maatwerk of grote partijen belt u 0562 700 208 of stuurt u een aanvraag.",
  },
  {
    question: "Verzorgen jullie ook catering op het strand?",
    answer: "Ja, in overleg. Een borrel of BBQ op locatie verzorgen wij op uw accommodatie, een buitenlocatie of het strand. Voor een avond in het dorp is Pizza en Borrel bij Café Boven een populaire keuze.",
  },
  {
    question: "Krijg ik één factuur voor de catering?",
    answer: "Ja. Bureau Vlieland factureert alles centraal: u heeft één aanspreekpunt en ontvangt één overzichtelijke factuur, ook bij meerdere leveranciers.",
  },
];

const chefs: LandingSection = {
  kind: "split",
  title: "High-end koken op locatie, op Vlieland uniek",
  paragraphs: [
    "Chefs Robert Buurma en Roland Bakker staan samen met hun team aan het roer. Verse lokale producten, vakmanschap en een keuken die zich aanpast aan uw locatie, niet andersom.",
    "Of het nu een walking dinner voor 80 gasten is of een chef's table voor 12: het niveau blijft hetzelfde. Ook grotere evenementen verzorgen wij volledig; vraag ons naar maatwerk.",
  ],
  checklist: [
    "Eigen chefs en compleet materiaal, ook op een buitenlocatie",
    "Lunch en borrel vanaf 8 personen, diner vanaf 20",
    "Van eenvoudige lunch tot geplate gangen",
  ],
  image: { src: lexence2, alt: "Chef aan het plateren op locatie" },
};

const kitchen: LandingSection = {
  kind: "gallery",
  title: "Uit onze keuken",
  intro: "Amuses, een gedekte tafel aan zee en een dessert uit eigen keuken: zo ziet een avond met onze chefs eruit.",
  images: [
    { src: lexence3, alt: "Een rij amuses, klaar om uit te serveren" },
    { src: lexence4, alt: "Gedekte dinertafel op Vlieland" },
    { src: lexence5, alt: "Dessert uit eigen keuken" },
  ],
};

const locations: LandingSection = {
  kind: "gallery",
  title: "Wij koken waar u wilt",
  intro: "Wij werken samen met de mooiste locaties op het eiland. Of u kiest een eigen plek; wij regelen het.",
  images: [
    { src: lexenceVenueCrowd, alt: "Gasten in het proeflokaal van Brouwerij Fortuna", title: "Brouwerij Fortuna", text: "Proeflokaal en brouwerij, sfeervol en lokaal." },
    { src: outdoorDiningImage, alt: "Buiten dineren aan het wad", title: "Kampeerterrein De Lange Paal", text: "Buitenlocatie aan het wad, ruim en ruig." },
    { src: lexence6, alt: "Opbouw van een feesttent", title: "De Bolder", text: "Zaal met podium en grote bar op kampeerterrein Stortemelk." },
  ],
  aside: {
    icon: Sparkles,
    title: "Andere locatie?",
    text: "Uw eigen verblijf, het strand of een plek die u nog niet kent: vertel ons wat u in gedachten heeft, wij regelen het.",
    link: { label: "Start een maatwerkaanvraag", to: "/catering-aanvragen?type=maatwerk" },
  },
};

const bbq: LandingSection = {
  kind: "split",
  title: "BBQ op locatie",
  paragraphs: [
    "Een compleet verzorgde barbecue op uw verblijf of een buitenlocatie op Vlieland. Wij brengen alles, u steekt het vuur aan en geniet met uw groep.",
  ],
  checklist: [
    "Ruim assortiment vlees, vegetarisch mogelijk",
    "Salades, sauzen, brood en kruidenboter inbegrepen",
    "Servies, afwas en schoonmaak van de barbecue geregeld",
    "Vanaf 8 personen, op de plek die u kiest",
  ],
  image: { src: strandBbqImage, alt: "BBQ op het strand van Vlieland" },
  imagePosition: "left",
  cta: { label: "Vraag BBQ op locatie aan", to: "/catering-aanvragen?type=bbq" },
};

const Catering = () => {
  const { data: blocks = [] } = usePublishedBuildingBlocks();
  const pizzaBorrel = blocks.find((b) => b.id === PIZZA_BORREL_BLOCK_ID);
  const next = sectionCounter();

  const pizza: LandingSection | null = pizzaBorrel
    ? {
        kind: "split",
        title: "Pizza en Borrel bij Café Boven",
        paragraphs: [
          "Rijkgevulde Italiaanse borrelplanken om te delen, daarna pizzapunten vers uit de oven die blijven komen. Ongedwongen, in het hart van Oost-Vlieland, en met stip het meest gekozen avondprogramma in onze voorbeeldprogramma's.",
        ],
        checklist: [
          "Borrelplanken en pizza's om te delen",
          `Vanaf ${pizzaBorrel.min_people ?? 10} personen`,
          [formatBlockPrice(pizzaBorrel), formatPriceNote(pizzaBorrel)].filter(Boolean).join(" "),
          "Optioneel Italiaans dessert",
        ],
        image: { src: getBlockImage(pizzaBorrel), alt: "Pizza en Borrel bij Café Boven op Vlieland" },
        cta: { label: "Aan programma toevoegen", to: `/programma-samenstellen?block=${pizzaBorrel.id}` },
        secondary: { label: "Bekijk Pizza en Borrel", to: `/activiteit/${pizzaBorrel.slug ?? pizzaBorrel.id}` },
      }
    : null;

  const routes: RouteChooserRoute[] = [
    {
      icon: ChefHat,
      title: "Vraag catering aan",
      text: "Lunch, borrel, BBQ op locatie of diner: kies het format en vertel ons datum, groepsgrootte en locatie. Een indicatieve prijs ziet u direct.",
      to: "/catering-aanvragen",
      label: "Start uw cateringaanvraag",
      primary: true,
    },
    {
      icon: Sparkles,
      title: "Maatwerk of groot evenement",
      text: "Iets anders in gedachten, meerdere dagen of meer dan 80 gasten? Beschrijf het, wij denken mee.",
      to: "/catering-aanvragen?type=maatwerk",
      label: "Start een maatwerkaanvraag",
    },
    {
      icon: MessageSquareHeart,
      title: "Liever persoonlijk advies?",
      text: "Bel 0562 700 208 of stuur een bericht. U krijgt binnen één werkdag antwoord van een vast aanspreekpunt.",
      to: "/contact",
      label: "Neem contact op",
    },
  ];

  // Nummers in de volgorde waarin de secties op de pagina staan.
  const chefsAt = next();
  const kitchenAt = next();
  const momentsAt = next();
  const locationsAt = next();
  const bbqAt = next();
  const pizzaAt = pizza ? next() : null;
  const numbered = (section: LandingSection, at: { number: string; tone: SectionTone }) => (
    <BodySection section={section} tone={at.tone} eyebrow={EYEBROW} number={at.number} />
  );

  return (
    <>
      <Helmet>
        <title>Catering Vlieland – koken op locatie door eigen chefs | Bureau Vlieland</title>
        <meta
          name="description"
          content={`Catering op Vlieland door eigen chefs Robert Buurma en Roland Bakker. Lunch, borrel, BBQ op locatie en high-end diner: één aanvraag, één factuur. Voorstel ${RESPONSE_TIME.within}.`}
        />
        <meta
          name="keywords"
          content="catering Vlieland, koken op locatie Vlieland, high-end diner Vlieland, lunch Vlieland, BBQ Vlieland, BBQ op locatie Vlieland, pizza en borrel Vlieland, borrel Vlieland, walking dinner Vlieland, zakelijke catering Vlieland, Zuiver Traiteur"
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Catering op Vlieland – koken op locatie door eigen chefs" />
        <meta property="og:description" content="Lunch, borrel, BBQ op locatie of high-end diner. Door eigen chefs op uw locatie. Eén aanspreekpunt, één factuur." />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.jpg" />
        <meta property="og:url" content={URL} />
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
          url: URL,
          description:
            "Koken op locatie door eigen chefs op Vlieland: lunch, borrel, BBQ op locatie en high-end diner. Eén aanspreekpunt, één factuur.",
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Catering-arrangementen",
            itemListElement: moments.map((m) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: m.label } })),
          },
        })}</script>
      </Helmet>

      <Navigation />
      <LandingBreadcrumb items={[{ label: "Catering" }]} />

      <main id="main-content">
        <PageHero
          image={lexence1}
          alt="Chefs aan het plateren in onze keuken op Vlieland"
          eyebrow={EYEBROW}
          title="Koken op locatie, op Vlieland"
          intro="Met een professionele horecakeuken op het eiland, eigen chefs en compleet materiaal koken wij van lunch tot high-end diner, op vrijwel elke locatie. De enige partij op Vlieland die dit op dit niveau levert."
          cta={{ label: "Start uw aanvraag", to: "#aanvraag" }}
          secondary={{ label: "Bekijk de mogelijkheden", to: "#momenten" }}
        />

        <Section>
          <Container size="wide">
            <div className="grid gap-10 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SectionHeader title="Eén keuken op het eiland" />
                <Paragraphs
                  className="mt-6 max-w-3xl"
                  items={[
                    "Bureau Vlieland en Zuiver Traiteur vormen samen één keuken op het eiland. Onze chefs koken op uw locatie: van een eenvoudige lunch tot geplate gangen die niet onderdoen voor een sterrenrestaurant.",
                    "U kiest het moment en de plek, wij regelen de rest: inkoop, bereiding, bediening en de afwas. Alles op één factuur, ook als er meerdere leveranciers bij betrokken zijn.",
                  ]}
                />
              </div>
              <FactList
                className="self-start"
                items={[
                  { icon: ChefHat, label: "Keuken", value: "Professionele horecakeuken op het eiland, eigen chefs en materiaal" },
                  { icon: Users, label: "Groepsgrootte", value: "Lunch en borrel vanaf 8 personen, diner vanaf 20" },
                  { icon: MapPin, label: "Locatie", value: "Uw verblijf, een buitenlocatie, het strand of een van onze partnerlocaties" },
                  { icon: Clock, label: "Aanvragen", value: "Minimaal 7 dagen vóór de gewenste datum" },
                  { icon: FileText, label: "Voorstel", value: `Vrijblijvend, ${RESPONSE_TIME.within}` },
                ]}
              />
            </div>
          </Container>
        </Section>

        {numbered(chefs, chefsAt)}
        {numbered(kitchen, kitchenAt)}

        <Section id="momenten" tone={momentsAt.tone} className="scroll-mt-24">
          <Container size="wide">
            <SectionHeader
              eyebrow={EYEBROW}
              number={momentsAt.number}
              title="Vier formats, één keuken"
              intro={`Kies een format om direct aan te vragen. Vrijblijvend voorstel op maat ${RESPONSE_TIME.within}.`}
              align="center"
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {moments.map((m) => (
                <MediaCard
                  key={m.key}
                  image={m.image}
                  alt={m.label}
                  title={m.label}
                  text={m.desc}
                  to={`/catering-aanvragen?type=${m.key}`}
                  linkLabel="Start aanvraag"
                />
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              {renderRichText("Iets anders? [Start een maatwerkaanvraag](/catering-aanvragen?type=maatwerk).")}
            </p>
          </Container>
        </Section>

        {numbered(locations, locationsAt)}
        {numbered(bbq, bbqAt)}
        {pizza && pizzaAt && numbered(pizza, pizzaAt)}

        <RouteChooser
          id="aanvraag"
          eyebrow="Direct aanvragen"
          title="Start uw aanvraag"
          intro={`Vrijblijvend, en ${RESPONSE_TIME.within} een voorstel op maat. Aanvragen graag minimaal 7 dagen vóór de gewenste datum.`}
          routes={routes}
        />

        <FaqSection schemaId="catering" pageUrl={URL} items={faq} />
        <RelatedLinks />
      </main>

      <Footer />
    </>
  );
};

export default Catering;
