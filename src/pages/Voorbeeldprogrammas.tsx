import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, Calendar, Ship, Waves } from "lucide-react";
import vlielandMorning from "@/assets/vlieland-morning.jpg";
import vlielandBeach from "@/assets/vlieland-beach.jpg";
import vlielandActivity from "@/assets/vlieland-activity.jpg";
import vlielandGroup from "@/assets/vlieland-group.jpg";
import { Link } from "react-router-dom";

const Voorbeeldprogrammas = () => {
  const twoDayProgram = {
    title: "2-Daags Programma",
    subtitle: "Eilandbeleving voor een gemêleerde groep",
    duration: "2 dagen / 1 nacht",
    participants: "Geschikt voor groepen van 12-40 personen",
    image: vlielandBeach,
    highlights: [
      "Aankomst met watertaxi's (RescueBoats)",
      "Fietstocht met Juttersbitter ontvangst",
      "Lunch bij Vuurboetduin (48m hoog duin)",
      "Wadloopexperience met verse oesters",
      "Overnachting Hotel Zeezicht"
    ],
    day1: [
      { time: "10:30", activity: "Aankomst in Harlingen", description: "Watertaxi's liggen klaar in de haven" },
      { time: "11:00", activity: "Vertrek naar Vlieland", description: "RescueBoats met 60 km/u over Waddenzee en Noordzee" },
      { time: "11:45", activity: "Aankomst Vlieland", description: "Ontvangst met Juttersbitter, 7-versnellingsfietsen staan klaar" },
      { time: "12:00", activity: "Fietstocht naar dorp", description: "5 minuten fietsen naar Oost-Vlieland" },
      { time: "12:45", activity: "Lunch bij Vuurboetduin", description: "Spectaculaire vergezichten vanaf 48 meter hoge duin nabij vuurtoren" },
      { time: "13:45-16:00", activity: "Vrij programma", description: "Eilandverkenning per fiets of te voet" },
      { time: "16:00", activity: "Wadloopexperience", description: "Met handen in de modder op zoek naar oesters met Gerrit de Oesterman" },
      { time: "18:00", activity: "Terugfietsen naar hotel", description: "Tijd voor opfrissen" },
      { time: "19:00", activity: "Diner", description: "Keuze: BBQ op strand, restaurant Dorpsstraat of bij jachthaven" },
      { time: "22:00", activity: "Vrije avond", description: "Terrassen en cafés in de Dorpsstraat" }
    ],
    day2: [
      { time: "09:30", activity: "Uitgebreid ontbijtbuffet", description: "In Hotel Zeezicht" },
      { time: "10:00", activity: "Uitchecken en vrije tijd", description: "Winkeltjes verkennen in Dorpsstraat" },
      { time: "11:45", activity: "Vertrek m.s. Vlieland", description: "Lunch mogelijk in 'café op zee' tijdens overtocht" },
      { time: "13:15", activity: "Aankomst Harlingen", description: "Alternatief: flexibel vertrek met watertaxi's" }
    ]
  };

  const threeDayProgram = {
    title: "3-Daags Programma",
    subtitle: "Eilandbeleving, activiteiten en verzorging",
    duration: "3 dagen / 2 nachten",
    participants: "Geschikt voor groepen tot 39 personen",
    image: vlielandGroup,
    highlights: [
      "Aankomst met klassiek zeilschip (36m)",
      "Vliehors Express over 'Sahara van het Noorden'",
      "Stoere lunch in de natuur",
      "RIB-boten naar zeehondenbanken",
      "E-bikes beschikbaar gedurende verblijf"
    ],
    day1: [
      { time: "11:30", activity: "Aankomst Harlingen", description: "10 parkeerplaatsen bij zeilklipper De Passaat (36 meter)" },
      { time: "13:00", activity: "Zeilen naar Vlieland", description: "Lunch aan boord, zeehonden spotten mogelijk" },
      { time: "17:00", activity: "Aankomst Vlieland", description: "Ontvangst met Juttersbitter, 39 e-bikes staan klaar" },
      { time: "17:15", activity: "Check-in", description: "Hotel Zeezicht en Hotel de Wadden" },
      { time: "18:30", activity: "Diner Restaurant Zuiver", description: "5-gangen menu met verse producten en pure smaken" }
    ],
    day2: [
      { time: "08:30", activity: "Gezamenlijk ontbijt", description: "Hotel Zeezicht" },
      { time: "09:30", activity: "Fietstocht naar Posthuys", description: "9 kilometer, rugzakje met overlevingspakketje" },
      { time: "10:30", activity: "Vliehors Express tour", description: "Rondrit over immense zandvlakte, bezoek kleinste museum van Nederland" },
      { time: "12:30", activity: "Lunch in de natuur", description: "Stoere lunch op het strand na wandeling over het duin" },
      { time: "13:15", activity: "Begeleide wandeling", description: "Natuurgebied met Staatsbosbeheer gids - vogels en planten" },
      { time: "14:45", activity: "Terug naar Posthuys", description: "Mogelijkheid voor drankje of hapje" },
      { time: "15:30", activity: "Terugfietsen naar dorp", description: "Via Vliehors Express en fiets" },
      { time: "18:30", activity: "Diner bij De Dining", description: "Jachthaven met adembenemend uitzicht over Wadden" }
    ],
    day3: [
      { time: "08:30", activity: "Rustig ontbijt", description: "Late checkout tot 16:00 uur beschikbaar" },
      { time: "10:30", activity: "RIB-boten naar zeehonden", description: "3 snelle rubberboten, zeehonden spotten bij De Richel of Engelschhoek" },
      { time: "12:00", activity: "Lunch Hotel Zeezicht", description: "Na terugkomst in de haven" },
      { time: "Middag", activity: "Vrije tijd", description: "Winkeltjes, museum of terras bezoeken" },
      { time: "16:15", activity: "Fietsen inleveren", description: "Bij Fietsverhuur Jan van Vlieland" },
      { time: "16:30", activity: "Aan boord m.s. Vlieland", description: "Groepsvertrek" },
      { time: "18:15", activity: "Aankomst Harlingen", description: "Einde programma" }
    ]
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${vlielandMorning})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
          </div>
          <div className="relative z-10 text-center text-white px-4">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Voorbeeldprogramma's
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto">
              Inspiratie voor jouw perfecte teamuitje op Vlieland
            </p>
          </div>
        </section>

        {/* Introduction */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Maatwerk programma's op Vlieland
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Deze voorbeeldprogramma's geven een indruk van de mogelijkheden op Vlieland. 
                Elk programma is volledig aan te passen aan jullie wensen, groepsgrootte en budget.
              </p>
              <p className="text-lg text-muted-foreground">
                Van spectaculaire aankomsten met watertaxi's of zeilschip, tot unieke activiteiten 
                zoals de Vliehors Express en zeehonden spotten. Bureau Vlieland regelt alles van A tot Z.
              </p>
            </div>
          </div>
        </section>

        {/* Programs Tabs */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <Tabs defaultValue="2day" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-12">
                <TabsTrigger value="2day" className="text-base">2 Dagen</TabsTrigger>
                <TabsTrigger value="3day" className="text-base">3 Dagen</TabsTrigger>
              </TabsList>

              {/* 2-Day Program */}
              <TabsContent value="2day">
                <div className="max-w-6xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <div className="relative h-[400px] rounded-lg overflow-hidden shadow-lg">
                      <img 
                        src={twoDayProgram.image} 
                        alt={twoDayProgram.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                        {twoDayProgram.title}
                      </h2>
                      <p className="text-xl text-muted-foreground mb-6">
                        {twoDayProgram.subtitle}
                      </p>
                      <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-5 w-5 text-primary" />
                          <span>{twoDayProgram.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-5 w-5 text-primary" />
                          <span>{twoDayProgram.participants}</span>
                        </div>
                      </div>
                      <div className="bg-primary/5 rounded-lg p-6">
                        <h3 className="font-semibold text-lg mb-3 text-foreground">Highlights</h3>
                        <ul className="space-y-2">
                          {twoDayProgram.highlights.map((highlight, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                              <Ship className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <span>{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Day 1 */}
                  <Card className="p-8 mb-8">
                    <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
                      <Calendar className="h-6 w-6 text-primary" />
                      Dag 1 - Aankomst & Beleving
                    </h3>
                    <div className="space-y-4">
                      {twoDayProgram.day1.map((item, idx) => (
                        <div key={idx} className="flex gap-4 pb-4 border-b last:border-0 border-border/50">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-foreground">{item.time}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1">{item.activity}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Day 2 */}
                  <Card className="p-8">
                    <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
                      <Calendar className="h-6 w-6 text-primary" />
                      Dag 2 - Ontbijt & Vertrek
                    </h3>
                    <div className="space-y-4">
                      {twoDayProgram.day2.map((item, idx) => (
                        <div key={idx} className="flex gap-4 pb-4 border-b last:border-0 border-border/50">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-foreground">{item.time}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1">{item.activity}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* 3-Day Program */}
              <TabsContent value="3day">
                <div className="max-w-6xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <div className="relative h-[400px] rounded-lg overflow-hidden shadow-lg">
                      <img 
                        src={threeDayProgram.image} 
                        alt={threeDayProgram.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                        {threeDayProgram.title}
                      </h2>
                      <p className="text-xl text-muted-foreground mb-6">
                        {threeDayProgram.subtitle}
                      </p>
                      <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-5 w-5 text-primary" />
                          <span>{threeDayProgram.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-5 w-5 text-primary" />
                          <span>{threeDayProgram.participants}</span>
                        </div>
                      </div>
                      <div className="bg-primary/5 rounded-lg p-6">
                        <h3 className="font-semibold text-lg mb-3 text-foreground">Highlights</h3>
                        <ul className="space-y-2">
                          {threeDayProgram.highlights.map((highlight, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                              <Waves className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <span>{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Day 1 */}
                  <Card className="p-8 mb-8">
                    <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
                      <Calendar className="h-6 w-6 text-primary" />
                      Dag 1 - Aankomst met Zeilschip
                    </h3>
                    <div className="space-y-4">
                      {threeDayProgram.day1.map((item, idx) => (
                        <div key={idx} className="flex gap-4 pb-4 border-b last:border-0 border-border/50">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-foreground">{item.time}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1">{item.activity}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Day 2 */}
                  <Card className="p-8 mb-8">
                    <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
                      <Calendar className="h-6 w-6 text-primary" />
                      Dag 2 - Vliehors Express & Natuur
                    </h3>
                    <div className="space-y-4">
                      {threeDayProgram.day2.map((item, idx) => (
                        <div key={idx} className="flex gap-4 pb-4 border-b last:border-0 border-border/50">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-foreground">{item.time}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1">{item.activity}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Day 3 */}
                  <Card className="p-8">
                    <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
                      <Calendar className="h-6 w-6 text-primary" />
                      Dag 3 - Zeehonden & Vertrek
                    </h3>
                    <div className="space-y-4">
                      {threeDayProgram.day3.map((item, idx) => (
                        <div key={idx} className="flex gap-4 pb-4 border-b last:border-0 border-border/50">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-foreground">{item.time}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1">{item.activity}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Image Gallery */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-foreground">
              Impressie van Vlieland
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative h-[300px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={vlielandMorning} 
                  alt="Vlieland ochtend" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">Ochtendgloren op Vlieland</p>
                </div>
              </div>
              <div className="relative h-[300px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={vlielandBeach} 
                  alt="Vlieland strand" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">Het prachtige strand</p>
                </div>
              </div>
              <div className="relative h-[300px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={vlielandActivity} 
                  alt="Activiteiten op Vlieland" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">Teamactiviteiten</p>
                </div>
              </div>
              <div className="relative h-[300px] rounded-lg overflow-hidden shadow-lg group">
                <img 
                  src={vlielandGroup} 
                  alt="Groepsactiviteiten" 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold text-lg">Samen beleven</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Stel je eigen programma samen
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Deze programma's zijn slechts een voorbeeld. We maken graag een volledig op maat 
                gemaakt programma voor jullie team, inclusief RMD Trainingen of Mindset22 voor 
                diepgaande teamontwikkeling.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/#contact">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Vraag offerte aan
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
