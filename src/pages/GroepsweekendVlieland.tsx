import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Music, Utensils, MapPin, Bike, Compass } from "lucide-react";
import heroImage from "@/assets/vlieland-group.jpg";
import beachActivityImage from "@/assets/beach-activity.jpg";
import cyclingGroupImage from "@/assets/cycling-group.jpg";
import outdoorDrinksImage from "@/assets/outdoor-drinks.jpg";

const GroepsweekendVlieland = () => {
  return (
    <>
      <Helmet>
        <title>Groepsweekend Vlieland – Organiseer een onvergetelijk weekend | Bureau Vlieland</title>
        <meta 
          name="description" 
          content="Organiseer een groepsweekend op Vlieland voor vrienden, verenigingen of sportclubs. Activiteiten, logies en catering – wij regelen alles of je stelt zelf samen." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/groepsweekend-vlieland" />
        <meta property="og:title" content="Groepsweekend Vlieland – Bureau Vlieland" />
        <meta property="og:description" content="Organiseer een groepsweekend op Vlieland. Activiteiten, logies en catering – compleet verzorgd of zelf samenstellen." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bureauvlieland.nl/groepsweekend-vlieland" />
        <meta name="keywords" content="groepsweekend Vlieland, vriendenweekend Waddeneiland, verenigingsuitje, sportclub weekend, groepsreis Vlieland" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Groepsweekend Vlieland"
        serviceDescription="Organiseer een onvergetelijk groepsweekend op Vlieland voor vrienden, verenigingen of sportclubs. Van activiteiten tot logies – compleet verzorgd of zelf samenstellen."
        canonicalUrl="https://bureauvlieland.nl/groepsweekend-vlieland"
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Voor wie", url: "https://bureauvlieland.nl/voor-wie" },
          { name: "Groepsweekend Vlieland", url: "https://bureauvlieland.nl/groepsweekend-vlieland" }
        ]}
      />

      <Navigation />
      <LandingBreadcrumb 
        items={[
          { label: "Voor wie", href: "/voor-wie" },
          { label: "Groepsweekend Vlieland" }
        ]} 
      />

      <main id="main-content">
        {/* Hero Section */}
        <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Groep vrienden op Vlieland"
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Groepsweekend op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Van vriendenweekend tot verenigingsuitje – wij maken er een onvergetelijke ervaring van.
            </p>
          </div>
        </section>

        {/* Introductie */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg md:text-xl text-foreground leading-relaxed">
                Een groepsweekend op Vlieland is de perfecte manier om samen te ontsnappen aan de drukte van alledag. 
                Of jullie nu met een vriendengroep komen, een sportclub of een vereniging – wij zorgen voor een 
                programma dat past bij jullie wensen en budget.
              </p>
            </div>
          </div>
        </section>

        {/* Voor wie */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12 text-center">
                Voor wie is dit geschikt?
              </h2>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Vriendengroepen
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Van studievrienden tot oud-huisgenoten – een weekend weg om bij te praten en samen te genieten.
                  </p>
                </div>

                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Bike className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Sportclubs
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Hockey, voetbal, tennis of hardlopen – combineer sportieve activiteiten met gezelligheid.
                  </p>
                </div>

                <div className="bg-background rounded-2xl p-8 shadow-lg border border-border/50 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Compass className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Verenigingen
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Studentenverenigingen, buurtclubs of hobbygroepen – samen eropuit voor een memorabel weekend.
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
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center">
                Wat wij verzorgen
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Van activiteiten tot overnachting – wij regelen alles voor jullie groepsweekend.
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="relative overflow-hidden rounded-2xl aspect-[4/3]">
                  <img 
                    src={beachActivityImage} 
                    alt="Strandactiviteit op Vlieland"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-xl font-display font-bold text-primary-foreground mb-2">
                        Activiteiten
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Van beachvolleybal tot eilandspellen, fietstochten tot escape rooms.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl aspect-[4/3]">
                  <img 
                    src={cyclingGroupImage} 
                    alt="Groep fietst over Vlieland"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="text-xl font-display font-bold text-primary-foreground mb-2">
                        Transport & Fietsen
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        Fietsverhuur, groepsvervoer en logistieke ondersteuning op het eiland.
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
                        Catering & Horeca
                      </h3>
                      <p className="text-primary-foreground/90 text-sm">
                        BBQ op het strand, diner in een restaurant of borrel bij zonsondergang.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-2xl p-8 flex flex-col justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <MapPin className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-3">
                    Logies
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Van groepsaccommodaties tot appartementen – wij helpen jullie aan de perfecte overnachting.
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

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                Klaar om te beginnen?
              </h2>
              <p className="text-lg opacity-90 mb-10 leading-relaxed">
                Stel zelf je programma samen met onze configurator of vraag een maatwerk offerte aan 
                voor persoonlijk advies.
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
                  to="/trouwen-op-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Trouwen op Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/familieweekend-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Familieweekend Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/jubileum-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Jubileum vieren</span>
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

export default GroepsweekendVlieland;
