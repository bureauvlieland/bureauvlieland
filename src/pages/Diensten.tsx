import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Services } from "@/components/Services";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import eventImage from "@/assets/event-outdoor.jpg";

const Diensten = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${eventImage})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
          </div>
          <div className="relative z-10 text-center text-white px-4">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Wat wij doen
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto">
              Maatwerkprogramma's met professionele regie op Vlieland
            </p>
          </div>
        </section>

        {/* Services Content */}
        <Services />

        {/* CTA Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Ontdek onze programma's
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Bekijk onze voorbeeldprogramma's of ontdek de transformatieve programma's 
                die we organiseren samen met onze partners RMD Trainingen en Mindset22.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/voorbeeldprogrammas">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Voorbeeldprogramma's
                  </Button>
                </Link>
                <Link to="/programmas">
                  <Button size="lg" variant="outline">
                    Transformatieve Programma's
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA naar Contact */}
        <section className="py-16 bg-gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Klaar om jouw evenement te plannen?
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto text-primary-foreground/90">
              Neem contact op voor een vrijblijvend gesprek over de mogelijkheden
            </p>
            <Link to="/contact">
              <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                Neem contact op
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Diensten;
