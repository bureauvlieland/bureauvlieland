import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { 
  Building2, 
  Home, 
  Users, 
  Building,
  MapPin,
  CheckCircle,
  ArrowRight,
  Handshake,
  MessageSquare
} from "lucide-react";
import heroImage from "@/assets/vlieland-landscape.jpg";

const LogiesVlieland = () => {
  const accommodationTypes = [
    { 
      icon: Building2, 
      title: "Hotel",
      description: "Comfort en gemak in het dorp. Ideaal voor zakelijke groepen die ontzorging zoeken."
    },
    { 
      icon: Home, 
      title: "Vakantiehuis",
      description: "Privacy en huiselijke sfeer voor kleinere teams. Eigen keuken en woonruimte."
    },
    { 
      icon: Users, 
      title: "Groepsaccommodatie",
      description: "Ideaal voor grote groepen. Gezamenlijke ruimtes voor vergaderen en ontspannen."
    },
    { 
      icon: Building, 
      title: "Appartement",
      description: "Onafhankelijk verblijf met flexibiliteit. Geschikt voor teams die eigen regie willen."
    },
  ];

  const steps = [
    {
      step: 1,
      title: "Vul uw wensen in",
      description: "Datum, groepsgrootte en type accommodatie",
    },
    {
      step: 2,
      title: "Wij zoeken voor u",
      description: "Bureau Vlieland vraagt offertes aan bij geschikte accommodaties",
    },
    {
      step: 3,
      title: "Vergelijk offertes",
      description: "U ontvangt een overzicht van alle opties",
    },
    {
      step: 4,
      title: "Boek direct",
      description: "Kies uw favoriet en boek rechtstreeks bij de accommodatie",
    },
  ];

  const usps = [
    {
      icon: MapPin,
      title: "Lokale kennis",
      description: "Wij kennen alle accommodaties persoonlijk en weten wat bij uw groep past."
    },
    {
      icon: CheckCircle,
      title: "Vrijblijvend",
      description: "Geen verplichtingen tot u boekt. Vergelijk rustig alle opties."
    },
    {
      icon: MessageSquare,
      title: "Eén aanspreekpunt",
      description: "Wij regelen de communicatie met accommodaties. U hoeft niet zelf te bellen."
    },
    {
      icon: Handshake,
      title: "Gecombineerd boeken",
      description: "Combineer logies met activiteiten en catering voor een compleet programma."
    },
  ];

  return (
    <>
      <Helmet>
        <title>Logies op Vlieland voor groepen | Bureau Vlieland</title>
        <meta 
          name="description" 
          content="Zoek en vergelijk groepsaccommodaties op Vlieland. Hotels, vakantiehuizen en groepsverblijven - wij regelen de offertes, jij kiest." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl/logies-vlieland" />
        <meta property="og:title" content="Logies op Vlieland voor groepen | Bureau Vlieland" />
        <meta property="og:description" content="Zoek en vergelijk groepsaccommodaties op Vlieland. Hotels, vakantiehuizen en groepsverblijven - wij regelen de offertes, jij kiest." />
        <meta property="og:image" content="https://bureauvlieland.nl/og-image.png" />
        <meta property="og:url" content="https://bureauvlieland.nl/logies-vlieland" />
        <meta property="og:type" content="website" />
      </Helmet>
      <LandingPageStructuredData
        serviceName="Logies op Vlieland voor groepen"
        serviceDescription="Zoek en vergelijk groepsaccommodaties op Vlieland. Hotels, vakantiehuizen en groepsverblijven - wij regelen de offertes, jij kiest."
        canonicalUrl="https://bureauvlieland.nl/logies-vlieland"
        breadcrumbItems={[
          { name: "Home", url: "https://bureauvlieland.nl" },
          { name: "Logies Vlieland", url: "https://bureauvlieland.nl/logies-vlieland" }
        ]}
      />

      <Navigation />
      <LandingBreadcrumb items={[{ label: "Logies Vlieland" }]} />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Vlieland landschap - verblijf voor groepen"
              className="w-full h-full object-cover animate-ken-burns"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/70" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-20 text-center text-primary-foreground">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
              Logies op Vlieland voor groepen
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-95 mb-10">
              Op zoek naar een verblijf voor uw team of organisatie? Bureau Vlieland zoekt 
              en vergelijkt accommodaties voor u. Vrijblijvend, persoonlijk en met lokale kennis.
            </p>
            <Button 
              asChild 
              size="lg" 
              variant="heroPrimary"
              className="text-lg px-8"
            >
              <Link to="/logies-aanvragen">Vraag logies aan</Link>
            </Button>
          </div>
        </section>

        {/* Inleiding */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Wij zoeken, u kiest
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                Bureau Vlieland is gevestigd op het eiland en kent alle accommodaties persoonlijk. 
                Wij weten welke verblijven geschikt zijn voor welke groepen en kunnen snel schakelen 
                met lokale partners.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                U vult één keer uw wensen in. Wij doen het zoekwerk en vragen offertes aan bij 
                geschikte accommodaties. U ontvangt een overzicht om te vergelijken en boekt 
                rechtstreeks bij de accommodatie van uw keuze.
              </p>
            </div>
          </div>
        </section>

        {/* Accommodatietypes */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6 text-center">
                Accommodatietypes op Vlieland
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                Vlieland biedt diverse verblijfsopties voor groepen. Van luxe hotels tot ruime 
                groepsaccommodaties - er is altijd iets dat past.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                {accommodationTypes.map((type, index) => (
                  <Card key={index} className="border-none shadow-sm bg-card">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <type.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-lg mb-2">{type.title}</h3>
                          <p className="text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Hoe werkt het */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6 text-center">
                Hoe werkt het?
              </h2>
              <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
                In vier stappen van wens naar boeking - zonder gedoe.
              </p>
              
              <div className="grid md:grid-cols-4 gap-6">
                {steps.map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto mb-4 text-lg">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* USPs */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6 text-center">
                Waarom via Bureau Vlieland?
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6 mt-12">
                {usps.map((usp, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <usp.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{usp.title}</h3>
                      <p className="text-muted-foreground">{usp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Klaar om logies te zoeken?
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
              Vul uw wensen in en ontvang binnen enkele dagen offertes van geschikte 
              accommodaties. Vrijblijvend en zonder verplichtingen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg" 
                variant="heroPrimary"
                className="text-lg px-8"
              >
                <Link to="/logies-aanvragen">Vraag logies aan</Link>
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
                  to="/bedrijfsuitje-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Bedrijfsuitje Vlieland</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/meerdaags-bedrijfsuitje-vlieland" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Meerdaags bedrijfsuitje</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/programma-samenstellen" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Programma samenstellen</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link 
                  to="/catering" 
                  className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-foreground">Catering</span>
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

export default LogiesVlieland;
