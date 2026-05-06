import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import eventImage from "@/assets/districon-vlieland-22.jpg";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { RouteCards } from "@/components/werkwijze/RouteCards";
import { ProcessSteps } from "@/components/werkwijze/ProcessSteps";
import { WerkwijzeFaq } from "@/components/werkwijze/WerkwijzeFaq";

const OnzeWerkwijze = () => {
  const kenBurns = useKenBurns();

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Onze werkwijze – Bureau Vlieland | Hoe wij groepen op Vlieland organiseren</title>
        <meta
          name="description"
          content="Zo werkt Bureau Vlieland: zelf uw programma samenstellen of op maat. Eén vast aanspreekpunt, alle eilandpartners geboekt, één overzichtelijke factuur."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/onze-werkwijze" />
        <meta property="og:title" content="Onze werkwijze – Bureau Vlieland" />
        <meta
          property="og:description"
          content="Twee routes, één belofte: één partij, één factuur. Ontdek hoe Bureau Vlieland uw programma op Vlieland organiseert."
        />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.png" />
        <meta property="og:url" content="https://bureauvlieland.nl/onze-werkwijze" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Navigation />
      <main id="main-content">
        {/* Hero */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${eventImage})`, ...kenBurns }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
          </div>

          <div className="absolute top-0 left-0 w-full h-32 opacity-10 pointer-events-none">
            <svg viewBox="0 0 1200 120" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,50 Q300,20 600,50 T1200,50 L1200,0 L0,0 Z" fill="currentColor" className="text-background" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-32 opacity-10 pointer-events-none">
            <svg viewBox="0 0 1200 120" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,70 Q300,100 600,70 T1200,70 L1200,120 L0,120 Z" fill="currentColor" className="text-background" />
            </svg>
          </div>

          <div className="relative z-10 text-center text-primary-foreground px-4">
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-6">Onze werkwijze</h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto">
              Eén partij, één factuur — zo organiseren wij uw programma op Vlieland
            </p>
          </div>
        </section>

        {/* Twee routes */}
        <RouteCards />

        {/* Procesvisualisatie */}
        <ProcessSteps />

        {/* FAQ */}
        <WerkwijzeFaq />

        {/* CTA */}
        <section className="py-16 bg-gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Klaar om te starten?
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto text-primary-foreground/90">
              Stel direct uw programma samen uit onze bouwstenen. Liever persoonlijk advies? Vraag een maatwerkofferte aan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/programma-samenstellen">
                <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  Stel uw programma samen
                </Button>
              </Link>
              <Link to="/programma-op-maat">
                <Button size="lg" variant="heroOutline">
                  Liever maatwerk?
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default OnzeWerkwijze;
