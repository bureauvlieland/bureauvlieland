import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { AboutErwin } from "@/components/AboutErwin";
import { Verbinder } from "@/components/Verbinder";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import vlielandLandscape from "@/assets/vlieland-landscape.jpg";

const OverOns = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${vlielandLandscape})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
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

          <div className="relative z-10 text-center text-primary-foreground px-4">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Over ons
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto">
              Lokale expertise en verbinding op Vlieland
            </p>
          </div>
        </section>

        {/* Content */}
        <AboutErwin />
        <Verbinder />

        {/* CTA naar Contact */}
        <section className="py-16 bg-gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Laten we kennismaken
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto text-primary-foreground/90">
              Neem contact op met Erwin voor een vrijblijvend gesprek over jouw evenement op Vlieland
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

export default OverOns;
