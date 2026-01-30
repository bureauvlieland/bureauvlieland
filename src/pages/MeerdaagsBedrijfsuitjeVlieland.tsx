import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, Moon, Coffee, Users, Utensils, MapPin, CheckCircle, Bed } from "lucide-react";
import heroImage from "@/assets/vlieland-group.jpg";
import sunsetDinnerImage from "@/assets/sunset-dinner.jpg";
import beachBonfireImage from "@/assets/beach-bonfire.jpg";
import vlielandMorningImage from "@/assets/vlieland-morning.jpg";

const MeerdaagsBedrijfsuitjeVlieland = () => {
  const uspItems = [
    { icon: Moon, title: "Meer tijd", description: "Ruimte voor verdieping en informele momenten" },
    { icon: Coffee, title: "Ontspanning", description: "Van vroege ochtend tot late avond" },
    { icon: Users, title: "Verbinding", description: "Teams groeien dichter naar elkaar toe" },
  ];

  return (
    <>
      <Helmet>
        <title>Meerdaags bedrijfsuitje op Vlieland – met overnachting</title>
        <meta 
          name="description" 
          content="Een meerdaags bedrijfsuitje op Vlieland met rust en verdieping. Bureau Vlieland regelt het complete programma inclusief overnachting." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/meerdaags-bedrijfsuitje-vlieland" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Meerdaags bedrijfsuitje op Vlieland"
        serviceDescription="Een meerdaags bedrijfsuitje op Vlieland met rust en verdieping. Bureau Vlieland regelt het complete programma inclusief overnachting."
        canonicalUrl="https://bureauvlieland.nl/meerdaags-bedrijfsuitje-vlieland"
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Bedrijfsuitje Vlieland", url: "https://bureauvlieland.nl/bedrijfsuitje-vlieland" },
          { name: "Meerdaags bedrijfsuitje Vlieland", url: "https://bureauvlieland.nl/meerdaags-bedrijfsuitje-vlieland" }
        ]}
      />

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland" },
          { label: "Meerdaags bedrijfsuitje Vlieland" }
        ]} 
      />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Groep tijdens meerdaags bedrijfsuitje op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Meerdaags bedrijfsuitje op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Wie echt de diepte in wil, kiest voor een meerdaags programma. Door te blijven slapen 
              ontstaat ruimte voor verdieping, ontspanning en onderlinge verbinding.
            </p>
          </div>
        </section>

        {/* Introductie */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg md:text-xl text-foreground leading-relaxed">
                Meerdaagse programma's zorgen voor minder haast en meer aandacht. Teams hebben 
                de tijd om te landen, samen te werken en tot inzichten te komen.
              </p>
            </div>
          </div>
        </section>

        {/* USP Cards */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12 text-center">
                Waarom meerdere dagen?
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
                Van aankomst tot vertrek verzorgd
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Wij regelen overnachtingen, programma's, activiteiten en catering. Alles op elkaar afgestemd.
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="relative overflow-hidden rounded-2xl aspect-[4/3]">
                  <img 
                    src={sunsetDinnerImage} 
                    alt="Diner bij zonsondergang"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3">
                        <Utensils className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <h3 className="text-xl font-display font-bold text-primary-foreground mb-2">
                        Gezamenlijk diner
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Van borrel tot meergangen menu – de avond als bindend moment.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/3]">
                  <img 
                    src={beachBonfireImage} 
                    alt="Kampvuur op het strand"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3">
                        <Moon className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <h3 className="text-xl font-display font-bold text-primary-foreground mb-2">
                        Avondprogramma
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Strandvuur, silent disco of sterren kijken – informele verbinding.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/3]">
                  <img 
                    src={vlielandMorningImage} 
                    alt="Ochtend op Vlieland"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3">
                        <Coffee className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <h3 className="text-xl font-display font-bold text-primary-foreground mb-2">
                        Ontbijt & ochtend
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Rustig starten, fris de dag in – of vroeg actief op het strand.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-2xl p-8 flex flex-col justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Bed className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Logies op maat
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Van hotels tot groepsaccommodaties – wij vinden de perfecte overnachting voor jullie team.
                  </p>
                  <Link 
                    to="/logies-vlieland" 
                    className="text-primary font-medium inline-flex items-center gap-2 hover:underline"
                  >
                    Bekijk logiesopties
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Geschikt voor */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                    Geschikt voor
                  </h2>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    Directies, managementteams, afdelingen en organisaties die willen investeren 
                    in samenwerking en focus.
                  </p>
                  
                  <div className="space-y-4">
                    {[
                      "Heisessies en strategiedagen",
                      "Teambuilding met verdieping",
                      "Incentive reizen",
                      "Afdelingsuitjes met overnachting"
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4 mt-8">
                    <Link 
                      to="/heisessie-vlieland" 
                      className="text-primary font-medium inline-flex items-center gap-2 hover:underline"
                    >
                      Heisessie
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link 
                      to="/incentive-reis-vlieland" 
                      className="text-primary font-medium inline-flex items-center gap-2 hover:underline"
                    >
                      Incentive reis
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                <div className="relative">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                    <img 
                      src={heroImage} 
                      alt="Team op Vlieland"
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
                  to="/heisessie-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Heisessie Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/incentive-reis-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Incentive reis Vlieland</span>
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

export default MeerdaagsBedrijfsuitjeVlieland;