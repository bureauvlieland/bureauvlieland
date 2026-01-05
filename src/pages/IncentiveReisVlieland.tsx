import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/speedboat-group.jpg";

const IncentiveReisVlieland = () => {
  return (
    <>
      <Helmet>
        <title>Incentive reis op Vlieland – exclusief en verzorgd</title>
        <meta 
          name="description" 
          content="Een incentive reis op Vlieland als beloning of motivatie. Bureau Vlieland organiseert exclusieve programma's op maat." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/incentive-reis-vlieland" />
      </Helmet>

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland" },
          { label: "Incentive reis Vlieland" }
        ]} 
      />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Exclusieve incentive reis op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Incentive reis op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Een incentive reis op Vlieland is een bijzondere manier om waardering te tonen. 
              Exclusief, overzichtelijk en volledig verzorgd.
            </p>
          </div>
        </section>

        {/* Waarom een incentive op een eiland */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Waarom een incentive op een eiland?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Het eilandgevoel maakt de ervaring uniek. Alles draait om samenzijn, beleving 
                en kwaliteit. Een incentive reis combineren met een{" "}
                <Link to="/meerdaags-bedrijfsuitje-vlieland" className="text-primary hover:underline font-medium">
                  meerdaags programma
                </Link>{" "}
                zorgt voor een onvergetelijke ervaring.
              </p>
            </div>
          </div>
        </section>

        {/* Exclusief programma */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Exclusief programma op maat
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Of het nu gaat om een beloning voor topperformers of een motiverend event voor 
                het hele team: wij zorgen voor een passend programma. Lees meer over onze{" "}
                <Link to="/zakelijk-evenement-vlieland" className="text-primary hover:underline font-medium">
                  zakelijke evenementen
                </Link>{" "}
                of hoe wij{" "}
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
              Een incentive reis organiseren?
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
              Neem contact met ons op voor een eerste verkenning. We denken graag mee 
              over een exclusief programma op maat.
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
                  to="/meerdaags-bedrijfsuitje-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Meerdaags bedrijfsuitje Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/zakelijk-evenement-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Zakelijk evenement Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/bedrijfsuitje-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Bedrijfsuitje Vlieland</span>
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

export default IncentiveReisVlieland;
