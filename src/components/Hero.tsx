import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-vlieland.jpg";
import { useKenBurns } from "@/hooks/use-ken-burns";

export const Hero = () => {
  const kenBurns = useKenBurns();
  
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="hero" className="relative min-h-[600px] lg:min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Professionele catering en evenementen op Vlieland met vuurtoren op de achtergrond"
          className="w-full h-full object-cover"
          style={kenBurns}
        />
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

      {/* Content */}
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
            <Button
              size="lg"
              onClick={() => scrollToSection("contact")}
              className="bg-card text-primary hover:bg-card/90 shadow-medium text-base px-8"
            >
              Neem contact op
            </Button>
          <Button
            size="lg"
            onClick={() => scrollToSection("wat-wij-doen")}
            className="bg-background text-primary hover:bg-background/90 shadow-medium text-base px-8"
          >
            Ontdek onze diensten
          </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
