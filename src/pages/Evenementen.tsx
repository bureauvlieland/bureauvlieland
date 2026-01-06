import { Helmet } from "react-helmet";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ExternalLink } from "lucide-react";
import vuurtorenloopImage from "@/assets/vuurtorenloop.jpg";
import amuseTourImage from "@/assets/amuse-tour.jpg";
import bockbiertochtImage from "@/assets/bockbiertocht2.jpg";
import stappenHappenImage from "@/assets/stappen-en-happen.jpg";
import { Link } from "react-router-dom";

const Evenementen = () => {
  return (
    <>
      <Helmet>
        <title>Evenementen op Vlieland | Bureau Vlieland</title>
        <meta 
          name="description" 
          content="Ontdek de mooiste evenementen op Vlieland: van de Vuurtorenloop hardloopfeest tot de culinaire Amusetour. Bureau Vlieland organiseert uw deelname."
        />
      </Helmet>

      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-[40vh] flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent-soft/30 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-6">
            Evenementen op Vlieland
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Ontdek de mooiste evenementen die Vlieland te bieden heeft. Van sportief tot culinair - 
            Bureau Vlieland helpt u bij de perfecte evenementbeleving.
          </p>
        </div>
      </section>

      {/* Vuurtorenloop Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-4">
                <span className="text-sm font-semibold text-primary">19 april 2026</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Vuurtorenloop Vlieland
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Het hardloopfeest Vuurtorenloop Vlieland is <strong>MOOI ZWAAR!</strong> Een unieke 
                hardloopervaring langs de prachtige stranden en door de natuur van Vlieland. 
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Datum</p>
                    <p className="text-muted-foreground">Zondag 19 april 2026</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Locatie</p>
                    <p className="text-muted-foreground">Vlieland</p>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground mb-8">
                Hardlopen op zondag is een uitstekende bezigheid, zeker op een Waddeneiland als Vlieland. 
                Elke deelnemer krijgt een medaille en na afloop worden er heerlijke broodjes geserveerd. 
                Dit evenement is zeer verslavend!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://vuurtorenloop.nl/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <Button variant="default" className="w-full sm:w-auto">
                    Meer informatie <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <Link to="/contact">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Organiseer met Bureau Vlieland
                  </Button>
                </Link>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <img
                src={vuurtorenloopImage}
                alt="Vuurtorenloop - hardlopers op het strand van Vlieland"
                className="w-full h-[400px] md:h-[500px] object-cover rounded-lg shadow-lg"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Amusetour Section */}
      <section className="py-20 bg-accent-soft/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src={amuseTourImage}
                alt="Amusetour Vlieland - culinair genieten"
                className="w-full h-[400px] md:h-[500px] object-cover rounded-lg shadow-lg"
                loading="lazy"
              />
            </div>
            <div>
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-4">
                <span className="text-sm font-semibold text-primary">26 september 2026</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Amusetour Vlieland
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                <strong>Vlieland moet je proeven!</strong> Een beetje vakantie aan het begin van de herfst 
                tijdens deze zaterdagse Amusetour op Vlieland.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Datum</p>
                    <p className="text-muted-foreground">Zaterdag 26 september 2026</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Locatie</p>
                    <p className="text-muted-foreground">Diverse restaurants op Vlieland</p>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground mb-8">
                De Amusetour op Vlieland is al jaren een groot succes. Een frisse zeebries, heerlijk eten, 
                goede wijn en een supersfeertje. Het eiland heeft een grote hoeveelheid goede restaurants 
                die deelnemen aan dit culinaire evenement. Een unieke manier om Vlieland te ontdekken!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://www.amusetour.nl/destinations/vlieland/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <Button variant="default" className="w-full sm:w-auto">
                    Meer informatie <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <Link to="/contact">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Organiseer met Bureau Vlieland
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bockbiertocht Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-4">
                <span className="text-sm font-semibold text-primary">Herfstvakantie t/m eind december</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Bockbiertocht Vlieland
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                <strong>Bierliefhebbers opgelet!</strong> Dit najaar nodigen we je uit voor een smaakvolle 
                ontdekkingstocht langs de gezelligste horecagelegenheden van Vlieland: de Bockbiertocht!
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Periode</p>
                    <p className="text-muted-foreground">Herfstvakantie t/m eind december</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Locaties</p>
                    <p className="text-muted-foreground">8 horecagelegenheden op Vlieland</p>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground mb-8">
                Met de speciale stempelkaart ga je op pad om bij acht unieke locaties een heerlijk 15 cl. 
                proefglaasje bockbier te proeven. Of je nu de hele route in één keer loopt of de tocht 
                verspreidt over meerdere dagen, jij bepaalt de volgorde en het tempo. De perfecte manier 
                om Vlieland in de herfst te beleven!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://boeking.mijnactiviteitenplanner.nl/activiteiten-vlieland/bockbiertocht/list" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <Button variant="default" className="w-full sm:w-auto">
                    Boek tickets <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <Link to="/contact">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Organiseer met Bureau Vlieland
                  </Button>
                </Link>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <img
                src={bockbiertochtImage}
                alt="Bockbiertocht - gezellige biertour op Vlieland"
                className="w-full h-[400px] md:h-[500px] object-cover rounded-lg shadow-lg"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stappen & Happen Section */}
      <section className="py-20 bg-accent-soft/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src={stappenHappenImage}
                alt="Stappen & Happen - culinaire wandelroute op Vlieland"
                className="w-full h-[400px] md:h-[500px] object-cover rounded-lg shadow-lg"
                loading="lazy"
              />
            </div>
            <div>
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-4">
                <span className="text-sm font-semibold text-primary">Donderdag & Zondag in de herfst</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                Stappen & Happen
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Zin in een heerlijke herfstwandeling gecombineerd met culinaire verwennerij? 
                Ontdek <strong>Stappen & Happen</strong>, dé smakelijke wandelroute door Vlieland!
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Wanneer</p>
                    <p className="text-muted-foreground">Route A op donderdag, Route B op zondag</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Route</p>
                    <p className="text-muted-foreground">4 horecazaken op Vlieland</p>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground mb-8">
                Tijdens deze unieke ervaring wandel je een prachtige route langs vier gezellige horecazaken, 
                waar je telkens wordt verrast met een heerlijk gerecht in proeverijformaat. Geniet van de 
                sfeervolle herfst op Vlieland, proef de culinaire creaties van lokale chefs en beleef een 
                middag vol gezelligheid en smaak.
              </p>
              <p className="text-muted-foreground mb-8 font-semibold">
                Stappen & Happen is ook als groepsactiviteit te boeken!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://boeking.mijnactiviteitenplanner.nl/activiteiten-vlieland/stappen-en-happen/list" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <Button variant="default" className="w-full sm:w-auto">
                    Boek tickets <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <Link to="/contact">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Organiseer met Bureau Vlieland
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
            Wilt u deelnemen aan een evenement?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Bureau Vlieland helpt u graag bij het organiseren van uw deelname aan deze evenementen. 
            Van reisarrangementen tot catering - wij zorgen dat uw groep een onvergetelijke ervaring heeft.
          </p>
          <Link to="/contact">
            <Button size="lg" className="text-lg">
              Neem contact op
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default Evenementen;
