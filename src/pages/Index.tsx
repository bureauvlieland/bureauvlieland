import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { StructuredData } from "@/components/StructuredData";
import { CookieConsent } from "@/components/CookieConsent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Testimonials } from "@/components/Testimonials";
import { Helmet } from "react-helmet";
import heroImage from "@/assets/hero-vlieland.jpg";
import { Calendar, Users, Utensils, Target } from "lucide-react";

const Index = () => {
  const services = [
    {
      icon: <Target className="h-10 w-10 text-primary" />,
      title: "Wat wij doen",
      description: "Maatwerkprogramma's met professionele regie, lokale begeleiding en hoogwaardige catering op Vlieland.",
      link: "/diensten",
      cta: "Ontdek onze diensten"
    },
    {
      icon: <Users className="h-10 w-10 text-primary" />,
      title: "Voor wie",
      description: "Voor zakelijke teams, familie- en vriendengroepen die kwaliteit en professionele organisatie centraal stellen.",
      link: "/voor-wie",
      cta: "Lees meer"
    },
    {
      icon: <Calendar className="h-10 w-10 text-primary" />,
      title: "Programma's",
      description: "Transformatieve programma's met onze partners RMD Trainingen en Mindset22 voor teamontwikkeling en persoonlijk leiderschap.",
      link: "/programmas",
      cta: "Bekijk programma's"
    },
    {
      icon: <Utensils className="h-10 w-10 text-primary" />,
      title: "Catering",
      description: "Van beachbarbecues tot fine dining - professionele catering op unieke locaties op Vlieland.",
      link: "/catering",
      cta: "Ontdek catering"
    }
  ];

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Bureau Vlieland – Professionele evenementen en teamuitjes op Vlieland</title>
        <meta 
          name="description" 
          content="Bureau Vlieland organiseert professionele bedrijfsuitjes, teamdagen en evenementen op Vlieland. Maatwerkprogramma's met lokale regie en catering." 
        />
        <link rel="canonical" href="https://bureauvlieland.nl" />
        <meta property="og:title" content="Bureau Vlieland – Professionele evenementen op Vlieland" />
        <meta property="og:description" content="Organiseer uw teamdag, bedrijfsuitje of evenement op Vlieland met Bureau Vlieland. Professionele regie, lokale expertise." />
        <meta property="og:url" content="https://bureauvlieland.nl" />
        <meta property="og:type" content="website" />
      </Helmet>
      <StructuredData />
      <CookieConsent />
      <Navigation />
      <main id="main-content">
        {/* Hero Section */}
        <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Professionele catering en evenementen op Vlieland met vuurtoren op de achtergrond"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
          </div>

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

          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-20">
            <div className="max-w-3xl">
              <p className="text-xs sm:text-sm uppercase tracking-[0.18em] text-primary-foreground/80 mb-3 font-medium">
                Professionele evenementen op Vlieland
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
                Onvergetelijke ervaringen op het eiland
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-primary-foreground/90 mb-4 leading-relaxed max-w-2xl">
                Bureau Vlieland organiseert eendaagse en meerdaagse programma's, teamdagen en events voor groepen op Vlieland.
              </p>
              <p className="text-sm sm:text-base text-primary-foreground/80 mb-8 max-w-xl">
                Onder leiding van Erwin Soolsma combineren we professionele inhoud met lokale regie, gidsen en catering.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/contact">
                  <Button
                    size="lg"
                    className="bg-card text-primary hover:bg-card/90 shadow-medium text-base px-8"
                  >
                    Neem contact op
                  </Button>
                </Link>
                <Link to="/diensten">
                  <Button
                    size="lg"
                    className="bg-background text-primary hover:bg-background/90 shadow-medium text-base px-8"
                  >
                    Ontdek onze diensten
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Services Overview */}
        <section className="py-16 sm:py-20 lg:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Wat wij bieden
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
                Van professionele teamdagen tot transformatieve programma's en hoogwaardige catering - 
                alles onder één regie op Vlieland.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {services.map((service, index) => (
                <Card key={index} className="border-border hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="mb-4">
                      {service.icon}
                    </div>
                    <CardTitle className="text-2xl mb-3">{service.title}</CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to={service.link}>
                      <Button variant="outline" className="w-full">
                        {service.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <Testimonials />

        {/* CTA Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Klaar voor een onvergetelijk programma?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Neem contact op voor een vrijblijvend gesprek over de mogelijkheden voor jouw groep op Vlieland.
              </p>
              <Link to="/contact">
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

export default Index;
