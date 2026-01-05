import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/beach-activity.jpg";

const BedrijfsuitjeIdeeenVlieland = () => {
  return (
    <>
      <Helmet>
        <title>Bedrijfsuitje ideeën op Vlieland – inspiratie en maatwerk</title>
        <meta 
          name="description" 
          content="Op zoek naar ideeën voor een bedrijfsuitje op Vlieland? Laat je inspireren door Bureau Vlieland." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/bedrijfsuitje-ideeen-vlieland" />
      </Helmet>

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland" },
          { label: "Bedrijfsuitje ideeën Vlieland" }
        ]} 
      />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Activiteiten tijdens bedrijfsuitje op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Bedrijfsuitje ideeën op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Zoek je inspiratie voor een bedrijfsuitje op Vlieland? Het eiland biedt talloze 
              mogelijkheden, van actief tot verdiepend. Wij vertalen ideeën naar een samenhangend programma.
            </p>
          </div>
        </section>

        {/* Van idee naar uitvoering */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Van idee naar uitvoering
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Een goed bedrijfsuitje is meer dan een leuk idee. Wij helpen bij het kiezen, 
                combineren en organiseren van onderdelen tot één logisch geheel. Bekijk hoe wij{" "}
                <Link to="/bedrijfsuitje-vlieland" className="text-primary hover:underline font-medium">
                  bedrijfsuitjes organiseren
                </Link>{" "}
                of ontdek de mogelijkheden voor een{" "}
                <Link to="/teamuitje-vlieland" className="text-primary hover:underline font-medium">
                  teamuitje gericht op samenwerking
                </Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Mogelijkheden */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Mogelijkheden op Vlieland
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Of je nu kiest voor een eendaags programma of een{" "}
                <Link to="/meerdaags-bedrijfsuitje-vlieland" className="text-primary hover:underline font-medium">
                  meerdaags bedrijfsuitje met overnachting
                </Link>
                : wij zorgen voor een passend programma. Van actieve outdoor activiteiten 
                tot inhoudelijke sessies – altijd op maat.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Ideeën bespreken?
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
              Neem contact met ons op en we vertellen je graag meer over de mogelijkheden 
              voor een bedrijfsuitje op Vlieland.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg" 
                variant="secondary"
                className="text-lg px-8"
              >
                <Link to="/contact">Plan een vrijblijvend gesprek</Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                variant="outline"
                className="text-lg px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
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
                  to="/teamuitje-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Teamuitje Vlieland</span>
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

export default BedrijfsuitjeIdeeenVlieland;
