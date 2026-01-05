import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { PositioningBlock } from "@/components/PositioningBlock";
import heroImage from "@/assets/event-outdoor.jpg";

const ZakelijkEvenementVlieland = () => {
  return (
    <>
      <Helmet>
        <title>Zakelijk evenement op Vlieland – organisatie van A tot Z</title>
        <meta 
          name="description" 
          content="Een zakelijk evenement op Vlieland organiseren? Bureau Vlieland verzorgt planning, locaties en uitvoering." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/zakelijk-evenement-vlieland" />
      </Helmet>

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland" },
          { label: "Zakelijk evenement Vlieland" }
        ]} 
      />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Zakelijk evenement op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Zakelijk evenement op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Voor congressen, bijeenkomsten en zakelijke evenementen biedt Vlieland een unieke setting. 
              Bureau Vlieland neemt de volledige organisatie uit handen.
            </p>
          </div>
        </section>

        {/* Unieke setting */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Een unieke setting voor uw evenement
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Vlieland biedt rust, ruimte en focus – ideaal voor zakelijke bijeenkomsten 
                die impact moeten maken. Combineer uw evenement met een{" "}
                <Link to="/heisessie-vlieland" className="text-primary hover:underline font-medium">
                  heisessie
                </Link>{" "}
                of een{" "}
                <Link to="/incentive-reis-vlieland" className="text-primary hover:underline font-medium">
                  incentive programma
                </Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Volledige organisatie */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Volledige organisatie
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Van locatie tot logistiek, van catering tot programma: wij verzorgen het complete 
                traject. Lees meer over hoe wij{" "}
                <Link to="/bedrijfsuitje-vlieland" className="text-primary hover:underline font-medium">
                  bedrijfsuitjes en evenementen organiseren
                </Link>.
              </p>
            </div>
          </div>
        </section>

        <PositioningBlock />

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Een zakelijk evenement organiseren?
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
              Neem contact met ons op voor een eerste verkenning. We denken graag mee 
              over de mogelijkheden voor jullie evenement.
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
                  to="/heisessie-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Heisessie Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/incentive-reis-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Incentive reis Vlieland</span>
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

export default ZakelijkEvenementVlieland;
