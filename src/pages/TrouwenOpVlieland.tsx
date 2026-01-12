import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Package, Truck, Check, X } from "lucide-react";
import heroImage from "@/assets/wedding-outdoor-dinner.jpg";
import ceremonyOceanImage from "@/assets/wedding-ceremony-ocean.jpg";
import forestArchImage from "@/assets/wedding-forest-arch.jpg";
import dinnerTableImage from "@/assets/wedding-dinner-table.jpg";
import ceremonySetupImage from "@/assets/wedding-ceremony-setup.jpg";
import beachCoupleImage from "@/assets/wedding-beach-couple.jpg";

const TrouwenOpVlieland = () => {
  return (
    <>
      <Helmet>
        <title>Trouwen op Vlieland – Materialen en Logistiek | Bureau Vlieland</title>
        <meta 
          name="description" 
          content="Bureau Vlieland verzorgt verhuur van materialen en logistiek voor bruiloften op Vlieland. Tenten, meubilair, transport en op- en afbouw. Geen weddingplanning." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/trouwen-op-vlieland" />
        <meta property="og:title" content="Trouwen op Vlieland – Materialen en Logistiek | Bureau Vlieland" />
        <meta property="og:description" content="Verhuur van materialen en logistieke ondersteuning voor bruiloften op Vlieland. Transport, op- en afbouw op het eiland." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bureauvlieland.nl/trouwen-op-vlieland" />
        <meta name="keywords" content="trouwen Vlieland, bruiloft materialen Vlieland, tent huren bruiloft, verhuur Waddeneiland, logistiek bruiloft eiland" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Trouwen op Vlieland – Materialen en Logistiek"
        serviceDescription="Bureau Vlieland verzorgt verhuur van materialen en logistieke ondersteuning voor bruiloften op Vlieland. Wij organiseren of coördineren geen bruiloften."
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
        <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Bruiloftsdiner buiten op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Trouwen op Vlieland – Materialen en Logistiek
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Bureau Vlieland faciliteert bruiloften op Vlieland, maar organiseert of coördineert deze niet.
            </p>
          </div>
        </section>

        {/* Introductie */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <p className="text-lg md:text-xl text-foreground leading-relaxed">
                Wij verzorgen uitsluitend de verhuur van materialen en de bijbehorende logistiek, zoals transport, op- en afbouw. De inhoudelijke organisatie, planning en regie liggen volledig bij het bruidspaar of een externe weddingplanner.
              </p>
            </div>
          </div>
        </section>

        {/* Wat we wel / niet doen */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12 text-center">
                Onze rol bij bruiloften
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Wat we wél doen */}
                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground">
                      Wat we wél doen
                    </h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-foreground">Verhuur van materialen (tenten, meubilair, aankleding, verlichting)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-foreground">Transport van materialen op Vlieland</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-foreground">Op- en afbouw op vooraf afgesproken tijden</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-foreground">Levering op basis van een duidelijke offerte en opdracht</span>
                    </li>
                  </ul>
                </div>

                {/* Wat we níet doen */}
                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <X className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground">
                      Wat we níet doen
                    </h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <span className="text-foreground">Geen projectmanagement of regierol</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <span className="text-foreground">Geen planning of draaiboeken</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <span className="text-foreground">Geen afstemming met locaties, cateraars of andere leveranciers</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <span className="text-foreground">Geen back-up scenario's bij slecht weer</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <span className="text-foreground">Geen aanspreekpunt of begeleiding op de dag zelf</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Verantwoordelijkheid */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Verantwoordelijkheid en organisatie
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                De volledige verantwoordelijkheid voor de organisatie van de bruiloft ligt bij het bruidspaar of een door hen ingeschakelde weddingplanner. Bureau Vlieland levert uitsluitend de overeengekomen materialen en logistieke ondersteuning en is niet betrokken bij de inhoudelijke uitvoering van het evenement.
              </p>
            </div>
          </div>
        </section>

        {/* Verhuurassortiment */}
        <section className="py-16 md:py-24 bg-muted/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                  Ons verhuurassortiment
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Bekijk ons complete assortiment voor bruiloften op Vlieland.
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
                  <p className="text-muted-foreground leading-relaxed">
                    Tenten, stoelen, tafels, decoratie, verlichting, geluidsinstallatie en meer. 
                    Bekijk ons volledige assortiment online.
                  </p>
                </div>

                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Truck className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Transport & logistiek
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Wij verzorgen het transport van materialen op Vlieland en de op- en afbouw 
                    op vooraf afgesproken tijden.
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

        {/* Fotogalerij */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">
                Impressie
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Een greep uit bruiloften waarvoor wij materialen en logistiek hebben verzorgd.
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
                    alt="Gedekte dinertafel" 
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

        {/* Call-to-action */}
        <section className="py-16 md:py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Vragen over verhuur of logistiek?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Neem contact met ons op met een duidelijke omschrijving van je wensen. 
                Wij sturen je graag een offerte voor de gewenste materialen en logistieke ondersteuning.
              </p>
              <Button asChild size="lg" className="gap-2">
                <Link to="/contact">
                  Neem contact op
                  <ArrowRight className="w-5 h-5" />
                </Link>
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
