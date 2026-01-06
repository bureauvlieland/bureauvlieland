import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { WeddingContactForm } from "@/components/WeddingContactForm";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Package, Sparkles, Heart, Users } from "lucide-react";
import heroImage from "@/assets/wedding-outdoor-dinner.jpg";
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
        <title>Trouwen op Vlieland | Verhuur & Weddingplanning op het Waddeneiland</title>
        <meta 
          name="description" 
          content="Trouwen op Vlieland? Bureau Vlieland verzorgt verhuur van tenten, stoelen en decoratie. Volledige weddingplanning via Karla en Renee." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/trouwen-op-vlieland" />
        <meta property="og:title" content="Trouwen op Vlieland | Bureau Vlieland" />
        <meta property="og:description" content="Jullie droombruiloft op het mooiste Waddeneiland. Verhuur, faciliteiten en professionele weddingplanning." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bureauvlieland.nl/trouwen-op-vlieland" />
        <meta name="keywords" content="trouwen Vlieland, bruiloft Waddeneiland, weddingplanner Vlieland, trouwlocatie strand, huwelijk eiland" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Trouwen op Vlieland"
        serviceDescription="Trouwen op Vlieland? Bureau Vlieland verzorgt verhuur en faciliteiten. Voor volledige weddingplanning werken wij samen met Karla en Renee."
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
              alt="Gezellig bruiloftsdiner buiten op Vlieland met sfeerlichtjes en gasten aan lange tafels"
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
              Dromen van een bruiloft op het mooiste Waddeneiland? 
              Ontdek hoe wij jullie grote dag kunnen ondersteunen.
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

        {/* BUREAU VLIELAND SECTIE */}
        <section className="py-16 md:py-24 bg-muted/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
                  Bureau Vlieland
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Verhuur & faciliteiten
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Alles wat je nodig hebt voor jullie bruiloft op Vlieland huur je bij ons. 
                  Wij verzorgen de materialen en logistiek op het eiland.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mb-10">
                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Package className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Materialen & meubilair
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Tenten, stoelen, tafels, decoratie, verlichting, geluidsinstallatie en meer. 
                    Alles wordt op locatie geleverd en opgebouwd.
                  </p>
                </div>

                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Locatiekennis
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Wij kennen Vlieland als geen ander en kunnen adviseren over de mooiste 
                    plekken voor jullie ceremonie, diner of feest.
                  </p>
                </div>
              </div>

              <div className="text-center">
                <Button asChild size="lg" className="gap-2">
                  <a 
                    href="https://verhuur.bureauvlieland.nl/?categorie=bruiloft" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Bekijk ons verhuurassortiment
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* KARLA & RENEE SECTIE - WEDDINGPLANNING */}
        <section className="py-16 md:py-24 bg-background relative overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-1 bg-accent/80 text-accent-foreground rounded-full text-sm font-medium mb-4">
                  Weddingplanning
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Alles uit handen? Kies voor Karla & Renee
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Willen jullie een weddingplanner die het hele traject begeleidt? Karla en Renee 
                  zijn gespecialiseerd in bruiloften op Vlieland en nemen alles uit handen.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-12">
                {/* Karla */}
                <div className="bg-muted/30 rounded-2xl p-8 text-center border border-border/30">
                  <div className="w-40 h-40 mx-auto mb-6 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-xl">
                    <img 
                      src={karlaImage} 
                      alt="Karla - Weddingplanner Vlieland" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-foreground mb-2">Karla</h3>
                  <p className="text-muted-foreground">Weddingplanner</p>
                </div>

                {/* Renee */}
                <div className="bg-muted/30 rounded-2xl p-8 text-center border border-border/30">
                  <div className="w-40 h-40 mx-auto mb-6 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-xl">
                    <img 
                      src={reneeImage} 
                      alt="Renee - Weddingplanner Vlieland" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-foreground mb-2">Renee</h3>
                  <p className="text-muted-foreground">Weddingplanner</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="bg-background rounded-xl p-6 border border-border/50 text-center">
                  <Heart className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-display font-bold text-foreground mb-2">Inspiratie & advies</h4>
                  <p className="text-sm text-muted-foreground">
                    Van concept tot uitvoering, volledig afgestemd op jullie wensen
                  </p>
                </div>
                <div className="bg-background rounded-xl p-6 border border-border/50 text-center">
                  <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-display font-bold text-foreground mb-2">Coördinatie partners</h4>
                  <p className="text-sm text-muted-foreground">
                    Catering, muziek, fotografie – zij regelen het complete traject
                  </p>
                </div>
                <div className="bg-background rounded-xl p-6 border border-border/50 text-center">
                  <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h4 className="font-display font-bold text-foreground mb-2">Dag zelf begeleiding</h4>
                  <p className="text-sm text-muted-foreground">
                    Zodat jullie kunnen genieten zonder zorgen
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contactformulier - voor Karla */}
        <section className="py-16 md:py-24 bg-primary/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Interesse in weddingplanning?
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
