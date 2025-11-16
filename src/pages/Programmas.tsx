import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Target, Users, Brain, TrendingUp } from "lucide-react";
import teamActivityImage from "@/assets/team-activity.jpg";
import cyclingGroupImage from "@/assets/cycling-group.jpg";
import { Link } from "react-router-dom";

const Programmas = () => {
  const rmdFeatures = [
    "Bewustwording en inzicht in gedrag en prestaties",
    "Vergroten van zelfkennis en persoonlijk leiderschap",
    "Maken van nieuwe en betere keuzes",
    "Meer plezier in werk, studie of sport",
    "Optimaliseren van management- en leidinggevende kwaliteiten",
    "Doelgerichter en pragmatischer werken"
  ];

  const rmdMetaphors = [
    "Krijgskunsten: Aikido en Braziliaans Jiu Jitsu",
    "Dieren als spiegel: paarden, schapen, honden en roofvogels",
    "Outdoor & reizen: Franse Pyreneeën, Zweden, IJsland en de Sinai",
    "Organisatieopstellingen, ademwerk, mindfulness en voice dialogue"
  ];

  const rmdPhases = [
    { title: "Basis", description: "Ontdek je referentiekader en durf daar uit te stappen" },
    { title: "Bezinnen", description: "Reflecteren en relativeren" },
    { title: "Bouwen", description: "Doen, oefenen en ervaren" },
    { title: "Bewegen", description: "Kom in beweging! Lichaamsbewustzijn, fysiologie en geest zijn verbonden" },
    { title: "Belonen", description: "Wat werkt voor jou en hoe veranker je dit?" }
  ];

  const mindsetFeatures = [
    "Bewustwording van vaste sets van gewoontes en overtuigingen (meestal onbewust)",
    "Ontwikkelen van positieve, op groei gerichte denkpatronen en gedragingen",
    "Mogelijk maken van een groeimindset",
    "Inzicht in open versus gesloten mindset",
    "Ondersteuning voor individuen én groepen",
    "Begeleiding door professionals met ervaring in Defensie en topsport (voetbal op hoog niveau)"
  ];

  const mindsetValues = ["SAMENWERKING", "VERTROUWEN", "MOED"];

  const combinedBenefits = [
    {
      icon: <Target className="h-8 w-8 text-primary" />,
      title: "Vlieland als Unieke Setting",
      description: "Bureau Vlieland combineert beide programma's op het inspirerende waddeneiland, waar rust en ruimte zorgen voor maximale focus."
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Lokale Expertise",
      description: "Als lokale partner organiseren wij de perfecte mix van trainingen, accommodatie en eilandactiviteiten voor jouw team."
    },
    {
      icon: <Brain className="h-8 w-8 text-primary" />,
      title: "Ervaring + Mindset",
      description: "RMD's ervaringsgerichte aanpak gecombineerd met Mindset22's focus op groeimentaliteit zorgt voor duurzame verandering."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Maatwerk Programma's",
      description: "Van eendaagse workshops tot meerdaagse intensieve trajecten, volledig afgestemd op jouw organisatie en doelen."
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
              RMD & Mindset 22
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8">
              Bewezen programma's voor teamontwikkeling en prestatieverbetering
            </p>
          </div>
        </section>

        {/* Introduction */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Transformatieve programma's op Vlieland
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Bureau Vlieland brengt twee krachtige partners samen op het inspirerende waddeneiland. 
                <strong> RMD Trainingen</strong>, onder leiding van Richard Melvin Dijkstra, biedt sinds 1999 
                ervaringsgerichte programma's op het gebied van persoonlijk leiderschaps- en teamtrainingen, 
                coaching, counseling en consultancy.
              </p>
              <p className="text-lg text-muted-foreground mb-4">
                <strong> Mindset22</strong>, met Simon Brilstra en Richard Leegte, helpt individuen en groepen 
                hun volledige talenten te benutten door positieve, op groei gerichte denkpatronen te ontwikkelen. 
                Beide professionals brengen ervaring mee uit Defensie en topsport.
              </p>
              <p className="text-lg text-muted-foreground">
                De unieke setting van Vlieland versterkt de impact van beide programma's. Bureau Vlieland zorgt 
                voor de lokale organisatie en combineert trainingen met de rust en inspiratie van het eiland.
              </p>
            </div>
          </div>
        </section>

        {/* Programs Tabs */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <Tabs defaultValue="rmd" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-12">
                <TabsTrigger value="rmd" className="text-base">RMD Programma</TabsTrigger>
                <TabsTrigger value="mindset" className="text-base">Mindset 22</TabsTrigger>
              </TabsList>

              <TabsContent value="rmd">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                      RMD Trainingen - Ervaringsgerichte Ontwikkeling
                    </h2>
                    <p className="text-lg text-muted-foreground mb-6">
                      Richard Melvin Dijkstra is sinds 1999 werkzaam in de wereld van ervaringsgerichte trainingen. 
                      Met zijn expertise in persoonlijke ontwikkeling, leiderschap en teamleiderschap begeleidt hij 
                      deelnemers om ervaringen op te doen op fysiek, mentaal, emotioneel en spiritueel vlak.
                    </p>
                    <p className="text-lg text-muted-foreground mb-6">
                      RMD maakt gebruik van unieke locaties in de buitenlucht en krachtige metaforen. Een veilige 
                      manier om gespiegeld te worden en tot nieuwe inzichten te komen. Richard is houder van de 
                      derde graad zwarte band in Aikido en zwarte band in Braziliaans Jiu Jitsu.
                    </p>
                    
                    <h3 className="font-semibold text-xl mb-4 text-foreground">Werkvormen & Metaforen</h3>
                    <ul className="space-y-3 mb-6">
                      {rmdMetaphors.map((metaphor, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{metaphor}</span>
                        </li>
                      ))}
                    </ul>

                    <h3 className="font-semibold text-xl mb-4 text-foreground">De 5 Fases</h3>
                    <div className="space-y-3 mb-6">
                      {rmdPhases.map((phase, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">{idx + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{phase.title}</h4>
                            <p className="text-sm text-muted-foreground">{phase.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <h3 className="font-semibold text-xl mb-4 text-foreground">Wat levert het op?</h3>
                    <ul className="space-y-3">
                      {rmdFeatures.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="relative h-[600px] rounded-lg overflow-hidden shadow-lg">
                    <img 
                      src={cyclingGroupImage} 
                      alt="RMD Team Training" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mindset">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="order-2 md:order-1 relative h-[600px] rounded-lg overflow-hidden shadow-lg">
                    <img 
                      src={teamActivityImage} 
                      alt="Mindset 22 Training" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="order-1 md:order-2">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                      Mindset22 - Groeimentaliteit
                    </h2>
                    <p className="text-lg text-muted-foreground mb-6">
                      Hetgeen een mens doet wordt bepaald door de 'mindset' - een vaste set van 
                      gewoontes en overtuigingen, meestal onbewust. De manier waarop de mindset 
                      (open danwel gesloten) is ontwikkeld, bepaalt het handelen. Het goede èn het slechte handelen.
                    </p>
                    <p className="text-lg text-muted-foreground mb-6">
                      Simon Brilstra (1976) en Richard Leegte (1970) hebben een individueel als mede een 
                      gezamenlijk verleden binnen Defensie en de civiele maatschappij. Daarnaast delen ze veel 
                      ervaringen op sportief vlak (voetbal op hoog niveau). Bij Mindset22 vind je de juiste 
                      begeleiding van professionals die weten wat het is om doelen fysiek en mentaal te bereiken.
                    </p>

                    <h3 className="font-semibold text-xl mb-4 text-foreground">Kernwaarden</h3>
                    <div className="flex gap-3 mb-6">
                      {mindsetValues.map((value, idx) => (
                        <div key={idx} className="px-4 py-2 bg-primary/10 rounded-lg">
                          <span className="font-semibold text-primary">{value}</span>
                        </div>
                      ))}
                    </div>

                    <h3 className="font-semibold text-xl mb-4 text-foreground">Wat levert het op?</h3>
                    <ul className="space-y-3">
                      {mindsetFeatures.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Combined Benefits */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Bureau Vlieland: De Verbindende Factor
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Als lokale specialist op Vlieland brengen wij RMD Trainingen en Mindset22 samen 
                op het eiland. We zorgen voor de perfecte setting waarin deze krachtige programma's 
                tot hun recht komen: van accommodatie en catering tot unieke eilandactiviteiten.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {combinedBenefits.map((benefit, index) => (
                <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-center mb-4">
                    {benefit.icon}
                  </div>
                  <h3 className="font-semibold text-xl mb-3 text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {benefit.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Implementation */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center text-foreground">
                Hoe organiseren wij dit?
              </h2>
              <Card className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-xl mb-3 text-foreground">1. Kennismakingsgesprek</h3>
                    <p className="text-muted-foreground">
                      We starten met een gesprek om jouw doelen, teamsamenstelling en wensen te bespreken. 
                      Op basis daarvan adviseren we welk programma (RMD, Mindset22 of een combinatie) het 
                      beste past bij jullie organisatie.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-3 text-foreground">2. Maatwerk Programma</h3>
                    <p className="text-muted-foreground">
                      Bureau Vlieland stelt een compleet programma samen: van accommodatie bij Hotel Zeezicht 
                      tot activiteiten zoals de Vliehors Expres, fietstochten, en RIB-boottouren. Inclusief 
                      catering en alle logistiek op het eiland.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-3 text-foreground">3. Uitvoering op Vlieland</h3>
                    <p className="text-muted-foreground">
                      De trainers van RMD en/of Mindset22 verzorgen hun programma in de unieke setting van 
                      Vlieland. De rust en inspirerende omgeving van het eiland versterken de impact van 
                      de trainingen.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-3 text-foreground">4. Nazorg & Follow-up</h3>
                    <p className="text-muted-foreground">
                      Na afloop zorgen we voor evaluatie en mogelijke follow-up sessies. Optioneel kunnen 
                      deelnemers terugkeren naar Vlieland voor verdiepingssessies of teambuilding.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Breng jouw team naar een hoger niveau
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Ontdek hoe Bureau Vlieland, samen met RMD Trainingen en Mindset22, jouw team 
                kan transformeren. Neem contact op voor een vrijblijvend gesprek over de mogelijkheden 
                en laat je inspireren door onze voorbeeldprogramma's.
              </p>
              <Link to="/#contact">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Neem contact op
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

export default Programmas;