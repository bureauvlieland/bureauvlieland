import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, Award, Star, Sparkles, Utensils, Ship, MapPin } from "lucide-react";
import heroImage from "@/assets/speedboat-group.jpg";
import sunsetDinnerImage from "@/assets/sunset-dinner.jpg";
import speedboatImage from "@/assets/speedboat.jpg";
import outdoorDrinksImage from "@/assets/outdoor-drinks.jpg";

const IncentiveReisVlieland = () => {
  const uspItems = [
    { icon: Award, title: "Exclusieve beleving", description: "Een beloning die écht indruk maakt" },
    { icon: Star, title: "Volledig verzorgd", description: "Van boot tot borrel, alles geregeld" },
    { icon: Sparkles, title: "Unieke locatie", description: "Het eilandgevoel als toegevoegde waarde" },
  ];

  return (
    <>
      <Helmet>
        <title>Incentive reis op Vlieland – exclusief en verzorgd</title>
        <meta 
          name="description" 
          content="Een incentive reis op Vlieland als beloning of motivatie. Bureau Vlieland organiseert exclusieve programma's op maat." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/incentive-reis-vlieland" />
        <meta property="og:title" content="Incentive reis op Vlieland – exclusief en verzorgd" />
        <meta property="og:description" content="Een incentive reis op Vlieland als beloning of motivatie. Bureau Vlieland organiseert exclusieve programma's op maat." />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.png" />
        <meta property="og:url" content="https://bureauvlieland.nl/incentive-reis-vlieland" />
        <meta property="og:type" content="website" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Incentive reis op Vlieland"
        serviceDescription="Een incentive reis op Vlieland als beloning of motivatie. Bureau Vlieland organiseert exclusieve programma's op maat."
        canonicalUrl="https://bureauvlieland.nl/incentive-reis-vlieland"
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Bedrijfsuitje Vlieland", url: "https://bureauvlieland.nl/bedrijfsuitje-vlieland" },
          { name: "Incentive reis Vlieland", url: "https://bureauvlieland.nl/incentive-reis-vlieland" }
        ]}
      />

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland" },
          { label: "Incentive reis Vlieland" }
        ]} 
      />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Exclusieve incentive reis op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Incentive reis op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Een bijzondere manier om waardering te tonen. Exclusief, overzichtelijk en volledig verzorgd.
            </p>
          </div>
        </section>

        {/* Introductie */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg md:text-xl text-foreground leading-relaxed">
                Het eilandgevoel maakt de ervaring uniek. Alles draait om samenzijn, beleving 
                en kwaliteit. Een incentive reis naar Vlieland is meer dan een beloning – 
                het is een herinnering die blijft.
              </p>
            </div>
          </div>
        </section>

        {/* USP Cards */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12 text-center">
                Waarom een incentive op een eiland?
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

        {/* Image Grid */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">
                Exclusief programma op maat
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Of het nu gaat om een beloning voor topperformers of een motiverend event 
                voor het hele team: wij zorgen voor een passend programma.
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] group">
                  <img 
                    src={speedboatImage} 
                    alt="Speedboot tocht op Vlieland"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3">
                        <Ship className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <h3 className="text-lg font-display font-bold text-primary-foreground mb-1">
                        Unieke ervaringen
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Speedboottocht, privé rondvaart of exclusieve excursie.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] group">
                  <img 
                    src={sunsetDinnerImage} 
                    alt="Diner bij zonsondergang"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3">
                        <Utensils className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <h3 className="text-lg font-display font-bold text-primary-foreground mb-1">
                        Culinaire hoogtepunten
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Diner bij zonsondergang of walking dinner op het strand.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] group">
                  <img 
                    src={outdoorDrinksImage} 
                    alt="Borrel op Vlieland"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3">
                        <MapPin className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <h3 className="text-lg font-display font-bold text-primary-foreground mb-1">
                        Bijzondere locaties
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Van strandpaviljoen tot privé setting in de duinen.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Meerdaags */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="order-2 lg:order-1">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                    <img 
                      src={heroImage} 
                      alt="Groep op incentive reis"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>

                <div className="order-1 lg:order-2">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                    Maak er een meerdaags verblijf van
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    Een incentive reis combineren met een overnachting versterkt de impact. 
                    Meer tijd voor beleving, ontspanning en onderlinge verbinding.
                  </p>
                  <Link 
                    to="/meerdaags-bedrijfsuitje-vlieland" 
                    className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                  >
                    Bekijk meerdaagse opties
                    <ArrowRight className="w-4 h-4" />
                  </Link>
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

export default IncentiveReisVlieland;