import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { WeddingContactForm } from "@/components/WeddingContactForm";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Mail, Heart, Utensils, Camera } from "lucide-react";
import heroImage from "@/assets/wedding-ceremony-vuurtoren.jpg";
import karlaImage from "@/assets/karla-profile.jpg";
import reneeImage from "@/assets/renee-profile.jpg";
import beachCoupleImage from "@/assets/wedding-beach-couple.jpg";
import forestArchImage from "@/assets/wedding-forest-arch.jpg";
import ceremonyOceanImage from "@/assets/wedding-ceremony-ocean.jpg";
import dinnerTableImage from "@/assets/wedding-dinner-table.jpg";
import ceremonySetupImage from "@/assets/wedding-ceremony-setup.jpg";

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

        {/* Inspiratie fotogalerij */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">
                Jullie droombruiloft op Vlieland
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Van intieme ceremonies in het bos tot feestelijke dinners onder de sterren – 
                Vlieland biedt de perfecte setting voor jullie bijzondere dag.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-2 md:col-span-1 aspect-[4/3] overflow-hidden rounded-2xl">
                  <img 
                    src={ceremonyOceanImage} 
                    alt="Ceremonie met uitzicht op zee" 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                  <img 
                    src={forestArchImage} 
                    alt="Bruidsprieel in het bos" 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                  <img 
                    src={dinnerTableImage} 
                    alt="Prachtig gedekte dinertafel" 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="col-span-2 md:col-span-2 aspect-[21/9] overflow-hidden rounded-2xl">
                  <img 
                    src={ceremonySetupImage} 
                    alt="Ceremonie setup in de duinen" 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                  <img 
                    src={beachCoupleImage} 
                    alt="Bruidspaar op het strand" 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Weddingplanners sectie - Karla & Renee */}
        <section className="py-16 md:py-24 bg-primary/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="container mx-auto px-4 relative z-10">
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
                <div className="bg-background rounded-2xl p-8 text-center shadow-lg border border-border/50">
                  <div className="w-36 h-36 mx-auto mb-6 rounded-full overflow-hidden ring-4 ring-primary/20">
                    <img 
                      src={karlaImage} 
                      alt="Karla - Weddingplanner Vlieland" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-foreground mb-2">Karla</h3>
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
                <div className="bg-background rounded-2xl p-8 text-center shadow-lg border border-border/50">
                  <div className="w-36 h-36 mx-auto mb-6 rounded-full overflow-hidden ring-4 ring-primary/20">
                    <img 
                      src={reneeImage} 
                      alt="Renee - Weddingplanner Vlieland" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-foreground mb-2">Renee</h3>
                  <p className="text-muted-foreground mb-4">Weddingplanner</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Wat wij bieden - 3 kolommen */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12 text-center">
                Hoe wij helpen
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                {/* Inspiratie & Advies */}
                <div className="bg-muted/30 rounded-2xl p-8 text-center border border-border/30 hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-4">
                    Inspiratie & advies
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Wij kennen Vlieland als geen ander. Van de mooiste trouwlocaties tot de beste 
                    momenten voor foto's – wij delen graag onze kennis van het eiland.
                  </p>
                </div>

                {/* Faciliteiten & Verhuur */}
                <div className="bg-muted/30 rounded-2xl p-8 text-center border border-border/30 hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Utensils className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-4">
                    Faciliteiten & verhuur
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Alles wat je nodig hebt voor een bruiloft op Vlieland huur je eenvoudig via ons. 
                    Van tenten en meubilair tot decoratie.
                  </p>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <a 
                      href="https://verhuur.bureauvlieland.nl/?categorie=bruiloft" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Bekijk verhuur
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>

                {/* Partners */}
                <div className="bg-muted/30 rounded-2xl p-8 text-center border border-border/30 hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-4">
                    Partners
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Voor catering, muziek en fotografie werken wij met zorgvuldig geselecteerde partners. 
                    Jullie zijn zelf opdrachtgever.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contactformulier */}
        <section className="py-16 md:py-24 bg-muted/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Neem contact op met Karla
                </h2>
                <p className="text-lg text-muted-foreground">
                  Vul onderstaand formulier in en Karla neemt zo snel mogelijk contact met jullie op 
                  om de mogelijkheden te bespreken.
                </p>
              </div>
              
              <div className="bg-background rounded-2xl p-8 md:p-10 shadow-lg border border-border/50">
                <WeddingContactForm />
              </div>
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
