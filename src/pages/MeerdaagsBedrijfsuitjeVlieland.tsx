import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { PositioningBlock } from "@/components/PositioningBlock";
import heroImage from "@/assets/vlieland-group.jpg";

const MeerdaagsBedrijfsuitjeVlieland = () => {
  return (
    <>
      <Helmet>
        <title>Meerdaags bedrijfsuitje op Vlieland – met overnachting</title>
        <meta 
          name="description" 
          content="Een meerdaags bedrijfsuitje op Vlieland met rust en verdieping. Bureau Vlieland regelt het complete programma inclusief overnachting." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/meerdaags-bedrijfsuitje-vlieland" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Meerdaags bedrijfsuitje op Vlieland"
        serviceDescription="Een meerdaags bedrijfsuitje op Vlieland met rust en verdieping. Bureau Vlieland regelt het complete programma inclusief overnachting."
        canonicalUrl="https://bureauvlieland.nl/meerdaags-bedrijfsuitje-vlieland"
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Bedrijfsuitje Vlieland", url: "https://bureauvlieland.nl/bedrijfsuitje-vlieland" },
          { name: "Meerdaags bedrijfsuitje Vlieland", url: "https://bureauvlieland.nl/meerdaags-bedrijfsuitje-vlieland" }
        ]}
      />

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland" },
          { label: "Meerdaags bedrijfsuitje Vlieland" }
        ]} 
      />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Groep tijdens meerdaags bedrijfsuitje op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Meerdaags bedrijfsuitje op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Wie echt de diepte in wil, kiest voor een meerdaags bedrijfsuitje op Vlieland. 
              Door te blijven slapen ontstaat ruimte voor verdieping, ontspanning en onderlinge verbinding.
            </p>
          </div>
        </section>

        {/* Waarom meerdere dagen */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Waarom meerdere dagen?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Meerdaagse programma's zorgen voor minder haast en meer aandacht. Teams hebben 
                de tijd om te landen, samen te werken en tot inzichten te komen. Ideaal voor een{" "}
                <Link to="/heisessie-vlieland" className="text-primary hover:underline font-medium">
                  heisessie gericht op strategie
                </Link>{" "}
                of een{" "}
                <Link to="/incentive-reis-vlieland" className="text-primary hover:underline font-medium">
                  exclusieve incentive reis
                </Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Volledig verzorgd */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Volledig verzorgd
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Wij regelen overnachtingen, programma's, activiteiten en catering. Van aankomst 
                tot vertrek is alles op elkaar afgestemd. Lees meer over hoe wij{" "}
                <Link to="/bedrijfsuitje-vlieland" className="text-primary hover:underline font-medium">
                  bedrijfsuitjes organiseren
                </Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Geschikt voor */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Geschikt voor
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Directies, managementteams, afdelingen en organisaties die willen investeren 
                in samenwerking en focus.
              </p>
            </div>
          </div>
        </section>

        <PositioningBlock />

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Een meerdaags bedrijfsuitje plannen?
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
              Neem contact met ons op voor een eerste verkenning. We denken graag mee 
              over een passend programma met overnachting.
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

export default MeerdaagsBedrijfsuitjeVlieland;
