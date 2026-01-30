import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, PartyPopper, Cake, Gift, Users, Star, Utensils } from "lucide-react";
import heroImage from "@/assets/outdoor-dining.jpg";
import sunsetDinnerImage from "@/assets/sunset-dinner.jpg";
import outdoorDrinksImage from "@/assets/outdoor-drinks.jpg";

const JubileumVlieland = () => {
  return (
    <>
      <Helmet>
        <title>Jubileum vieren op Vlieland – Verjaardag, pensioen of huwelijksjubileum | Bureau Vlieland</title>
        <meta 
          name="description" 
          content="Vier uw jubileum, verjaardag of pensioen op Vlieland. Van intiem diner tot groot feest – wij verzorgen locatie, catering en activiteiten." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/jubileum-vlieland" />
        <meta property="og:title" content="Jubileum vieren op Vlieland – Bureau Vlieland" />
        <meta property="og:description" content="Vier uw jubileum, verjaardag of pensioen op Vlieland. Wij verzorgen locatie, catering en activiteiten." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bureauvlieland.nl/jubileum-vlieland" />
        <meta name="keywords" content="jubileum Vlieland, verjaardag vieren Waddeneiland, pensioenfeest eiland, huwelijksjubileum, feest op Vlieland" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Jubileum vieren op Vlieland"
        serviceDescription="Vier uw jubileum, verjaardag, pensioen of huwelijksjubileum op Vlieland. Wij verzorgen locatie, catering en activiteiten voor een onvergetelijk feest."
        canonicalUrl="https://bureauvlieland.nl/jubileum-vlieland"
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Voor wie", url: "https://bureauvlieland.nl/voor-wie" },
          { name: "Jubileum Vlieland", url: "https://bureauvlieland.nl/jubileum-vlieland" }
        ]}
      />

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Voor wie", href: "/voor-wie" },
          { label: "Jubileum Vlieland" }
        ]} 
      />

      <main id="main-content">
        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Feestelijk diner op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Jubileum vieren op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Maak van je verjaardag, pensioen of huwelijksjubileum een onvergetelijke viering.
            </p>
          </div>
        </section>

        {/* Introductie */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg md:text-xl text-foreground leading-relaxed">
                Een jubileum verdient een bijzondere viering. Vlieland biedt de perfecte setting: 
                rust, ruimte en een unieke sfeer. Of je nu een intiem diner voor 20 personen organiseert 
                of een groot feest voor 100 gasten – wij helpen je met de perfecte invulling.
              </p>
            </div>
          </div>
        </section>

        {/* Gelegenheden */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12 text-center">
                Welke gelegenheid vier je?
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-background rounded-2xl p-6 shadow-lg border border-border/50 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Cake className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-foreground mb-2">
                    Verjaardag
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    50 jaar, Abraham of Sara – maak er een weekend van!
                  </p>
                </div>

                <div className="bg-background rounded-2xl p-6 shadow-lg border border-border/50 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <PartyPopper className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-foreground mb-2">
                    Pensioen
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Afscheid nemen in stijl met collega's en dierbaren.
                  </p>
                </div>

                <div className="bg-background rounded-2xl p-6 shadow-lg border border-border/50 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Star className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-foreground mb-2">
                    Huwelijksjubileum
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    25 of 50 jaar getrouwd – vier het met een eilandfeest.
                  </p>
                </div>

                <div className="bg-background rounded-2xl p-6 shadow-lg border border-border/50 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-foreground mb-2">
                    Bijzondere mijlpaal
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Promotie, afstuderen of een andere reden om te vieren.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Wat we bieden */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                    Wij verzorgen de details
                  </h2>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    Een jubileum organiseren op een eiland vraagt om goede planning. Wij kennen Vlieland 
                    als geen ander en zorgen ervoor dat alles op rolletjes loopt.
                  </p>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Utensils className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground mb-1">Catering & Diner</h3>
                        <p className="text-muted-foreground">
                          Van walking dinner tot meergangen menu, BBQ op het strand of borrel met hapjes.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground mb-1">Activiteiten</h3>
                        <p className="text-muted-foreground">
                          Organiseer een eilandtour, zeehondentocht of creatieve workshop voor uw gasten.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Star className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground mb-1">Locatie & Materialen</h3>
                        <p className="text-muted-foreground">
                          Tenten, meubilair, decoratie en aankleding – alles voor de perfecte sfeer.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-[3/4] overflow-hidden rounded-2xl">
                    <img 
                      src={sunsetDinnerImage} 
                      alt="Diner bij zonsondergang"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="aspect-[3/4] overflow-hidden rounded-2xl mt-8">
                    <img 
                      src={outdoorDrinksImage} 
                      alt="Borrel buiten"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
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
                Begin met plannen
              </h2>
              <p className="text-lg opacity-90 mb-10 leading-relaxed">
                Stel zelf uw programma samen of vraag een maatwerk offerte aan voor persoonlijk advies 
                over uw jubileumviering.
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
                  to="/familieweekend-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Familieweekend Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/groepsweekend-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Groepsweekend Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/catering" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Catering bekijken</span>
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

export default JubileumVlieland;
