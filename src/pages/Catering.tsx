import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import sunsetDinnerImage from "@/assets/sunset-dinner.jpg";
import beachEventImage from "@/assets/beach-event.jpg";
import outdoorDiningImage from "@/assets/outdoor-dining.jpg";
import foodPlattersImage from "@/assets/food-platters.jpg";
import outdoorDrinksImage from "@/assets/outdoor-drinks.jpg";
import tentSetupImage from "@/assets/tent-setup.jpg";
import { Link } from "react-router-dom";
import { useKenBurns } from "@/hooks/use-ken-burns";

const Catering = () => {
  const kenBurns = useKenBurns();
  
  const cateringOptions = [
    {
      title: "Lunch Arrangementen",
      description: "Van eenvoudige broodjes tot uitgebreide lunch buffetten",
      items: ["Broodjes luxe", "Soepen", "Salades", "Warme gerechten", "Vegetarische opties"]
    },
    {
      title: "Diner Arrangementen",
      description: "Culinaire ervaringen met lokale producten",
      items: ["3-gangen diner", "BBQ arrangementen", "Buffet stijl", "Walking dinner", "Vlielandse specialiteiten"]
    },
    {
      title: "Borrel & Hapjes",
      description: "Perfect voor informele momenten",
      items: ["Borrelhapjes", "Fingerfood", "Tapasbuffet", "Drankpakketten", "Thema borrels"]
    },
    {
      title: "Speciale Arrangementen",
      description: "Op maat gemaakte culinaire ervaringen",
      items: ["Strandpaviljoen BBQ", "Outdoor cooking", "Wadden producten", "Maatwerk menu's", "Dieetwensen mogelijk"]
    }
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${sunsetDinnerImage})`,
              ...kenBurns
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
          </div>

          {/* Decorative wave patterns */}
          <div className="absolute top-0 left-0 w-full h-32 opacity-10 pointer-events-none">
            <svg viewBox="0 0 1200 120" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,50 Q300,20 600,50 T1200,50 L1200,0 L0,0 Z" fill="currentColor" className="text-background"/>
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-32 opacity-10 pointer-events-none">
            <svg viewBox="0 0 1200 120" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,70 Q300,100 600,70 T1200,70 L1200,120 L0,120 Z" fill="currentColor" className="text-background"/>
            </svg>
          </div>

          <div className="relative z-10 text-center text-primary-foreground px-4">
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-6">
              Catering op Vlieland
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8">
              Heerlijke maaltijden en hapjes voor elk evenement
            </p>
            <Button 
              size="lg" 
              onClick={() => scrollToSection("opties")}
              className="bg-primary hover:bg-primary/90"
            >
              Bekijk onze opties
            </Button>
          </div>
        </section>

        {/* Introduction */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-foreground">
                Culinair genieten tijdens je evenement
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Bij Bureau Vlieland werken we samen met de beste lokale cateraars en 
                restaurants om je evenement culinair tot een succes te maken. Of je nu 
                kiest voor een eenvoudige lunch of een uitgebreid diner, wij zorgen voor 
                de perfecte catering passend bij jouw programma.
              </p>
              <p className="text-lg text-muted-foreground">
                Alle arrangementen kunnen worden aangepast aan specifieke dieetwensen 
                en voorkeuren van jouw groep.
              </p>
            </div>
          </div>
        </section>

        {/* Catering Options */}
        <section id="opties" className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12 text-foreground">
              Catering Mogelijkheden
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {cateringOptions.map((option, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-2xl">{option.title}</CardTitle>
                    <CardDescription className="text-base">
                      {option.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {option.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Photo Gallery Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12 text-foreground">
              Catering Impressies
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="relative h-[300px] rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={outdoorDiningImage} 
                  alt="Outdoor dining arrangement" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="relative h-[300px] rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={foodPlattersImage} 
                  alt="Delicious food platters" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="relative h-[300px] rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={outdoorDrinksImage} 
                  alt="Outdoor drinks arrangement" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="relative h-[300px] rounded-lg overflow-hidden shadow-lg lg:col-span-2">
                <img 
                  src={sunsetDinnerImage} 
                  alt="Sunset dinner event op Vlieland" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="relative h-[300px] rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={tentSetupImage} 
                  alt="Tent setup voor catering" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Beach BBQ Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-foreground">
                  Strand BBQ Experience
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Een absolute aanrader is onze strand BBQ ervaring. Met je voeten in 
                  het zand, het geluid van de zee op de achtergrond en een heerlijke 
                  barbecue. Deze unieke setting maakt je teamuitje onvergetelijk.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Barbecue op het strand</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Inclusief strandpaviljoen</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Verse lokale producten</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Complete verzorging</span>
                  </li>
                </ul>
              </div>
              <div className="relative h-[400px] rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={beachEventImage} 
                  alt="Beach BBQ op Vlieland" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-foreground">
                Op maat gemaakt voor jouw groep
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Elk catering arrangement kan volledig worden aangepast aan de wensen 
                en voorkeuren van jouw groep. Neem contact met ons op voor een 
                persoonlijk advies en offerte.
              </p>
              <Link to="/contact">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Vraag offerte aan
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Catering;