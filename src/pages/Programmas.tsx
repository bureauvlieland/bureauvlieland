import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Handshake, MapPin, Users, Utensils, Truck, Package, UserCheck } from "lucide-react";
import { Helmet } from "react-helmet";
import rmdBeachTraining from "@/assets/rmd-beach-training.jpg";
import mindset22Indoor from "@/assets/mindset22-indoor.jpg";
import rmdBeachGroup from "@/assets/rmd-beach-group.jpg";
import vlielandBeachGolf from "@/assets/vlieland-beach-golf.jpg";
import { Link } from "react-router-dom";
import { useKenBurns } from "@/hooks/use-ken-burns";

const Programmas = () => {
  const kenBurns = useKenBurns();
  
  const partnerServices = [
    {
      icon: <MapPin className="h-8 w-8 text-primary" />,
      title: "Lokale kennis",
      description: "Wij kennen alle locaties, leveranciers en mogelijkheden op Vlieland. Van vergaderruimtes tot strandlocaties."
    },
    {
      icon: <Truck className="h-8 w-8 text-primary" />,
      title: "Logistiek & transport",
      description: "Transfers, fietsen, busjes en materiaalvervoer. Alles geregeld zonder dat jullie je zorgen hoeven te maken."
    },
    {
      icon: <Utensils className="h-8 w-8 text-primary" />,
      title: "Catering",
      description: "Van ontbijt tot diner, van strandborrel tot walking dinner. Onze cateringpartners leveren topkwaliteit."
    },
    {
      icon: <Package className="h-8 w-8 text-primary" />,
      title: "Materiaal & faciliteiten",
      description: "Tenten, meubilair, AV-apparatuur, flipovers – alles wat jullie nodig hebben voor een geslaagd programma."
    },
    {
      icon: <UserCheck className="h-8 w-8 text-primary" />,
      title: "Begeleiding",
      description: "Lokale gidsen en coördinatie op de dag zelf. Wij zijn de ogen en handen op het eiland."
    },
    {
      icon: <Handshake className="h-8 w-8 text-primary" />,
      title: "White-label",
      description: "Jullie naam, onze handen. Wij werken op de achtergrond zodat jullie relatie met de klant centraal blijft."
    }
  ];

  const partnerBenefits = [
    "Geen overhead van een eigen kantoor op Vlieland",
    "Toegang tot ons netwerk van betrouwbare leveranciers",
    "Flexibele samenwerking: per project of structureel",
    "Transparante prijsopbouw voor doorberekening",
    "Snelle respons en korte lijnen",
    "Ervaring met groepen van 10 tot 150 personen"
  ];

  const targetGroups = [
    {
      title: "Evenementenbureaus",
      description: "Je hebt een klant die naar Vlieland wil, maar geen lokale kennis. Wij zijn je verlengstuk op het eiland."
    },
    {
      title: "Trainers & coaches",
      description: "Jij levert de inhoud, wij de setting. Focus op je training terwijl wij alles eromheen regelen."
    },
    {
      title: "Incentive-bureaus",
      description: "Een bijzondere beloning voor een team? Wij maken van Vlieland een onvergetelijke ervaring."
    }
  ];

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Samenwerken met Bureau Vlieland | Lokale Partner op Vlieland</title>
        <meta 
          name="description" 
          content="Lokale partner voor evenementenbureaus, trainers en coaches op Vlieland. Wij verzorgen logistiek, catering en coördinatie. Jullie de inhoud, wij de uitvoering." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/samenwerken" />
        <meta property="og:title" content="Samenwerken met Bureau Vlieland | Lokale Partner" />
        <meta property="og:description" content="Lokale partner voor evenementenbureaus, trainers en coaches op Vlieland. Logistiek, catering en coördinatie uit één hand." />
        <meta property="og:url" content="https://bureauvlieland.nl/samenwerken" />
      </Helmet>
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${rmdBeachTraining})`,
              ...kenBurns
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
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

          <div className="relative z-10 text-center text-white px-4">
            <p className="text-sm uppercase tracking-widest mb-4 text-white/80">Voor professionals</p>
            <h1 className="text-5xl md:text-6xl font-display font-bold mb-6">
              Samenwerken met Bureau Vlieland
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8">
              Lokale partner voor evenementenbureaus, trainers en coaches
            </p>
          </div>
        </section>

        {/* Introduction */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-foreground">
                Jullie de inhoud, wij de uitvoering
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Bureau Vlieland werkt samen met professionals die hun klanten of deelnemers naar 
                Vlieland willen brengen. Als lokale partner leveren wij de kennis, logistiek en 
                uitvoering op het eiland – zodat jullie je kunnen focussen op wat jullie het beste doen.
              </p>
              <p className="text-lg text-muted-foreground">
                Of het nu gaat om een eenmalig project of een structurele samenwerking: wij zijn 
                jullie betrouwbare verlengstuk op Vlieland.
              </p>
            </div>
          </div>
        </section>

        {/* Partner Services */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-foreground">
                Wat wij voor partners betekenen
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Van accommodatie tot catering, van transport tot begeleiding – wij ontzorgen volledig
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {partnerServices.map((service, index) => (
                <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-center mb-4">
                    {service.icon}
                  </div>
                  <h3 className="font-semibold text-xl mb-3 text-foreground">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {service.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-foreground">
                  Voordelen van samenwerking
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Waarom kiezen evenementenbureaus, trainers en coaches voor Bureau Vlieland als lokale partner?
                </p>
                <ul className="space-y-4">
                  {partnerBenefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <div className="relative h-[350px] rounded-lg overflow-hidden shadow-lg">
                  <img 
                    src={rmdBeachGroup} 
                    alt="Samenwerking met Bureau Vlieland" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="relative h-[230px] rounded-lg overflow-hidden shadow-lg">
                  <img 
                    src={vlielandBeachGolf} 
                    alt="Activiteit op het strand van Vlieland" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Target Groups */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-foreground">
                Voor wie is dit interessant?
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {targetGroups.map((group, index) => (
                <Card key={index} className="p-6">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{group.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground">{group.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Examples Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-foreground">
                Voorbeelden van samenwerkingen
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Bureau Vlieland werkt al jaren samen met trainers en coaches. Hier zijn twee voorbeelden van hoe zo'n samenwerking eruitziet.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="overflow-hidden">
                <div className="relative h-[250px]">
                  <img 
                    src={rmdBeachGroup} 
                    alt="RMD Trainingen op Vlieland" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl">RMD Trainingen</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    RMD Trainingen biedt ervaringsgerichte programma's voor leiderschaps- en teamtrainingen. 
                    Bureau Vlieland verzorgt de lokale organisatie: accommodatie, catering, transport en 
                    eilandactiviteiten. RMD levert de inhoud, wij de setting.
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    "De samenwerking met Bureau Vlieland zorgt ervoor dat wij ons volledig kunnen focussen 
                    op de training. De logistiek is in vertrouwde handen."
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <div className="relative h-[250px]">
                  <img 
                    src={mindset22Indoor} 
                    alt="Mindset22 sessie op Vlieland" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl">Mindset22</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Mindset22 helpt teams en individuen hun talenten te benutten door positieve, op groei 
                    gerichte denkpatronen te ontwikkelen. Vlieland biedt de perfecte setting voor focus en 
                    verdieping, Bureau Vlieland regelt de rest.
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    "Op Vlieland is er ruimte om écht na te denken. Bureau Vlieland maakt het praktisch mogelijk."
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                Laten we kennismaken
              </h2>
              <p className="text-lg mb-8 text-primary-foreground/90">
                Wil je verkennen hoe Bureau Vlieland jouw lokale partner kan zijn? 
                Neem contact op voor een vrijblijvend gesprek over de mogelijkheden.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/contact">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                    Neem contact op
                  </Button>
                </Link>
                <Link to="/bouwstenen">
                  <Button size="lg" variant="outline" className="border-white text-white bg-white/10 hover:bg-white hover:text-primary">
                    Bekijk onze bouwstenen
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

export default Programmas;