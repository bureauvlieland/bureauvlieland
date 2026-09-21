import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { ForWho } from "@/components/ForWho";
import { PageHero, RouteChooser } from "@/components/system";
import heroImage from "@/assets/speedboat-group.jpg";

const URL = "https://bureauvlieland.nl/voor-wie";

const FAQ = [
  {
    question: "Voor welke groepen organiseert Bureau Vlieland programma's?",
    answer:
      "Wij werken voor bedrijven (teamuitjes, heisessies, incentives en jubilea), verenigingen en studiegroepen, en voor families en vriendengroepen. Groepen vanaf circa 8 personen tot ruim 200 deelnemers zijn mogelijk.",
  },
  {
    question: "Wat is de minimale groepsgrootte?",
    answer:
      "Voor een compleet verzorgd programma werken wij meestal vanaf 8 tot 10 personen. Kleinere gezelschappen kunnen [losse activiteiten boeken](/activiteiten-boeken) via de website.",
  },
  {
    question: "Kan Bureau Vlieland ook een programma voor één dag maken?",
    answer:
      "Ja. Veel groepen komen met de ochtendboot en gaan aan het begin van de avond terug. Wij plannen de dag rond de afvaarttijden van Rederij Doeksen.",
  },
  {
    question: "Regelt Bureau Vlieland ook de overnachting?",
    answer:
      "Ja. Wij vragen [logies](/logies-vlieland) aan bij hotels, groepsaccommodaties en vakantiehuizen op Vlieland en zetten dat op dezelfde offerte en factuur.",
  },
];

const VoorWie = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const element = document.querySelector(location.hash);
    if (!element) return;
    const timer = window.setTimeout(() => element.scrollIntoView({ behavior: "smooth" }), 100);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Voor wie – Bureau Vlieland | Bedrijven, teams en organisaties</title>
        <meta
          name="description"
          content="Bureau Vlieland organiseert voor bedrijven, teams en organisaties die kwaliteit en één aanspreekpunt centraal stellen. Van MT tot projectgroep."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Voor wie – Bureau Vlieland" />
        <meta property="og:description" content="Bureau Vlieland organiseert voor bedrijven, teams en organisaties die kwaliteit en één aanspreekpunt centraal stellen." />
        <meta property="og:url" content={URL} />
      </Helmet>
      <Navigation />
      <main id="main-content">
        <PageHero
          image={heroImage}
          alt="Groep op een speedboot bij Vlieland"
          eyebrow="Voor wie"
          title="Voor wie"
          intro="Groepen die kwaliteit en één aanspreekpunt centraal stellen: bedrijven en teams, directies, organisaties en de bureaus en trainers die met hen werken."
          cta={{ label: "Stel uw programma samen", to: "/programma-samenstellen" }}
          secondary={{ label: "Liever maatwerk?", to: "/programma-op-maat" }}
        />
        <ForWho />
        <RouteChooser title="Herkent u uw groep hierin?" intro="Vrijblijvend, en binnen 5 werkdagen een voorstel. Kies de route die bij u past." />
        <FaqSection schemaId="voor-wie" pageUrl={URL} items={FAQ} />
        <RelatedLinks />
      </main>
      <Footer />
    </div>
  );
};

export default VoorWie;
