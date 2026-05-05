import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, Home, Baby, Sparkles, MapPin, Utensils } from "lucide-react";
import heroImage from "@/assets/dunes-group.jpg";
import beachActivityImage from "@/assets/beach-activity.jpg";
import kiteImage from "@/assets/kite-flying.jpg";
import sealTourImage from "@/assets/seal-tour.jpg";

const FamilieweekendVlieland = () => {
  return (
    <>
      <Helmet>
        <title>Familieweekend Vlieland – Reünie of uitje met de hele familie | Bureau Vlieland</title>
        <meta 
          name="description" 
          content="Organiseer een familieweekend of reünie op Vlieland. Activiteiten voor alle leeftijden, groepsaccommodaties en catering – wij zorgen voor alles." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/familieweekend-vlieland" />
        <meta property="og:title" content="Familieweekend Vlieland – Bureau Vlieland" />
        <meta property="og:description" content="Organiseer een familieweekend op Vlieland. Activiteiten voor alle leeftijden, logies en catering – compleet verzorgd." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bureauvlieland.nl/familieweekend-vlieland" />
        <meta name="keywords" content="familieweekend Vlieland, familiereünie Waddeneiland, familie uitje, meergeneratie weekend, familie vakantie Vlieland" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Familieweekend Vlieland"
        serviceDescription="Organiseer een familieweekend of reünie op Vlieland. Activiteiten voor alle leeftijden, groepsaccommodaties en catering – wij zorgen voor alles."
        canonicalUrl="https://bureauvlieland.nl/familieweekend-vlieland"
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Voor wie", url: "https://bureauvlieland.nl/voor-wie" },
          { name: "Familieweekend Vlieland", url: "https://bureauvlieland.nl/familieweekend-vlieland" }
        ]}
      />

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Voor wie", href: "/voor-wie" },
          { label: "Familieweekend Vlieland" }
        ]} 
      />

      <main id="main-content">
        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Familie in de duinen van Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Familieweekend op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Van opa en oma tot kleinkinderen – creëer samen herinneringen op het mooiste Waddeneiland.
            </p>
          </div>
        </section>

        {/* Introductie */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg md:text-xl text-foreground leading-relaxed">
                Een familieweekend op Vlieland is dé manier om de hele familie bij elkaar te brengen. 
                Geen drukte, geen auto's, wel eindeloze stranden, prachtige natuur en activiteiten 
                voor alle leeftijden. Wij helpen je om het perfecte weekend samen te stellen.
              </p>
            </div>
          </div>
        </section>

        {/* Waarom Vlieland */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12 text-center">
                Waarom Vlieland perfect is voor families
              </h2>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Baby className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Veilig & Autovrij
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Geen druk verkeer, kinderen kunnen vrij spelen. Het hele eiland is jullie speeltuin.
                  </p>
                </div>

                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Avontuur voor iedereen
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Van schelpjes zoeken met kleintjes tot fietsen door de duinen voor opa en oma.
                  </p>
                </div>

                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Heart className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Quality time
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Geen afleiding van alledag – alleen tijd voor elkaar en de mooie omgeving.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Activiteiten */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">
                Activiteiten voor alle leeftijden
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Van actief tot ontspannen – wij hebben voor ieder familielid iets leuks.
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] group">
                  <img 
                    src={beachActivityImage} 
                    alt="Strandactiviteit voor families"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-lg font-display font-bold text-primary-foreground mb-1">
                        Strandspelen
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Beachvolleybal, vliegeren, schelpen zoeken of zandkastelen bouwen.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] group">
                  <img 
                    src={sealTourImage} 
                    alt="Zeehondentocht op Vlieland"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-lg font-display font-bold text-primary-foreground mb-1">
                        Natuur ontdekken
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Zeehondentochten, vogelspotten en wadlopen voor jong en oud.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] group">
                  <img 
                    src={kiteImage} 
                    alt="Vliegeren op Vlieland"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-lg font-display font-bold text-primary-foreground mb-1">
                        Samen actief
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Fietsen, powerkiten of een eilandspel met de hele familie.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Praktisch */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12 text-center">
                Wij regelen de praktische zaken
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Home className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Groepsaccommodaties
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Van grote vakantiehuizen tot meerdere appartementen naast elkaar – wij vinden 
                    de perfecte overnachting voor jullie familie, ongeacht de grootte.
                  </p>
                  <Link 
                    to="/logies-vlieland" 
                    className="text-primary font-medium inline-flex items-center gap-2 hover:underline"
                  >
                    Bekijk logiesopties
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Utensils className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Catering & Eten
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Zelf koken of lekker laten verzorgen? Van BBQ-pakketten tot volledig verzorgde 
                    diners – wij passen ons aan jullie wensen aan.
                  </p>
                  <Link 
                    to="/catering" 
                    className="text-primary font-medium inline-flex items-center gap-2 hover:underline"
                  >
                    Bekijk cateringopties
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
                Plan jullie familieweekend
              </h2>
              <p className="text-lg opacity-90 mb-10 leading-relaxed">
                Stel zelf uw programma samen of vraag een maatwerk offerte aan – wij denken graag 
                met u mee over het perfecte weekend voor uw familie.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="secondary" className="gap-2">
                  <Link to="/programma-samenstellen">
                    Stel uw programma samen
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                  <Link to="/programma-op-maat">
                    Liever maatwerk?
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
                  to="/jubileum-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Jubileum vieren</span>
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
                  to="/trouwen-op-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Trouwen op Vlieland</span>
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

export default FamilieweekendVlieland;
