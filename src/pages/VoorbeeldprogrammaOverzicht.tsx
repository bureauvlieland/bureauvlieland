import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { usePublishedTemplates, useTemplateWithItems } from "@/hooks/useProgramTemplates";
import { ProgramTimeline } from "@/components/programmas/ProgramTimeline";
import { Calendar, Users, Euro, ArrowRight, Loader2 } from "lucide-react";
import heroVlieland from "@/assets/hero-vlieland.jpg";
import { useRef } from "react";

// Wrapper component that fetches full template data and renders timeline
const TemplateTimelineSection = ({ templateId, name, description }: { templateId: string; name: string; description: string | null }) => {
  const { data: fullTemplate, isLoading } = useTemplateWithItems(templateId);
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section ref={sectionRef} id={`template-${templateId}`} className="py-16 scroll-mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        {/* Template intro */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {name}
          </h2>
          {description && (
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {description}
            </p>
          )}
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : fullTemplate ? (
          <ProgramTimeline template={fullTemplate} />
        ) : null}

        {/* CTA */}
        <div className="text-center mt-12">
          <Link to={`/programma-samenstellen?template=${templateId}`}>
            <Button size="lg" className="text-lg px-8 gap-2">
              Gebruik dit programma
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-3">
            Pas het programma naar wens aan in de configurator
          </p>
        </div>
      </div>
    </section>
  );
};

const VoorbeeldprogrammaOverzicht = () => {
  const kenBurns = useKenBurns();
  const { data: templates, isLoading } = usePublishedTemplates();

  const scrollToTemplate = (templateId: string) => {
    const el = document.getElementById(`template-${templateId}`);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Voorbeeldprogramma's Vlieland | Bureau Vlieland</title>
        <meta
          name="description"
          content="Bekijk onze kant-en-klare voorbeeldprogramma's voor Vlieland. Van avontuur tot ontspanning — kies een programma en pas het naar wens aan."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/voorbeeldprogrammas" />
        <meta property="og:title" content="Voorbeeldprogramma's Vlieland | Bureau Vlieland" />
        <meta property="og:description" content="Bekijk onze kant-en-klare voorbeeldprogramma's voor Vlieland." />
        <meta property="og:url" content="https://bureauvlieland.nl/voorbeeldprogrammas" />
      </Helmet>
      <Navigation />

      <main id="main-content">
        {/* Hero */}
        <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroVlieland})`, ...kenBurns }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
          </div>
          <div className="relative z-10 text-center text-primary-foreground px-4 max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">
              Kant-en-klare Programma's
            </h1>
            <p className="text-xl md:text-2xl mb-6 text-primary-foreground/90">
              Laat je inspireren door onze voorbeeldprogramma's en pas ze naar wens aan
            </p>
            <Link to="/programma-samenstellen">
              <Button variant="heroPrimary" size="lg" className="text-lg px-8">
                Of stel zelf samen
              </Button>
            </Link>
          </div>
        </section>

        {/* Overview cards */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Onze Programma's
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Klik op een programma om de volledige tijdlijn te bekijken
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group h-[240px] sm:h-[280px] hover:shadow-lg hover:-translate-y-1"
                    onClick={() => scrollToTemplate(t.id)}
                  >
                    <img
                      src={t.image_url || "/placeholder.svg"}
                      alt={t.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {t.duration_days} {t.duration_days === 1 ? "dag" : "dagen"}
                      </span>
                    </div>
                    <div className="absolute inset-0 p-5 flex flex-col justify-end">
                      <h3 className="font-bold text-xl text-white mb-1">{t.name}</h3>
                      {t.short_description && (
                        <p className="text-white/80 text-sm line-clamp-2 mb-3">
                          {t.short_description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {t.target_group && (
                          <span className="inline-flex items-center gap-1 text-xs text-white/90 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                            <Users className="h-3 w-3" />
                            {t.target_group}
                          </span>
                        )}
                        {t.indicative_price_pp && (
                          <span className="inline-flex items-center gap-1 text-xs text-white/90 bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                            <Euro className="h-3 w-3" />
                            Vanaf €{t.indicative_price_pp} p.p.
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-white text-sm font-medium group-hover:gap-2 transition-all">
                        Bekijk tijdlijn
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                Er zijn momenteel geen voorbeeldprogramma's beschikbaar.
              </p>
            )}
          </div>
        </section>

        {/* Timeline sections per template */}
        {templates?.map((t, idx) => (
          <div key={t.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
            <TemplateTimelineSection
              templateId={t.id}
              name={t.name}
              description={t.description}
            />
          </div>
        ))}

        {/* Bottom CTA */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Geen passend programma gevonden?
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-8">
              Stel zelf je ideale programma samen uit onze bouwstenen, of neem contact op voor advies op maat.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/programma-samenstellen">
                <Button variant="heroPrimary" size="lg" className="text-lg px-8 w-full sm:w-auto">
                  Zelf samenstellen
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto"
                >
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

export default VoorbeeldprogrammaOverzicht;
