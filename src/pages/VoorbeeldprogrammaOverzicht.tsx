import { useMemo, useState, useRef } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { usePublishedTemplates } from "@/hooks/useProgramTemplates";
import { ProgramCard } from "@/components/programmas/ProgramCard";
import { inferTheme, durationBucket, THEME_META, type ProgramTheme } from "@/lib/programTemplateTheme";
import heroVlieland from "@/assets/hero-vlieland.jpg";

type DurationFilter = "all" | "1" | "2" | "3" | "4+";
type ThemeFilter = "all" | ProgramTheme;

const DURATION_OPTIONS: { id: DurationFilter; label: string }[] = [
  { id: "all", label: "Alle duren" },
  { id: "1", label: "1 dag" },
  { id: "2", label: "2 dagen" },
  { id: "3", label: "3 dagen" },
  { id: "4+", label: "4+ dagen" },
];

const VoorbeeldprogrammaOverzicht = () => {
  const kenBurns = useKenBurns();
  const { data: templates, isLoading } = usePublishedTemplates();
  const [duration, setDuration] = useState<DurationFilter>("all");
  const [theme, setTheme] = useState<ThemeFilter>("all");
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => {
      const tTheme = inferTheme(t.name, t.description);
      const tDuration = durationBucket(t.duration_days);
      if (duration !== "all" && tDuration !== duration) return false;
      if (theme !== "all" && tTheme !== theme) return false;
      return true;
    });
  }, [templates, duration, theme]);

  const itemListJsonLd = templates && templates.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: templates.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `https://bureauvlieland.nl/voorbeeldprogrammas/${t.id}`,
          name: t.name,
        })),
      }
    : null;

  const scrollToGrid = () =>
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Voorbeeldprogramma's Vlieland | Bureau Vlieland</title>
        <meta
          name="description"
          content={`${templates?.length ?? "Diverse"} kant-en-klare programma's voor uw groep op Vlieland — kies een programma en pas het naar wens aan.`}
        />
        <link rel="canonical" href="https://bureauvlieland.nl/voorbeeldprogrammas" />
        <meta property="og:title" content="Voorbeeldprogramma's Vlieland | Bureau Vlieland" />
        <meta property="og:description" content="Kant-en-klare programma's voor groepen op Vlieland — van avontuur tot wellness." />
        <meta property="og:url" content="https://bureauvlieland.nl/voorbeeldprogrammas" />
        {itemListJsonLd && <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>}
      </Helmet>
      <Navigation />

      <main id="main-content">
        {/* Hero */}
        <section className="relative h-[50vh] min-h-[360px] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroVlieland})`, ...kenBurns }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
          </div>
          <div className="relative z-10 text-center text-primary-foreground px-4 max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">
              Kant-en-klare programma's
            </h1>
            <p className="text-xl md:text-2xl mb-6 text-primary-foreground/90">
              Laat u inspireren en pas het naar wens aan
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="heroPrimary" size="lg" className="text-lg px-8" onClick={scrollToGrid}>
                Bekijk programma's
              </Button>
              <Link to="/programma-samenstellen">
                <Button variant="outline" size="lg" className="text-lg px-8 bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto">
                  Of stel zelf samen
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Grid + Filters */}
        <section ref={gridRef} className="py-16 bg-muted/30 scroll-mt-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Onze programma's
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Filter op duur of thema, klik op een programma voor de volledige tijdlijn
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 mb-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground mr-1">Duur:</span>
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setDuration(opt.id)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      duration === opt.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground mr-1">Thema:</span>
                <button
                  onClick={() => setTheme("all")}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    theme === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  Alle thema's
                </button>
                {Object.values(THEME_META).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      theme === t.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[280px] rounded-xl" />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((t) => (
                  <ProgramCard key={t.id} template={t} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">
                  Geen programma's gevonden met deze filters.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDuration("all");
                    setTheme("all");
                  }}
                >
                  Reset filters
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Geen passend programma gevonden?
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-8">
              Stel uw eigen ideale programma samen uit onze bouwstenen, of neem contact op voor advies op maat.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/programma-samenstellen">
                <Button variant="heroPrimary" size="lg" className="text-lg px-8 w-full sm:w-auto">
                  Stel zelf uw programma samen
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto"
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
