import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Mail } from "lucide-react";
import heroImage from "@/assets/wedding-ceremony-vuurtoren.jpg";
import karlaImage from "@/assets/karla-profile.jpg";
import reneeImage from "@/assets/renee-profile.jpg";

const TrouwenOpVlieland = () => {
  return (
    <>
      <Helmet>
        <title>Trouwen op Vlieland – inspiratie, advies en verhuur</title>
        <meta 
          name="description" 
          content="Trouwen op Vlieland? Bureau Vlieland biedt inspiratie, advies en verhuur van faciliteiten voor jullie bruiloft op het eiland." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/trouwen-op-vlieland" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Trouwen op Vlieland"
        serviceDescription="Trouwen op Vlieland? Bureau Vlieland biedt inspiratie, advies en verhuur van faciliteiten voor jullie bruiloft op het eiland."
        canonicalUrl="https://bureauvlieland.nl/trouwen-op-vlieland"
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Trouwen op Vlieland", url: "https://bureauvlieland.nl/trouwen-op-vlieland" }
        ]}
      />

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Trouwen op Vlieland" }
        ]} 
      />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Trouwceremonie bij de vuurtoren op Vlieland met uitzicht op de Noordzee"
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Trouwen op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Dromen van een bruiloft op Vlieland? Wij delen graag onze kennis van het eiland 
              en helpen met de verhuur van faciliteiten voor jullie grote dag.
            </p>
          </div>
        </section>

        {/* Weddingplanners sectie - Karla & Renee */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6 text-center">
                Weddingplanning op Vlieland
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed text-center mb-12">
                Zoek je een weddingplanner voor jullie bruiloft op Vlieland? Vanaf 2026 werken 
                wij samen met Karla en Renee, die gespecialiseerd zijn in bruiloften op het eiland.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Karla */}
                <div className="bg-muted/30 rounded-2xl p-6 text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden">
                    <img 
                      src={karlaImage} 
                      alt="Karla - Weddingplanner Vlieland" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">Karla</h3>
                  <p className="text-muted-foreground mb-4">Weddingplanner</p>
                  <a 
                    href="mailto:karla@bureauvlieland.nl" 
                    className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                  >
                    <Mail className="w-4 h-4" />
                    karla@bureauvlieland.nl
                  </a>
                </div>

                {/* Renee */}
                <div className="bg-muted/30 rounded-2xl p-6 text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden">
                    <img 
                      src={reneeImage} 
                      alt="Renee - Weddingplanner Vlieland" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">Renee</h3>
                  <p className="text-muted-foreground mb-4">Weddingplanner</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Inspiratie & Advies */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Inspiratie & advies
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Wij kennen Vlieland als geen ander. Van de mooiste trouwlocaties tot de beste 
                momenten voor foto's: wij delen graag onze kennis van het eiland en de mogelijkheden 
                voor jullie bruiloft. Neem gerust contact op voor advies en inspiratie.
              </p>
            </div>
          </div>
        </section>

        {/* Faciliteiten & Verhuur */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Faciliteiten & verhuur
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Alles wat je nodig hebt voor een bruiloft op Vlieland huur je eenvoudig via 
                Bureau Vlieland. Van tenten en meubilair tot decoratie en audiovisuele 
                apparatuur – wij zorgen dat alles op locatie staat.
              </p>
              <Button asChild size="lg" className="gap-2">
                <a 
                  href="https://verhuur.bureauvlieland.nl/?categorie=bruiloft" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Bekijk verhuurmogelijkheden
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Partners */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Partners
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Voor catering, muziek en fotografie werken wij samen met zorgvuldig geselecteerde 
                partners op Vlieland. Wij brengen jullie graag in contact met de juiste partijen. 
                Jullie zijn zelf opdrachtgever en maken direct afspraken met deze partners.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Jullie bruiloft op Vlieland?
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
              Voor weddingplanning neem je contact op met Karla. Voor verhuur en advies 
              over het eiland helpt Bureau Vlieland je graag verder.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg" 
                variant="heroPrimary"
                className="text-lg px-8 gap-2"
              >
                <a href="mailto:karla@bureauvlieland.nl">
                  <Mail className="w-5 h-5" />
                  Mail Karla
                </a>
              </Button>
              <Button 
                asChild 
                size="lg" 
                variant="heroOutline"
                className="text-lg px-8 gap-2"
              >
                <a 
                  href="https://verhuur.bureauvlieland.nl/?categorie=bruiloft" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Bekijk verhuur
                  <ExternalLink className="w-5 h-5" />
                </a>
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

export default TrouwenOpVlieland;
