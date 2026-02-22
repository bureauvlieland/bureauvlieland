import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { 
  Users, 
  MapPin, 
  Calendar, 
  Utensils, 
  Ship, 
  CheckCircle,
  ArrowRight
} from "lucide-react";

import heroImage from "@/assets/team-beach.jpg";

const BedrijfsuitjeVlieland = () => {
  const services = [
    { icon: Ship, text: "Vervoer van en naar het eiland" },
    { icon: MapPin, text: "Overnachtingen" },
    { icon: Calendar, text: "Programma-opbouw" },
    { icon: Users, text: "Activiteiten" },
    { icon: Utensils, text: "Catering" },
    { icon: CheckCircle, text: "Planning en begeleiding ter plaatse" },
  ];

  const voorbeelden = [
    "Teambuilding met inhoud en begeleiding",
    "Meerdaagse bedrijfsuitjes met overnachting",
    "Heisessies en strategiesessies",
    "Actieve programma's gecombineerd met rustmomenten",
    "Zakelijke evenementen op unieke locaties",
  ];

  return (
    <>
      <Helmet>
        <title>Bedrijfsuitje op Vlieland organiseren – Bureau Vlieland</title>
        <meta 
          name="description" 
          content="Een bedrijfsuitje op Vlieland dat klopt van A tot Z. Activiteiten, overnachting, catering en logistiek geregeld door lokale regisseurs." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/bedrijfsuitje-vlieland" />
        <meta property="og:title" content="Bedrijfsuitje op Vlieland organiseren – Bureau Vlieland" />
        <meta property="og:description" content="Een bedrijfsuitje op Vlieland dat klopt van A tot Z. Activiteiten, overnachting, catering en logistiek geregeld door lokale regisseurs." />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.png" />
        <meta property="og:url" content="https://bureauvlieland.nl/bedrijfsuitje-vlieland" />
        <meta property="og:type" content="website" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Bedrijfsuitje op Vlieland"
        serviceDescription="Een bedrijfsuitje op Vlieland dat klopt van A tot Z. Activiteiten, overnachting, catering en logistiek geregeld door lokale regisseurs."
        canonicalUrl="https://bureauvlieland.nl/bedrijfsuitje-vlieland"
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Bedrijfsuitje Vlieland", url: "https://bureauvlieland.nl/bedrijfsuitje-vlieland" }
        ]}
      />

      <Navigation />
      <LandingBreadcrumb items={[{ label: "Bedrijfsuitje Vlieland" }]} />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Team op het strand van Vlieland tijdens een bedrijfsuitje"
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Bedrijfsuitje op Vlieland
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95">
              Een bedrijfsuitje op Vlieland is geen standaard dagje uit. Het is samen loskomen 
              van de dagelijkse dynamiek, op een eiland waar rust, ruimte en aandacht vanzelf 
              ontstaan. Bureau Vlieland organiseert bedrijfsuitjes die verder gaan dan een 
              losse activiteit: inhoudelijk sterk, logistiek kloppend en volledig afgestemd 
              op jullie organisatie.
            </p>
          </div>
        </section>

        {/* Waarom Vlieland */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Waarom een bedrijfsuitje op Vlieland?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Vlieland is overzichtelijk, autoluw en ongedwongen. Juist daardoor ontstaat 
                ruimte voor echte aandacht. Geen afleiding, geen haast, maar tijd voor 
                samenwerking, reflectie en ontspanning. Of het nu gaat om een eendaags 
                programma of een{" "}
                <Link to="/meerdaags-bedrijfsuitje-vlieland" className="text-primary hover:underline font-medium">
                  meerdaags bedrijfsuitje met overnachting
                </Link>
                : het eiland dwingt tot vertraging – en dat werkt.
              </p>
            </div>
          </div>
        </section>

        {/* Wat voor bedrijfsuitjes */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Wat voor bedrijfsuitjes organiseren wij?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Bureau Vlieland organiseert bedrijfsuitjes voor teams en organisaties 
                die meer zoeken dan alleen vermaak. Denk aan een{" "}
                <Link to="/teamuitje-vlieland" className="text-primary hover:underline font-medium">
                  teamuitje gericht op samenwerking
                </Link>
                , een{" "}
                <Link to="/heisessie-vlieland" className="text-primary hover:underline font-medium">
                  heisessie voor focus en strategie
                </Link>
                , of een{" "}
                <Link to="/zakelijk-evenement-vlieland" className="text-primary hover:underline font-medium">
                  zakelijk evenement
                </Link>{" "}
                op unieke locaties.
              </p>
              
              <div className="space-y-4 mb-8">
                {voorbeelden.map((voorbeeld, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground">{voorbeeld}</span>
                  </div>
                ))}
              </div>
              
              <p className="text-lg font-medium text-foreground">
                Altijd op maat, altijd in samenhang. Op zoek naar inspiratie? Bekijk onze{" "}
                <Link to="/bedrijfsuitje-ideeen-vlieland" className="text-primary hover:underline">
                  ideeën voor een bedrijfsuitje op Vlieland
                </Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Alles geregeld */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6 text-center">
                Van idee tot uitvoering: alles geregeld
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Wij zijn geen aanbieder van losse activiteiten, maar de regisseur van het 
                totale programma. Dat betekent dat wij het volledige traject verzorgen:
              </p>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service, index) => (
                  <Card key={index} className="border-none shadow-sm bg-muted/30">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <service.icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-foreground font-medium">{service.text}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <p className="text-center text-lg font-medium text-foreground mt-10">
                Eén aanspreekpunt, korte lijnen, lokaal georganiseerd.
              </p>
            </div>
          </div>
        </section>

        {/* Waarom Bureau Vlieland */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Waarom Bureau Vlieland?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                Bureau Vlieland is gevestigd op Vlieland en werkt al jaren samen met lokale 
                partners. We kennen het eiland, de locaties en de logistiek. Daardoor kunnen 
                we snel schakelen, realistisch plannen en programma's bouwen die daadwerkelijk 
                uitvoerbaar zijn.
              </p>
              <p className="text-lg font-medium text-foreground">
                Geen standaard pakketten, geen verkooppraatjes, maar ervaring en overzicht.
              </p>
            </div>
          </div>
        </section>
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Klaar om te beginnen?
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
              Stel in 5 minuten uw eigen programma samen. Kies uw onderdelen en ontvang 
              binnen 5 werkdagen bevestiging. Vrijblijvend en zonder verplichtingen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg" 
                variant="heroPrimary"
                className="text-lg px-8"
              >
                <Link to="/programma-samenstellen">Stel uw programma samen</Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                variant="heroOutline"
                className="text-lg px-8"
              >
                <Link to="/contact">Liever persoonlijk advies?</Link>
              </Button>
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
                  to="/teamuitje-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Teamuitje Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/meerdaags-bedrijfsuitje-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Meerdaags bedrijfsuitje Vlieland</span>
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
                  to="/zakelijk-evenement-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Zakelijk evenement Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/bedrijfsuitje-ideeen-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Bedrijfsuitje ideeën Vlieland</span>
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

export default BedrijfsuitjeVlieland;
