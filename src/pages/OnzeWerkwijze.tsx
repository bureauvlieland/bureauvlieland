import { Helmet } from "react-helmet";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { PageHero, RouteChooser } from "@/components/system";
import { RouteCards } from "@/components/werkwijze/RouteCards";
import { ProcessSteps } from "@/components/werkwijze/ProcessSteps";
import { sectionCounter } from "@/components/landing/sectionCounter";
import heroImage from "@/assets/districon-vlieland-22.jpg";

const URL = "https://bureauvlieland.nl/onze-werkwijze";

const FAQ = [
  {
    question: "Wanneer kies ik voor zelf samenstellen en wanneer voor maatwerk?",
    answer:
      "Heeft u een redelijk helder beeld van wat u wilt en is uw groep tot circa 30 personen? Dan komt u met de programma-bouwer snel uit. Bij grotere groepen, complexere wensen of als u liever even wilt sparren, is maatwerk fijner. Wij denken graag met u mee.",
  },
  {
    question: "Wie is mijn aanspreekpunt?",
    answer:
      "Vanaf het moment dat u contact opneemt heeft u één vast aanspreekpunt bij Bureau Vlieland, voor, tijdens en na uw bezoek. Op het eiland zelf wordt u door de betreffende partners ontvangen; wij zijn op de achtergrond bereikbaar als er iets nodig is.",
  },
  {
    question: "Wat regelt Bureau Vlieland wel, en wat niet?",
    answer:
      "Wij ontwikkelen het programma en boeken alle eilandpartners (activiteiten, gidsen, catering, vervoer en eventueel logies) voor u. U krijgt één factuur. Inhoudelijke onderdelen die u zelf wilt verzorgen (een trainer, eigen spreker, eigen materialen) blijven uw verantwoordelijkheid; wij stemmen praktisch met u af.",
  },
  {
    question: "Hoe zit het met aanbetaling en annulering?",
    answer:
      "Voor de meeste programma's vragen wij een aanbetaling bij bevestiging. De annuleringsvoorwaarden vindt u in onze [algemene voorwaarden](/algemene-voorwaarden) en worden vóór akkoord altijd transparant met u gedeeld.",
  },
  {
    question: "Kan ik later nog wijzigingen doorgeven?",
    answer:
      "Ja. Wij snappen dat aantallen en wensen kunnen schuiven. Tot kort voor uw bezoek is er ruimte om bij te sturen, afhankelijk van wat de eilandpartners aankunnen. Hoe eerder u het laat weten, hoe meer er mogelijk is.",
  },
];

const OnzeWerkwijze = () => {
  const next = sectionCounter();
  const routes = next();
  const process = next();
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Onze werkwijze – groepen organiseren op Vlieland</title>
        <meta
          name="description"
          content="Zo werkt Bureau Vlieland: zelf uw programma samenstellen of op maat. Eén vast aanspreekpunt, alle eilandpartners geboekt, één overzichtelijke factuur."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Onze werkwijze – Bureau Vlieland" />
        <meta
          property="og:description"
          content="Twee routes, één belofte: één partij, één factuur. Ontdek hoe Bureau Vlieland uw programma op Vlieland organiseert."
        />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.jpg" />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
      </Helmet>
      <Navigation />
      <main id="main-content">
        <PageHero
          image={heroImage}
          alt="Groep tijdens een programma van Bureau Vlieland op het eiland"
          eyebrow="Werkwijze"
          title="Onze werkwijze"
          intro="Eén partij, één factuur: zo organiseren wij uw programma op Vlieland. Zelf samenstellen of op maat, altijd met één vast aanspreekpunt."
          cta={{ label: "Stel uw programma samen", to: "/programma-samenstellen" }}
          secondary={{ label: "Liever maatwerk?", to: "/programma-op-maat" }}
        />
        <RouteCards number={routes.number} tone={routes.tone} />
        <ProcessSteps number={process.number} tone={process.tone} />
        <RouteChooser />
        <FaqSection schemaId="werkwijze" pageUrl={URL} items={FAQ} />
        <RelatedLinks />
      </main>
      <Footer />
    </div>
  );
};

export default OnzeWerkwijze;
