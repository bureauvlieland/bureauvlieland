import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { FaqSection } from "@/components/FaqSection";
import { ForWho } from "@/components/ForWho";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import teamBeachImage from "@/assets/speedboat-group.jpg";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { useEffect } from "react";

const VoorWie = () => {
  const kenBurns = useKenBurns();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.hash]);
  
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Voor Wie – Bureau Vlieland | Bedrijven, Teams & Organisaties</title>
        <meta 
          name="description" 
          content="Bureau Vlieland organiseert voor bedrijven, teams en organisaties die kwaliteit en één aanspreekpunt centraal stellen. Van MT tot projectgroep." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/voor-wie" />
        <meta property="og:title" content="Voor Wie – Bureau Vlieland" />
        <meta property="og:description" content="Bureau Vlieland organiseert voor bedrijven, teams en organisaties die kwaliteit en één aanspreekpunt centraal stellen." />
        <meta property="og:url" content="https://bureauvlieland.nl/voor-wie" />
      </Helmet>
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${teamBeachImage})`,
              ...kenBurns
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
          </div>

          {/* Decorative wave patterns */}
          <div className="absolute top-0 left-0 w-full h-32 opacity-10 pointer-events-none">
            <svg viewBox="0 0 1200 120" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,50 Q300,20 600,50 T1200,50 L1200,0 L0,0 Z" fill="currentColor" className="text-background"/>
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-32 opacity-10 pointer-events-none">
            <svg viewBox="0 0 1200 120" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,70 Q300,100 600,70 T1200,70 L1200,120 L0,120 Z" fill="currentColor" className="text-background"/>
            </svg>
          </div>

          <div className="relative z-10 text-center text-primary-foreground px-4">
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-6">
              Voor wie
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto">
              Groepen die kwaliteit en één aanspreekpunt centraal stellen
            </p>
          </div>
        </section>

        {/* ForWho Content */}
        <ForWho />

        {/* CTA naar Contact */}
        <section className="py-16 bg-gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Herkent u uw groep hierin?
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto text-primary-foreground/90">
              Neem contact op om te ontdekken wat Bureau Vlieland voor uw groep kan betekenen
            </p>
            <Link to="/contact">
              <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                Neem contact op
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <FaqSection
        schemaId="voor-wie"
        items={[
            {
              question: "Voor welke groepen organiseert Bureau Vlieland programma's?",
              answer: "Wij werken voor bedrijven (teamuitjes, heisessies, incentives en jubilea), verenigingen en studiegroepen, en voor families en vriendengroepen. Groepen vanaf circa 8 personen tot ruim 200 deelnemers zijn mogelijk.",
            },
            {
              question: "Wat is de minimale groepsgrootte?",
              answer: "Voor een compleet verzorgd programma werken we meestal vanaf 8 tot 10 personen. Kleinere gezelschappen kunnen losse activiteiten boeken via de website.",
            },
            {
              question: "Kunnen jullie ook een programma voor één dag maken?",
              answer: "Ja. Veel groepen komen met de ochtendboot en gaan aan het begin van de avond terug. Wij plannen de dag rond de afvaarttijden van Rederij Doeksen.",
            },
            {
              question: "Regelen jullie ook de overnachting?",
              answer: "Ja. Wij vragen logies aan bij hotels, groepsaccommodaties en vakantiehuizen op Vlieland en zetten dat op dezelfde offerte en factuur.",
            },
        ]}
      />
      <Footer />
    </div>
  );
};

export default VoorWie;
