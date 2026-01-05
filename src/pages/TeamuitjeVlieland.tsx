import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/cycling-group.jpg";

const TeamuitjeVlieland = () => {
  return (
    <>
      <Helmet>
        <title>Teamuitje op Vlieland – teambuilding met verdieping</title>
        <meta 
          name="description" 
          content="Een teamuitje op Vlieland gericht op samenwerking en verbinding. Bureau Vlieland organiseert complete teamuitjes met inhoud." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/teamuitje-vlieland" />
      </Helmet>

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland" },
          { label: "Teamuitje Vlieland" }
        ]} 
      />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Team tijdens een teamuitje op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Teamuitje op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Een teamuitje op Vlieland draait om samenwerken, elkaar beter leren kennen 
              en samen loskomen van de dagelijkse dynamiek. Het eiland vormt een natuurlijke 
              setting voor teambuilding die verder gaat dan een activiteit alleen.
            </p>
          </div>
        </section>

        {/* Teambuilding zonder ruis */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Teambuilding zonder ruis
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Door de kleinschaligheid van Vlieland ontstaat rust en focus. Dat maakt 
                het eiland ideaal voor teamuitjes waarbij vertrouwen, communicatie en 
                samenwerking centraal staan. Bekijk ook onze{" "}
                <Link to="/bedrijfsuitje-vlieland" className="text-primary hover:underline font-medium">
                  bedrijfsuitjes op Vlieland
                </Link>{" "}
                voor meer mogelijkheden.
              </p>
            </div>
          </div>
        </section>

        {/* Voor welk type teams */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Voor welk type teams?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Wij organiseren teamuitjes voor kleine en middelgrote teams, projectgroepen 
                en afdelingen. Programma's worden altijd afgestemd op de groepsdynamiek en 
                het doel van het uitje. Op zoek naar inspiratie? Bekijk onze{" "}
                <Link to="/bedrijfsuitje-ideeen-vlieland" className="text-primary hover:underline font-medium">
                  ideeën voor bedrijfsuitjes
                </Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Van activiteit naar totaalprogramma */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Van activiteit naar totaalprogramma
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Een teamuitje bestaat zelden uit één onderdeel. Wij combineren activiteiten 
                met momenten van reflectie, ontspanning en samenzijn. Inclusief logistiek, 
                locaties en catering. Meer tijd nodig? Overweeg een{" "}
                <Link to="/meerdaags-bedrijfsuitje-vlieland" className="text-primary hover:underline font-medium">
                  meerdaags programma met overnachting
                </Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Lokale regie */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Lokale regie, korte lijnen
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Als lokale organisatie weten wij wat werkt op Vlieland. Geen standaard 
                formats, maar maatwerk.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Een teamuitje op Vlieland organiseren?
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
              Neem contact met ons op voor een eerste verkenning. We denken graag mee 
              over een passend programma voor jullie team.
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
                  to="/bedrijfsuitje-ideeen-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Bedrijfsuitje ideeën Vlieland</span>
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

export default TeamuitjeVlieland;
