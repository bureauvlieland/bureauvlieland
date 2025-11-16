import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, MapPin } from "lucide-react";
import teamActivityImage from "@/assets/team-activity.jpg";
import cyclingGroupImage from "@/assets/cycling-group.jpg";
import eventOutdoorImage from "@/assets/event-outdoor.jpg";
import { Link } from "react-router-dom";

const Voorbeeldprogrammas = () => {
  const programs = [
    {
      title: "Eendaags Teamuitje",
      duration: "1 dag",
      participants: "10-50 personen",
      image: cyclingGroupImage,
      description: "Perfect voor een dag vol teambuilding en ontspanning",
      schedule: [
        { time: "10:00", activity: "Aankomst en ontvangst met koffie" },
        { time: "10:30", activity: "Kennismakingsspel en teamindeling" },
        { time: "11:00", activity: "Fietstocht over het eiland met opdrachten" },
        { time: "13:00", activity: "Lunch bij strandpaviljoen" },
        { time: "14:30", activity: "Teamchallenge op het strand" },
        { time: "16:30", activity: "Afsluiting met borrel en evaluatie" },
        { time: "18:00", activity: "Vertrek" }
      ]
    },
    {
      title: "Tweedaags Programma",
      duration: "2 dagen / 1 nacht",
      participants: "15-40 personen",
      image: teamActivityImage,
      description: "Intensief programma met overnachting voor diepgaande teamontwikkeling",
      schedule: [
        { time: "Dag 1 - 11:00", activity: "Aankomst en lunch" },
        { time: "13:00", activity: "Mindset workshop: Persoonlijke & teamprestaties" },
        { time: "15:30", activity: "Outdoor teamactiviteit" },
        { time: "18:00", activity: "Check-in accommodatie" },
        { time: "19:00", activity: "Diner in groepsverband" },
        { time: "21:00", activity: "Avondprogramma: Teamspel of vrije tijd" },
        { time: "Dag 2 - 09:00", activity: "Ontbijt" },
        { time: "10:00", activity: "Workshop communicatie & samenwerking" },
        { time: "12:30", activity: "Lunch" },
        { time: "14:00", activity: "Evaluatie en terugblik" },
        { time: "15:30", activity: "Vertrek" }
      ]
    },
    {
      title: "Driedaags Programma",
      duration: "3 dagen / 2 nachten",
      participants: "20-50 personen",
      image: eventOutdoorImage,
      description: "Compleet programma voor maximale impact en teamontwikkeling",
      schedule: [
        { time: "Dag 1 - 14:00", activity: "Aankomst en ontvangst" },
        { time: "15:00", activity: "Kennismakingsprogramma en check-in" },
        { time: "17:00", activity: "Opening met uitleg programma" },
        { time: "18:30", activity: "Diner" },
        { time: "20:00", activity: "Kennismakingsspel en groepsvorming" },
        { time: "Dag 2 - 09:00", activity: "Ontbijt" },
        { time: "10:00", activity: "RMD Programma: Focus op gedrag en mindset" },
        { time: "12:30", activity: "Lunch" },
        { time: "14:00", activity: "Outdoor activiteiten met teamchallenges" },
        { time: "18:00", activity: "Vrije tijd" },
        { time: "19:00", activity: "Groepsdiner" },
        { time: "21:00", activity: "Gezamenlijke avond" },
        { time: "Dag 3 - 09:00", activity: "Ontbijt" },
        { time: "10:00", activity: "Evaluatie en verwerking" },
        { time: "12:00", activity: "Lunch" },
        { time: "13:30", activity: "Afsluiting en actiepunten" },
        { time: "15:00", activity: "Vertrek" }
      ]
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${teamActivityImage})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
          </div>
          <div className="relative z-10 text-center text-white px-4">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Voorbeeldprogramma's
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8">
              Inspiratie voor jouw teamuitje op Vlieland
            </p>
          </div>
        </section>

        {/* Introduction */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Op maat gemaakte programma's
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Hieronder vind je drie voorbeeldprogramma's die je volledig kunt 
                aanpassen aan de wensen van jouw team. Elk programma is zorgvuldig 
                samengesteld om optimale resultaten te behalen.
              </p>
              <p className="text-lg text-muted-foreground">
                Of je nu kiest voor een compact eendaags programma of een uitgebreid 
                driedaags traject, we stemmen alles af op jullie doelstellingen en 
                groepsgrootte.
              </p>
            </div>
          </div>
        </section>

        {/* Programs */}
        {programs.map((program, index) => (
          <section 
            key={index}
            className={index % 2 === 0 ? "py-16 bg-muted/30" : "py-16 bg-background"}
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
              <Card className="overflow-hidden">
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="relative h-[300px] md:h-auto">
                    <img 
                      src={program.image} 
                      alt={program.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-8">
                    <CardHeader className="p-0 mb-6">
                      <CardTitle className="text-3xl mb-2">{program.title}</CardTitle>
                      <CardDescription className="text-base">
                        {program.description}
                      </CardDescription>
                      <div className="flex flex-wrap gap-4 mt-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-5 w-5 text-primary" />
                          <span>{program.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-5 w-5 text-primary" />
                          <span>{program.participants}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <h3 className="font-semibold text-lg mb-4 text-foreground">
                        Programma overzicht:
                      </h3>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {program.schedule.map((item, idx) => (
                          <div key={idx} className="flex gap-3 text-sm">
                            <span className="font-semibold text-primary shrink-0 w-24">
                              {item.time}
                            </span>
                            <span className="text-muted-foreground">{item.activity}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        ))}

        {/* Customization Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <Card className="text-center p-6">
                <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-xl mb-2">Flexibele Locaties</h3>
                <p className="text-muted-foreground">
                  Van strand tot bos, we maken gebruik van de unieke locaties op Vlieland
                </p>
              </Card>
              <Card className="text-center p-6">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-xl mb-2">Voor Elke Groep</h3>
                <p className="text-muted-foreground">
                  Programma's geschikt voor kleine tot grote teams met verschillende doelen
                </p>
              </Card>
              <Card className="text-center p-6">
                <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-xl mb-2">Op Maat</h3>
                <p className="text-muted-foreground">
                  Elk programma wordt aangepast aan jullie specifieke wensen en timing
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Stel jouw ideale programma samen
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Deze voorbeelden zijn slechts het begin. Samen met jou stellen we het 
                perfecte programma samen dat aansluit bij de doelen en wensen van jouw team.
              </p>
              <Link to="/#contact">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Plan een gesprek
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

export default Voorbeeldprogrammas;