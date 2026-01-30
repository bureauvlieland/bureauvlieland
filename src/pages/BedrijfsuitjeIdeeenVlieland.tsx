import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, Lightbulb, Puzzle, Compass, Bike, Ship, Utensils, Camera } from "lucide-react";
import heroImage from "@/assets/beach-activity.jpg";
import cyclingImage from "@/assets/cycling-group.jpg";
import speedboatImage from "@/assets/speedboat.jpg";
import cateringImage from "@/assets/catering.jpg";

const BedrijfsuitjeIdeeenVlieland = () => {
  const ideaCategories = [
    { 
      icon: Bike, 
      title: "Actief & buiten", 
      description: "Fietsen, surfen, beachsporten of eilandspellen",
      link: "/programma-samenstellen"
    },
    { 
      icon: Ship, 
      title: "Water & natuur", 
      description: "Zeehondentocht, speedboot of wadlopen",
      link: "/programma-samenstellen"
    },
    { 
      icon: Utensils, 
      title: "Culinair", 
      description: "BBQ, diner bij zonsondergang of walking dinner",
      link: "/catering"
    },
    { 
      icon: Camera, 
      title: "Beleving", 
      description: "Vuurtoren bezoek, dorpstour of silent disco",
      link: "/programma-samenstellen"
    },
  ];

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
      <LandingPageStructuredData
        serviceName="Bedrijfsuitje ideeën op Vlieland"
        serviceDescription="Op zoek naar ideeën voor een bedrijfsuitje op Vlieland? Laat je inspireren door Bureau Vlieland met maatwerk programma's."
        canonicalUrl="https://bureauvlieland.nl/bedrijfsuitje-ideeen-vlieland"
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Bedrijfsuitje Vlieland", url: "https://bureauvlieland.nl/bedrijfsuitje-vlieland" },
          { name: "Bedrijfsuitje ideeën Vlieland", url: "https://bureauvlieland.nl/bedrijfsuitje-ideeen-vlieland" }
        ]}
      />

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland" },
          { label: "Bedrijfsuitje ideeën Vlieland" }
        ]} 
      />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Activiteiten tijdens bedrijfsuitje op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Bedrijfsuitje ideeën op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Zoek je inspiratie voor een bedrijfsuitje? Het eiland biedt talloze mogelijkheden, 
              van actief tot verdiepend. Wij vertalen ideeën naar een samenhangend programma.
            </p>
          </div>
        </section>

        {/* Introductie */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg md:text-xl text-foreground leading-relaxed">
                Een goed bedrijfsuitje is meer dan een leuk idee. Wij helpen bij het kiezen, 
                combineren en organiseren van onderdelen tot één logisch geheel.
              </p>
            </div>
          </div>
        </section>

        {/* Idee Categorieën */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12 text-center">
                Mogelijkheden op Vlieland
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {ideaCategories.map((category, index) => (
                  <Link 
                    key={index} 
                    to={category.link}
                    className="bg-background rounded-2xl p-6 shadow-lg border border-border/50 hover:border-primary/50 hover:shadow-xl transition-all group"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <category.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-display font-bold text-foreground mb-2">
                      {category.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {category.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Image Grid - Inspiratie */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">
                Laat je inspireren
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Van actieve outdoor activiteiten tot inhoudelijke sessies – altijd op maat samengesteld.
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="relative overflow-hidden rounded-2xl aspect-[4/3]">
                  <img 
                    src={cyclingImage} 
                    alt="Groep fietst over Vlieland"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-xl font-display font-bold text-primary-foreground mb-2">
                        Eiland verkennen
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Per fiets, e-bike of te voet door de duinen en het dorp.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/3]">
                  <img 
                    src={speedboatImage} 
                    alt="Speedboot tocht"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-xl font-display font-bold text-primary-foreground mb-2">
                        Avontuur op het water
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Speedboot, zeehondentocht of privé rondvaart over de Waddenzee.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/3]">
                  <img 
                    src={cateringImage} 
                    alt="Catering op Vlieland"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-xl font-display font-bold text-primary-foreground mb-2">
                        Culinaire ervaringen
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        BBQ op het strand, walking dinner of luxe meergangen menu.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-2xl p-8 flex flex-col justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Puzzle className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Zelf combineren
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Stel je eigen programma samen uit alle beschikbare onderdelen. 
                    Wij zorgen voor de perfecte afstemming.
                  </p>
                  <Link 
                    to="/programma-samenstellen" 
                    className="text-primary font-medium inline-flex items-center gap-2 hover:underline"
                  >
                    Begin met samenstellen
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Programma types */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">
                Van idee naar programma
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Afhankelijk van jullie doel en groep adviseren wij een passend type programma.
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                <Link 
                  to="/teamuitje-vlieland"
                  className="bg-background rounded-2xl p-6 shadow-lg border border-border/50 hover:border-primary/50 hover:shadow-xl transition-all group"
                >
                  <h3 className="text-lg font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    Teamuitje
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Focus op samenwerking en verbinding
                  </p>
                  <span className="text-primary font-medium inline-flex items-center gap-2 text-sm">
                    Meer info
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>

                <Link 
                  to="/meerdaags-bedrijfsuitje-vlieland"
                  className="bg-background rounded-2xl p-6 shadow-lg border border-border/50 hover:border-primary/50 hover:shadow-xl transition-all group"
                >
                  <h3 className="text-lg font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    Meerdaags
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Met overnachting voor verdieping
                  </p>
                  <span className="text-primary font-medium inline-flex items-center gap-2 text-sm">
                    Meer info
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>

                <Link 
                  to="/incentive-reis-vlieland"
                  className="bg-background rounded-2xl p-6 shadow-lg border border-border/50 hover:border-primary/50 hover:shadow-xl transition-all group"
                >
                  <h3 className="text-lg font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    Incentive
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Exclusieve beleving als beloning
                  </p>
                  <span className="text-primary font-medium inline-flex items-center gap-2 text-sm">
                    Meer info
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
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
                Stel zelf je programma samen of vraag een maatwerk offerte aan voor persoonlijk advies.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="secondary" className="gap-2">
                  <Link to="/programma-samenstellen">
                    Stel je programma samen
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

export default BedrijfsuitjeIdeeenVlieland;