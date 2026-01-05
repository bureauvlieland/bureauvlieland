import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/dunes-group.jpg";

const HeisessieVlieland = () => {
  return (
    <>
      <Helmet>
        <title>Heisessie op Vlieland – rust en focus voor strategie</title>
        <meta 
          name="description" 
          content="Een heisessie op Vlieland biedt rust en focus. Bureau Vlieland organiseert strategiesessies en MT-dagen op maat." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/heisessie-vlieland" />
      </Helmet>

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland" },
          { label: "Heisessie Vlieland" }
        ]} 
      />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Heisessie in de duinen van Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Heisessie op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Een heisessie op Vlieland is ideaal voor organisaties die in alle rust willen werken 
              aan strategie, visie of samenwerking. Weg van de dagelijkse omgeving ontstaat ruimte voor focus.
            </p>
          </div>
        </section>

        {/* Waarom Vlieland */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Waarom Vlieland voor een heisessie?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Het eiland dwingt tot vertraging. Geen afleiding, geen verplichtingen tussendoor. 
                Alleen tijd en aandacht voor de inhoud. Een heisessie combineren met een{" "}
                <Link to="/meerdaags-bedrijfsuitje-vlieland" className="text-primary hover:underline font-medium">
                  meerdaags verblijf
                </Link>{" "}
                zorgt voor nog meer verdieping.
              </p>
            </div>
          </div>
        </section>

        {/* Organisatie en faciliteiten */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Organisatie en faciliteiten
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Wij verzorgen locaties, logistiek, overnachtingen en aanvullende programma's. 
                De inhoud bepalen jullie, de randvoorwaarden regelen wij. Lees meer over hoe wij{" "}
                <Link to="/bedrijfsuitje-vlieland" className="text-primary hover:underline font-medium">
                  bedrijfsuitjes organiseren
                </Link>.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Een heisessie op Vlieland organiseren?
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
              Neem contact met ons op voor een eerste verkenning. We denken graag mee 
              over de juiste locatie en faciliteiten voor jullie heisessie.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg" 
                variant="heroPrimary"
                className="text-lg px-8"
              >
                <Link to="/contact">Plan een vrijblijvend gesprek</Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                variant="heroOutline"
                className="text-lg px-8"
              >
                <Link to="/offerte">Vraag een voorstel aan</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Interne Links */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-display font-bold text-foreground mb-8 text-center">
                Bekijk ook
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Link 
                  to="/bedrijfsuitje-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Bedrijfsuitje Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/meerdaags-bedrijfsuitje-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Meerdaags bedrijfsuitje Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default HeisessieVlieland;
