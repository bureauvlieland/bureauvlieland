import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Target, MessageCircle, Compass, MapPin, CheckCircle } from "lucide-react";
import heroImage from "@/assets/cycling-group.jpg";
import beachActivityImage from "@/assets/beach-activity.jpg";
import dunesGroupImage from "@/assets/dunes-group.jpg";
import outdoorDrinksImage from "@/assets/outdoor-drinks.jpg";

const TeamuitjeVlieland = () => {
  const uspItems = [
    { icon: Users, title: "Kleine & middelgrote teams", description: "Programma's afgestemd op groepsdynamiek" },
    { icon: Target, title: "Doelgericht", description: "Focus op samenwerking en verbinding" },
    { icon: MessageCircle, title: "Maatwerk", description: "Geen standaard formats, wel inhoud" },
  ];

  return (
    <>
      <Helmet>
        <title>Teamuitje op Vlieland – teambuilding met verdieping</title>
        <meta 
          name="description" 
          content="Een teamuitje op Vlieland gericht op samenwerking en verbinding. Bureau Vlieland organiseert complete teamuitjes met inhoud." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/teamuitje-vlieland" />
        <meta property="og:title" content="Teamuitje op Vlieland – teambuilding met verdieping" />
        <meta property="og:description" content="Een teamuitje op Vlieland gericht op samenwerking en verbinding. Bureau Vlieland organiseert complete teamuitjes met inhoud." />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.png" />
        <meta property="og:url" content="https://bureauvlieland.nl/teamuitje-vlieland" />
        <meta property="og:type" content="website" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Teamuitje op Vlieland"
        serviceDescription="Een teamuitje op Vlieland gericht op samenwerking en verbinding. Bureau Vlieland organiseert complete teamuitjes met inhoud."
        canonicalUrl="https://bureauvlieland.nl/teamuitje-vlieland"
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Bedrijfsuitje Vlieland", url: "https://bureauvlieland.nl/bedrijfsuitje-vlieland" },
          { name: "Teamuitje Vlieland", url: "https://bureauvlieland.nl/teamuitje-vlieland" }
        ]}
      />

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland" },
          { label: "Teamuitje Vlieland" }
        ]} 
      />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Team tijdens een teamuitje op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Teamuitje op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Samenwerken, elkaar beter leren kennen en loskomen van de dagelijkse dynamiek – 
              in een natuurlijke setting voor teambuilding met verdieping.
            </p>
          </div>
        </section>

        {/* Introductie */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg md:text-xl text-foreground leading-relaxed">
                Door de kleinschaligheid van Vlieland ontstaat rust en focus. Dat maakt 
                het eiland ideaal voor teamuitjes waarbij vertrouwen, communicatie en 
                samenwerking centraal staan.
              </p>
            </div>
          </div>
        </section>

        {/* USP Cards */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12 text-center">
                Waarom Vlieland voor teambuilding?
              </h2>

              <div className="grid md:grid-cols-3 gap-8">
                {uspItems.map((item, index) => (
                  <div key={index} className="bg-background rounded-2xl p-8 shadow-lg border border-border/50 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                      <item.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground mb-3">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Image Grid - Wat we bieden */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">
                Van activiteit naar totaalprogramma
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Een teamuitje bestaat zelden uit één onderdeel. Wij combineren activiteiten 
                met momenten van reflectie, ontspanning en samenzijn.
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="relative overflow-hidden rounded-2xl aspect-[4/3]">
                  <img 
                    src={beachActivityImage} 
                    alt="Team activiteit op het strand"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-xl font-display font-bold text-primary-foreground mb-2">
                        Actieve teambuilding
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Beachsporten, eilandspellen of een uitdagende tocht door de duinen.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/3]">
                  <img 
                    src={dunesGroupImage} 
                    alt="Groep in de duinen van Vlieland"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-xl font-display font-bold text-primary-foreground mb-2">
                        Reflectie & verbinding
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Ruimte voor gesprekken en teamdynamiek in een rustgevende omgeving.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/3]">
                  <img 
                    src={outdoorDrinksImage} 
                    alt="Borrel buiten op Vlieland"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-xl font-display font-bold text-primary-foreground mb-2">
                        Catering & ontspanning
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Borrel, lunch of diner – van informeel tot verzorgd.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-2xl p-8 flex flex-col justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <MapPin className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Meerdaags programma
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Meer tijd nodig voor verdieping? Combineer het teamuitje met een overnachting op Vlieland.
                  </p>
                  <Link 
                    to="/meerdaags-bedrijfsuitje-vlieland" 
                    className="text-primary font-medium inline-flex items-center gap-2 hover:underline"
                  >
                    Bekijk meerdaagse opties
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lokale expertise */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                    Lokale specialist, korte lijnen
                  </h2>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    Als lokale organisatie weten wij wat werkt op Vlieland. Geen standaard 
                    formats, maar maatwerk afgestemd op jullie doelen en groepsdynamiek.
                  </p>
                  
                  <div className="space-y-4">
                    {[
                      "Programma afgestemd op jullie team",
                      "Eén aanspreekpunt voor alles",
                      "Logistiek volledig geregeld",
                      "Lokale partners en kennis"
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                    <img 
                      src={heroImage} 
                      alt="Team fietst over Vlieland"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                Klaar om te beginnen?
              </h2>
              <p className="text-lg opacity-90 mb-10 leading-relaxed">
                Stel zelf uw programma samen of vraag een maatwerk offerte aan voor persoonlijk advies.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="secondary" className="gap-2">
                  <Link to="/programma-samenstellen">
                    Stel uw programma samen
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                  <Link to="/contact">
                    Maatwerk aanvragen
                  </Link>
                </Button>
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
                <Link 
                  to="/logies-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Logies op Vlieland</span>
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