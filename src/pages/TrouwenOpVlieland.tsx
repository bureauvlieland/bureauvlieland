import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Package, Truck, Check } from "lucide-react";
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
        <title>Trouwen op Vlieland – Materialen & Logistiek | Bureau Vlieland</title>
        <meta 
          name="description" 
          content="Bureau Vlieland helpt weddingplanners en bruidsparen op Vlieland met verhuur van materialen en logistiek: tenten, meubilair, transport en op- en afbouw." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/trouwen-op-vlieland" />
        <meta property="og:title" content="Trouwen op Vlieland – Materialen & Logistiek | Bureau Vlieland" />
        <meta property="og:description" content="Wij helpen weddingplanners en bruidsparen op Vlieland met materialen, transport en op- en afbouw." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bureauvlieland.nl/trouwen-op-vlieland" />
        <meta name="keywords" content="trouwen Vlieland, bruiloft Vlieland, tent huren bruiloft, verhuur Waddeneiland, weddingplanner Vlieland" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Trouwen op Vlieland – Materialen & Logistiek"
        serviceDescription="Bureau Vlieland helpt weddingplanners en bruidsparen op Vlieland met verhuur van materialen en logistieke ondersteuning."
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
              Trouwen op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Wij helpen weddingplanners en bruidsparen met materialen en logistiek voor jullie mooiste dag op het eiland.
            </p>
          </div>
        </section>

        {/* Introductie */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg md:text-xl text-foreground leading-relaxed">
                Een bruiloft op Vlieland is bijzonder — en logistiek net even anders dan op de wal. Als lokale specialist zorgen wij ervoor dat alle materialen op de juiste plek staan, op het juiste moment. Of je nu zelf jullie dag organiseert of samenwerkt met een weddingplanner: wij regelen graag de praktische kant, zodat jullie je kunnen richten op het feest.
              </p>
            </div>
          </div>
        </section>

        {/* Waar wij mee helpen */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">
                Waar wij jullie mee helpen
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Van tent tot transport — wij zorgen voor de praktische basis van jullie bruiloft op Vlieland.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { title: "Materialen & meubilair", text: "Tenten, stoelen, tafels, aankleding, verlichting en geluid — een ruim verhuurassortiment speciaal voor het eiland." },
                  { title: "Transport op Vlieland", text: "Wij brengen alles ter plekke naar de locatie, of dat nu in het dorp, de duinen of op het strand is." },
                  { title: "Op- en afbouw", text: "Een ervaren team bouwt op vooraf afgesproken tijden alles netjes op en weer af." },
                  { title: "Heldere offerte", text: "Een duidelijke offerte en opdrachtbevestiging, zodat jullie precies weten waar je aan toe bent." },
                ].map((item) => (
                  <div key={item.title} className="bg-background rounded-2xl p-6 shadow-sm border border-border/50 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground mb-1">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Liever alles uit handen */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Liever alles uit handen geven?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Willen jullie de volledige organisatie, planning en regie van jullie bruiloft uit handen geven? Dan verwijzen we jullie met een gerust hart door naar onze partners op het eiland. Zij zijn gespecialiseerd in het organiseren van complete bruiloften op Vlieland — van eerste idee tot laatste dans.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <a
                  href="https://www.paal5.nl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-5 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="text-left">
                    <div className="font-display font-bold text-foreground">Paal5</div>
                    <div className="text-sm text-muted-foreground">Bruiloften op Vlieland</div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
                <a
                  href="https://www.islandevents.nl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-5 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="text-left">
                    <div className="font-display font-bold text-foreground">Island Events</div>
                    <div className="text-sm text-muted-foreground">Volledige bruiloftsorganisatie</div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              </div>
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
