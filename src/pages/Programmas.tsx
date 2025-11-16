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
    "Inzicht in je eigen gedragsprofiel en dat van anderen",
    "Verbeteren van communicatie door bewust afstemmen",
    "Herkenning van gedragspatronen in verschillende situaties",
    "Effectiever omgaan met collega's en klanten",
    "Praktische tools direct toepasbaar in dagelijkse praktijk",
    "Vergroten van zelfinzicht en begrip voor anderen"
  ];

  const mindsetFeatures = [
    "Bewustwording van denk- en gedragspatronen",
    "Ontwikkelen van een growth mindset",
    "Versterken van veerkracht en mentale weerbaarheid",
    "Effectieve doelstellingstechnieken",
    "Omgaan met verandering en onzekerheid",
    "Persoonlijke en team effectiviteit verhogen"
  ];

  const combinedBenefits = [
    {
      icon: <Target className="h-8 w-8 text-primary" />,
      title: "Gedrag + Mindset",
      description: "De combinatie van RMD en Mindset 22 zorgt voor diepgaande verandering op zowel gedrag als denkwijze niveau."
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Team Transformatie",
      description: "Versterk niet alleen individuele competenties maar ook de teamdynamiek en onderlinge samenwerking."
    },
    {
      icon: <Brain className="h-8 w-8 text-primary" />,
      title: "Duurzaam Effect",
      description: "Door bewustwording en concrete tools zorg je voor blijvende impact op persoonlijk en teamniveau."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Meetbare Resultaten",
      description: "Concreet zichtbare verbeteringen in communicatie, samenwerking en prestaties van het team."
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
                Krachtige combinatie voor maximale impact
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Bureau Vlieland werkt met twee krachtige programma's die teams transformeren. 
                RMD (Rood, Geel, Groen, Blauw) gebaseerd op het DISC model geeft direct 
                inzicht in gedragspatronen en communicatiestijlen. Mindset 22 focust op 
                mentale weerbaarheid en groeimentaliteit.
              </p>
              <p className="text-lg text-muted-foreground">
                De combinatie van beide programma's zorgt voor duurzame verandering 
                op zowel individueel als teamniveau.
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
                      RMD - Gedragsprofielen
                    </h2>
                    <p className="text-lg text-muted-foreground mb-6">
                      RMD is gebaseerd op het DISC model en staat voor Rood, Geel, Groen en 
                      Blauw - vier verschillende gedragsprofielen die inzicht geven in hoe mensen 
                      communiceren en gedragen. Het helpt niet om mensen in hokjes te plaatsen, 
                      maar juist om inzicht te geven in gedragspatronen en hoe je daarop kunt 
                      afstemmen voor betere communicatie en samenwerking.
                    </p>
                    <div className="space-y-4 mb-8">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-500 shrink-0 mt-1" />
                        <div>
                          <h4 className="font-semibold mb-1 text-foreground">Rood - Dominant</h4>
                          <p className="text-sm text-muted-foreground">Direct, assertief en doortastend. Vurig en pittig karakter.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-yellow-500 shrink-0 mt-1" />
                        <div>
                          <h4 className="font-semibold mb-1 text-foreground">Geel - Invloed</h4>
                          <p className="text-sm text-muted-foreground">Enthousiast, spontaan en openhartig. Zonnig en stralend karakter.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500 shrink-0 mt-1" />
                        <div>
                          <h4 className="font-semibold mb-1 text-foreground">Groen - Stabiliteit</h4>
                          <p className="text-sm text-muted-foreground">Kalm, stabiel en dienstbaar. Zacht en aards karakter.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 shrink-0 mt-1" />
                        <div>
                          <h4 className="font-semibold mb-1 text-foreground">Blauw - Conformisme</h4>
                          <p className="text-sm text-muted-foreground">Nauwkeurig, onderzoekend en analytisch. IJshelder karakter.</p>
                        </div>
                      </div>
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
                  <div className="relative h-[500px] rounded-lg overflow-hidden shadow-lg">
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
                  <div className="order-2 md:order-1 relative h-[500px] rounded-lg overflow-hidden shadow-lg">
                    <img 
                      src={teamActivityImage} 
                      alt="Mindset 22 Training" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="order-1 md:order-2">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                      Mindset 22 - Mentale Weerbaarheid
                    </h2>
                    <p className="text-lg text-muted-foreground mb-6">
                      Mindset 22 is een programma dat focust op het ontwikkelen van een 
                      growth mindset en mentale weerbaarheid. Het helpt teams en individuen 
                      om effectiever om te gaan met uitdagingen, veranderingen en druk.
                    </p>
                    <p className="text-lg text-muted-foreground mb-6">
                      Door bewustwording van denk- en gedragspatronen leer je hoe je je 
                      mindset kunt verschuiven van limiterende overtuigingen naar een 
                      groeimentaliteit die kansen ziet in plaats van obstakels.
                    </p>
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
                Waarom de combinatie zo krachtig is
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                RMD en Mindset 22 versterken elkaar. Waar RMD inzicht geeft in gedrag, 
                zorgt Mindset 22 voor de mentale basis om dit gedrag ook daadwerkelijk 
                te kunnen veranderen.
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
                Hoe wordt het toegepast?
              </h2>
              <Card className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-xl mb-3 text-foreground">1. Voorbereiding</h3>
                    <p className="text-muted-foreground">
                      Intake gesprek om doelen en verwachtingen in kaart te brengen. 
                      Deelnemers vullen vooraf vragenlijsten in voor persoonlijke profielen.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-3 text-foreground">2. Workshop Dag</h3>
                    <p className="text-muted-foreground">
                      Interactieve sessies waarin theorie, praktijk en persoonlijke inzichten 
                      samenkomen. Met concrete oefeningen en groepsopdrachten.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-3 text-foreground">3. Praktijkopdrachten</h3>
                    <p className="text-muted-foreground">
                      Tijdens outdoor activiteiten worden de geleerde inzichten direct 
                      toegepast in realistische teamsituaties.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-3 text-foreground">4. Evaluatie & Verankering</h3>
                    <p className="text-muted-foreground">
                      Reflectie op het geleerde en concrete actiepunten voor de praktijk. 
                      Optioneel: follow-up sessies voor duurzame borging.
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
                Klaar voor transformatie?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Ontdek hoe RMD en Mindset 22 jouw team naar een hoger niveau kunnen tillen. 
                Plan een vrijblijvend gesprek om de mogelijkheden te bespreken.
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

export default Programmas;