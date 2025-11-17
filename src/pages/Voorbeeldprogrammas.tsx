import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass, Utensils, Users, Sparkles, Ship, Bike, UtensilsCrossed, Sun } from "lucide-react";
import teamBeach from "@/assets/beach-signs.jpg";
import beachActivity from "@/assets/beach-activity.jpg";
import speedboat from "@/assets/speedboat.jpg";
import surfActivity from "@/assets/surf-activity.jpg";
import cyclingTeam from "@/assets/cycling-team.jpg";
import dunesGroup from "@/assets/dunes-group.jpg";
import mindset22Outdoor from "@/assets/mindset22-outdoor.jpg";
import lunchBuffet from "@/assets/lunch-buffet.jpg";
import kiteFlying from "@/assets/kite-flying.jpg";
import sealTour from "@/assets/seal-tour.jpg";
import { Link } from "react-router-dom";
import { useKenBurns } from "@/hooks/use-ken-burns";

const Voorbeeldprogrammas = () => {
  const kenBurns = useKenBurns();
  
  const programModules = [
    {
      category: "Avontuurlijke Activiteiten",
      icon: Compass,
      description: "Actieve belevenissen op water, strand en door de natuur",
      image: speedboat,
      modules: [
        {
          title: "Watersport & Zeeavonturen",
          description: "Ontdek de Waddenzee op spectaculaire wijze",
          activities: [
            "RescueBoat transfers - Spektakel met 60 km/u over de Waddenzee",
            "Zeehondentochten - Bezoek de zeehondenbanken",
            "Wadloopexperience - Op blote voeten de wadden verkennen",
            "Surf & SUP sessies - Voor beginners én gevorderden",
            "Zeilen met klassieke klippers - Unieke aankomst op Vlieland"
          ],
          image: sealTour
        },
        {
          title: "Eilandverkenning",
          description: "Ontdek de schatten van Vlieland",
          activities: [
            "E-bike tochten - Het hele eiland verkennen op eigen tempo",
            "Vliehors Express - De 'Sahara van het Noorden' per truck",
            "Strandactiviteiten - Vliegeren, beachvolleybal, strandgolf",
            "Natuurwandelingen - Door bossen, duinen en langs het strand",
            "Dorpsbezoek - Historisch centrum met winkeltjes en terrassen"
          ],
          image: cyclingTeam
        }
      ]
    },
    {
      category: "Culinaire Belevenissen",
      icon: Utensils,
      description: "Van lunch tot diner, van borrel tot BBQ - alles verzorgd",
      image: lunchBuffet,
      modules: [
        {
          title: "Luncharrangementen",
          description: "Heerlijke lunch tussen de activiteiten door",
          activities: [
            "Lunch op spectaculaire locaties - Bij de vuurtoren, op het strand",
            "Walking lunch op het eiland - Onderweg genieten",
            "Luxe lunchbuffetten - Voor grotere groepen",
            "Vlielands lunchpakket - Voor tijdens actieve uitstapjes",
            "Lokale specialiteiten - Verse vis en eilandproducten"
          ],
          image: lunchBuffet
        },
        {
          title: "Diner & Borrel",
          description: "Van informele BBQ tot stijlvol diner",
          activities: [
            "Strand BBQ - Met je voeten in het zand genieten",
            "Restaurant arrangementen - Meerdere locaties beschikbaar",
            "Borrels & hapjes - Op het terras of binnen",
            "Walking dinner - Culinaire route door het dorp",
            "Thema-avonden - Van oesterbar tot bierproeverij"
          ],
          image: dunesGroup
        }
      ]
    },
    {
      category: "Teamontwikkeling",
      icon: Users,
      description: "RMD Trainingen en Mindset22 voor duurzame teamgroei",
      image: beachActivity,
      modules: [
        {
          title: "RMD Programma's",
          description: "Experiëntieel leren met bewezen impact",
          activities: [
            "Teammetaforen in de praktijk - Het eiland als leerschool",
            "Outdoor challenges - Samenwerking onder druk",
            "Reflectiesessies - Leren van ervaringen",
            "Teambuildingactiviteiten - Op maat samengesteld",
            "Transfer naar de werkplek - Concreet actieplan"
          ],
          image: beachActivity
        },
        {
          title: "Mindset22 Trajecten",
          description: "Focus op groei en ontwikkeling",
          activities: [
            "Growth Mindset workshops - Denken in mogelijkheden",
            "Teamvergadering feedback - Praktische toepassing",
            "Wake-up sessies - Start de dag met energie",
            "Individuele reflectie - Persoonlijke ontwikkeling",
            "Groepsdynamiek versterken - Duurzame samenwerking"
          ],
          image: mindset22Outdoor
        }
      ]
    },
    {
      category: "Ontspanning & Beleving",
      icon: Sparkles,
      description: "Unieke momenten en ervaringen om nooit te vergeten",
      image: kiteFlying,
      modules: [
        {
          title: "Strand & Natuur",
          description: "Genieten van de rust en ruimte",
          activities: [
            "Vrije tijd op het strand - Kilometers leeg strand",
            "Strandactiviteiten - Van yoga tot vliegeren",
            "Natuurbeleving - Unieke flora en fauna",
            "Sunset watching - Adembenemende zonsondergangen",
            "Sterren kijken - Minimale lichtvervuiling"
          ],
          image: kiteFlying
        },
        {
          title: "Cultuur & Vermaak",
          description: "Het eiland en zijn verhalen ontdekken",
          activities: [
            "Dorpsverkenning - Gezellige Dorpsstraat",
            "Vuurtoren bezoek - Iconisch landmark",
            "Museumbezoek - Eilandgeschiedenis",
            "Lokale kennismaking - Verhalen van eilanders",
            "Terrasjes & uitgaan - Avondentertainment"
          ],
          image: surfActivity
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${teamBeach})`,
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

          <div className="relative z-10 text-center text-primary-foreground px-4 max-w-5xl">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Stel je Ideale Programma Samen
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              Kies uit verschillende modules en creëer het perfecte teamuitje voor jouw groep
            </p>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-3xl mx-auto">
              Wij verzorgen alles - van transfers en accommodatie tot activiteiten en catering
            </p>
          </div>
        </section>

        {/* Introduction */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Maatwerk Programma's op Vlieland
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Elk teamuitje is uniek. Daarom bieden wij geen standaard pakketten, maar werken wij met 
                flexibele <strong>programmamodules</strong> die je kunt combineren naar wens. Kies wat bij jouw team past 
                en wij regelen de rest.
              </p>
              <p className="text-lg text-muted-foreground">
                <strong>Complete ontzorging:</strong> Transfers, accommodatie, fietsen, activiteiten, catering - 
                alles uit één hand. Jullie hoeven alleen maar te genieten en te focussen op het team.
              </p>
            </div>
          </div>
        </section>

        {/* Program Modules */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
              Kies uit Onze Programmamodules
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto">
              Combineer verschillende modules voor een programma van 1, 2 of 3 dagen
            </p>

            <div className="space-y-16">
              {programModules.map((category, idx) => (
                <div key={idx}>
                  {/* Category Header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <category.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                        {category.category}
                      </h3>
                      <p className="text-muted-foreground">{category.description}</p>
                    </div>
                  </div>

                  {/* Modules Grid */}
                  <div className="grid md:grid-cols-2 gap-8">
                    {category.modules.map((module, moduleIdx) => (
                      <Card key={moduleIdx} className="overflow-hidden">
                        <div className="relative h-[250px]">
                          <img 
                            src={module.image} 
                            alt={module.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </div>
                        <CardHeader>
                          <CardTitle className="text-2xl">{module.title}</CardTitle>
                          <CardDescription className="text-base">
                            {module.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {module.activities.map((activity, actIdx) => (
                              <li key={actIdx} className="flex items-start gap-3">
                                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                                <span className="text-muted-foreground">{activity}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What We Arrange */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
              Dit Regelen Wij Voor Jullie
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="text-center">
                <CardHeader>
                  <Ship className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <CardTitle>Transfers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Van parkeerplaats in Harlingen tot aan de deur op Vlieland
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <Bike className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <CardTitle>Vervoer op eiland</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    E-bikes of fietsen voor het hele verblijf
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <CardTitle>Catering</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Van ontbijt tot diner, alles verzorgd op gewenste locaties
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <Sun className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <CardTitle>Accommodatie</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Hotels en groepsaccommodaties op toplocaties
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Image Gallery */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-foreground">
              Impressie van Teamuitjes op Vlieland
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="relative h-[280px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={teamBeach} 
                  alt="Team groepsfoto op het strand" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">Teamfoto op het strand</p>
                </div>
              </div>
              <div className="relative h-[280px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={beachActivity} 
                  alt="Beach activiteit met groep" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">Silent Disco Beach</p>
                </div>
              </div>
              <div className="relative h-[280px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={dunesGroup} 
                  alt="Grote groep in de duinen" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">Groepsfoto in de duinen</p>
                </div>
              </div>
              <div className="relative h-[280px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={speedboat} 
                  alt="Speedboot watertocht" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">RescueBoat Adventures</p>
                </div>
              </div>
              <div className="relative h-[280px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={sealTour} 
                  alt="Zeehondentocht" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">Zeehondentocht</p>
                </div>
              </div>
              <div className="relative h-[280px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={surfActivity} 
                  alt="Surf en watersport activiteiten" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">Surf & Watersport</p>
                </div>
              </div>
              <div className="relative h-[280px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={cyclingTeam} 
                  alt="Team fietstocht" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">Fietsen over Vlieland</p>
                </div>
              </div>
              <div className="relative h-[280px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={kiteFlying} 
                  alt="Vliegeren op het strand" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">Strandvliegeren</p>
                </div>
              </div>
              <div className="relative h-[280px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={lunchBuffet} 
                  alt="Lunch buffet arrangement" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">Heerlijke lunch buffetten</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Laten We Samen Jouw Ideale Programma Creëren
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Vertel ons over je team, doelen en wensen. Wij stellen een programma samen dat 
                perfect bij jullie past - met de juiste mix van activiteit, ontspanning en teamontwikkeling.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/contact">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Vraag een offerte op maat aan
                  </Button>
                </Link>
                <Link to="/programmas">
                  <Button size="lg" variant="outline">
                    Bekijk RMD & Mindset22
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Voorbeeldprogrammas;
