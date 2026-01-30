import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Mic, Users, MapPin, Utensils, CheckCircle } from "lucide-react";
import heroImage from "@/assets/event-outdoor.jpg";
import tentSetupImage from "@/assets/tent-setup.jpg";
import outdoorDiningImage from "@/assets/outdoor-dining.jpg";
import eventNightImage from "@/assets/event-night.jpg";

const ZakelijkEvenementVlieland = () => {
  const uspItems = [
    { icon: Building2, title: "Professionele setting", description: "Vergaderlocaties met alle faciliteiten" },
    { icon: Mic, title: "Complete organisatie", description: "Van techniek tot catering geregeld" },
    { icon: Users, title: "Flexibele schaalgrootte", description: "Van 20 tot 200 deelnemers" },
  ];

  return (
    <>
      <Helmet>
        <title>Zakelijk evenement op Vlieland – organisatie van A tot Z</title>
        <meta 
          name="description" 
          content="Een zakelijk evenement op Vlieland organiseren? Bureau Vlieland verzorgt planning, locaties en uitvoering." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/zakelijk-evenement-vlieland" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Zakelijk evenement op Vlieland"
        serviceDescription="Een zakelijk evenement op Vlieland organiseren? Bureau Vlieland verzorgt planning, locaties en uitvoering."
        canonicalUrl="https://bureauvlieland.nl/zakelijk-evenement-vlieland"
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Bedrijfsuitje Vlieland", url: "https://bureauvlieland.nl/bedrijfsuitje-vlieland" },
          { name: "Zakelijk evenement Vlieland", url: "https://bureauvlieland.nl/zakelijk-evenement-vlieland" }
        ]}
      />

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Bedrijfsuitje Vlieland", href: "/bedrijfsuitje-vlieland" },
          { label: "Zakelijk evenement Vlieland" }
        ]} 
      />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Zakelijk evenement op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Zakelijk evenement op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Voor congressen, bijeenkomsten en zakelijke evenementen biedt Vlieland een unieke setting. 
              Wij nemen de volledige organisatie uit handen.
            </p>
          </div>
        </section>

        {/* Introductie */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg md:text-xl text-foreground leading-relaxed">
                Vlieland biedt rust, ruimte en focus – ideaal voor zakelijke bijeenkomsten 
                die impact moeten maken. Weg van de waan van de dag, volledig gericht op de inhoud.
              </p>
            </div>
          </div>
        </section>

        {/* USP Cards */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12 text-center">
                Waarom Vlieland voor uw evenement?
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
                Complete organisatie
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Van locatie tot logistiek, van catering tot programma: wij verzorgen het complete traject.
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] group">
                  <img 
                    src={tentSetupImage} 
                    alt="Tent opbouw voor evenement"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3">
                        <MapPin className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <h3 className="text-lg font-display font-bold text-primary-foreground mb-1">
                        Locatie & materialen
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Tenten, meubilair, techniek en aankleding op maat.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] group">
                  <img 
                    src={outdoorDiningImage} 
                    alt="Zakelijk diner buiten"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3">
                        <Utensils className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <h3 className="text-lg font-display font-bold text-primary-foreground mb-1">
                        Catering op niveau
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Van koffiepauze tot galadiner – passend bij uw evenement.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] group">
                  <img 
                    src={eventNightImage} 
                    alt="Avondevenement op Vlieland"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3">
                        <Users className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <h3 className="text-lg font-display font-bold text-primary-foreground mb-1">
                        Netwerkprogramma
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Borrels, activiteiten en informele momenten tussendoor.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Combineren met */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="order-2 lg:order-1">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                    <img 
                      src={heroImage} 
                      alt="Zakelijk evenement"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>

                <div className="order-1 lg:order-2">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                    Combineer met verdieping
                  </h2>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    Een zakelijk evenement op Vlieland wordt nog waardevoller met een inhoudelijke component 
                    of overnachting voor verdieping.
                  </p>
                  
                  <div className="space-y-4">
                    {[
                      "Heisessie voor strategische focus",
                      "Incentive programma als beloning",
                      "Meerdaagse bijeenkomst met overnachting"
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

export default ZakelijkEvenementVlieland;