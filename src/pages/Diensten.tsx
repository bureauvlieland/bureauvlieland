import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Services } from "@/components/Services";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import eventImage from "@/assets/districon-vlieland-22.jpg";
import { useKenBurns } from "@/hooks/use-ken-burns";

const Diensten = () => {
  const kenBurns = useKenBurns();
  
  return (
    <div className="min-h-screen">
       <Helmet>
        <title>Onze diensten – Bureau Vlieland | Programma, regie & catering</title>
        <meta name="description" content="Bureau Vlieland verzorgt complete programma's voor teams en organisaties op Vlieland: van inhoudelijke sessies tot catering en lokale begeleiding." />
        <link rel="canonical" href="https://bureauvlieland.nl/diensten" />
        <meta property="og:title" content="Onze diensten – Bureau Vlieland | Programma, regie & catering" />
        <meta property="og:description" content="Bureau Vlieland verzorgt complete programma's voor teams en organisaties op Vlieland: van inhoudelijke sessies tot catering en lokale begeleiding." />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.png" />
        <meta property="og:url" content="https://bureauvlieland.nl/diensten" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${eventImage})`,
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
              Onze diensten
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto">
              Eén partij voor programma, regie en uitvoering op Vlieland
            </p>
          </div>
        </section>

        {/* Services Content */}
        <Services />

        {/* CTA naar Configurator */}
        <section className="py-16 bg-gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Weet u al wat u wilt?
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

export default Diensten;
