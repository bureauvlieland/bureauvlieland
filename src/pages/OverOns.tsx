import { Helmet } from "react-helmet";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { AboutErwin } from "@/components/AboutErwin";
import { Verbinder } from "@/components/Verbinder";
import { PageHero, RouteChooser } from "@/components/system";
import { sectionCounter } from "@/components/landing/sectionCounter";
import heroImage from "@/assets/lighthouse-vlieland.jpg";

const URL = "https://bureauvlieland.nl/over-ons";

const FAQ = [
  {
    question: "Wie zit er achter Bureau Vlieland?",
    answer:
      "Bureau Vlieland is opgericht door Erwin Soolsma en is gevestigd op Vlieland. Wij zijn een lokaal boekingskantoor en programmabureau met korte lijnen naar alle aanbieders op het eiland.",
  },
  {
    question: "Wat kost het om via Bureau Vlieland te boeken?",
    answer: "U betaalt geen aparte bemiddelingskosten. Onze vergoeding zit verwerkt in de tarieven van de aanbieders.",
  },
  {
    question: "Werkt Bureau Vlieland samen met lokale ondernemers?",
    answer:
      "Ja. Wij werken uitsluitend met ondernemers op en rond Vlieland: schippers, gidsen, horeca, cateraars, fietsverhuur en accommodaties. Bekijk [onze eilandpartners](/partners).",
  },
  {
    question: "Krijg ik één factuur voor alles?",
    answer:
      "Ja. Bureau Vlieland factureert het volledige programma centraal, zodat u niet met tien losse aanbieders hoeft af te rekenen.",
  },
];

const OverOns = () => {
  const next = sectionCounter();
  const about = next();
  const verbinder = next();
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Over ons – Bureau Vlieland | Erwin Soolsma en team</title>
        <meta
          name="description"
          content="Leer Erwin Soolsma en Bureau Vlieland kennen. Lokale expertise en passie voor het organiseren van onvergetelijke programma's op Vlieland."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Over ons – Bureau Vlieland" />
        <meta property="og:description" content="Leer Erwin Soolsma en Bureau Vlieland kennen. Lokale expertise op Vlieland." />
        <meta property="og:url" content={URL} />
      </Helmet>
      <Navigation />
      <main id="main-content">
        <PageHero
          image={heroImage}
          alt="De vuurtoren van Vlieland"
          eyebrow="Over ons"
          title="Over ons"
          intro="Lokale expertise en verbinding op Vlieland. Bureau Vlieland is opgericht door Erwin Soolsma, geboren op het eiland, met korte lijnen naar iedereen die hier werkt."
          cta={{ label: "Neem contact op", to: "/contact" }}
          secondary={{ label: "Onze werkwijze", to: "/onze-werkwijze" }}
        />
        <AboutErwin number={about.number} tone={about.tone} />
        <Verbinder number={verbinder.number} tone={verbinder.tone} />
        <RouteChooser
          title="Laten we kennismaken"
          intro="Neem contact op voor een vrijblijvend gesprek over uw programma op Vlieland, of begin meteen met een aanvraag."
        />
        <FaqSection schemaId="over-ons" pageUrl={URL} items={FAQ} />
        <RelatedLinks />
      </main>
      <Footer />
    </div>
  );
};

export default OverOns;
