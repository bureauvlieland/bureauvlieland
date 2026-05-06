import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTemplateWithItems, usePublishedTemplates } from "@/hooks/useProgramTemplates";
import { ProgramTimeline } from "@/components/programmas/ProgramTimeline";
import { ProgramCard } from "@/components/programmas/ProgramCard";
import { ProgramHighlights } from "@/components/programmas/ProgramHighlights";
import { ProgramPractical } from "@/components/programmas/ProgramPractical";
import { ArrowLeft, ArrowRight, Calendar, Users, Euro, Quote } from "lucide-react";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { getTemplateCopy } from "@/lib/programTemplateCopy";
import heroVlieland from "@/assets/hero-vlieland.jpg";

const VoorbeeldprogrammaDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const kenBurns = useKenBurns();
  const { data: template, isLoading, isError } = useTemplateWithItems(slug || null);
  const { data: allTemplates } = usePublishedTemplates();

  useEffect(() => {
    if (!isLoading && (isError || (slug && template === null))) {
      navigate("/voorbeeldprogrammas", { replace: true });
    }
  }, [isLoading, isError, template, slug, navigate]);

  const heroImage = template?.image_url || heroVlieland;
  const copy = getTemplateCopy(slug);
  const related = (allTemplates || [])
    .filter((t) => t.id !== slug)
    .slice(0, 3);

  const canonical = `https://bureauvlieland.nl/voorbeeldprogrammas/${slug}`;
  const description =
    template?.short_description ||
    template?.description?.slice(0, 155) ||
    "Bekijk dit voorbeeldprogramma voor uw groepsbezoek aan Vlieland.";

  const jsonLd = template
    ? {
        "@context": "https://schema.org",
        "@type": "TouristTrip",
        name: template.name,
        description: template.description || template.short_description || undefined,
        touristType: template.target_group || undefined,
        itinerary: { "@type": "ItemList", numberOfItems: template.duration_days },
        offers: template.indicative_price_pp
          ? {
              "@type": "Offer",
              price: template.indicative_price_pp,
              priceCurrency: "EUR",
              priceSpecification: { "@type": "UnitPriceSpecification", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitText: "person" } },
            }
          : undefined,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{template ? `${template.name} | Voorbeeldprogramma Vlieland` : "Voorbeeldprogramma | Bureau Vlieland"}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={template?.name || "Voorbeeldprogramma Vlieland"} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        {template?.image_url && <meta property="og:image" content={template.image_url} />}
        {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
      </Helmet>
      <Navigation />

      <main id="main-content">
        {/* Hero */}
        <section className="relative min-h-[62vh] flex items-end overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})`, ...kenBurns }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--ocean-deep))] via-[hsl(var(--ocean-deep))]/55 to-[hsl(var(--ocean-deep))]/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
          </div>
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl pb-14 pt-32 text-white">
            <Link
              to="/voorbeeldprogrammas"
              className="inline-flex items-center gap-1.5 text-sm text-white/75 hover:text-white mb-8 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Alle voorbeeldprogramma's
            </Link>
            {isLoading ? (
              <Skeleton className="h-16 w-2/3 bg-white/20" />
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="h-px w-10 bg-[hsl(var(--sunset))]" />
                  <p className="text-xs uppercase tracking-[0.25em] text-white/85 font-semibold">
                    Voorbeeldprogramma · {template?.duration_days} {template?.duration_days === 1 ? "dag" : "dagen"}
                  </p>
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-5 leading-[1.05] max-w-4xl">
                  {template?.name}
                </h1>
                {(copy?.hook || template?.short_description) && (
                  <p className="text-lg md:text-2xl text-white/90 max-w-3xl font-display italic leading-snug">
                    {copy?.hook || template?.short_description}
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        {/* Fact strip */}
        {template && (
          <div className="bg-[hsl(var(--ocean-deep))] text-white border-t border-white/10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-5 flex flex-wrap items-center gap-x-10 gap-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[hsl(var(--sunset))]" />
                <span className="text-white/70">Duur</span>
                <span className="font-semibold">
                  {template.duration_days} {template.duration_days === 1 ? "dag" : "dagen"}
                </span>
              </div>
              {template.target_group && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[hsl(var(--sunset))]" />
                  <span className="text-white/70">Doelgroep</span>
                  <span className="font-semibold">{template.target_group}</span>
                </div>
              )}
              {template.indicative_price_pp && (
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-[hsl(var(--sunset))]" />
                  <span className="text-white/70">Indicatie</span>
                  <span className="font-semibold">vanaf €{template.indicative_price_pp} p.p.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verhaal + sticky positionerings-kaart */}
        {(template?.description || copy) && (
          <section className="py-20 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl grid lg:grid-cols-[1fr_360px] gap-12 lg:gap-16">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary/70 font-semibold mb-3">
                  Het verhaal
                </p>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6 leading-tight">
                  Wat u beleeft
                </h2>
                {template?.description && (
                  <p className="text-lg text-foreground/80 whitespace-pre-line leading-relaxed">
                    {template.description}
                  </p>
                )}
              </div>

              <aside className="lg:sticky lg:top-24 self-start">
                <div
                  className="bg-card rounded-2xl border border-border/60 p-7"
                  style={{ boxShadow: "var(--shadow-medium)" }}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-primary/70 font-semibold mb-4">
                    In het kort
                  </p>
                  <dl className="space-y-3 text-sm border-b border-border/60 pb-5 mb-5">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Duur</dt>
                      <dd className="font-semibold text-foreground text-right">
                        {template?.duration_days} {template?.duration_days === 1 ? "dag" : "dagen"}
                      </dd>
                    </div>
                    {template?.target_group && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Doelgroep</dt>
                        <dd className="font-semibold text-foreground text-right">
                          {template.target_group}
                        </dd>
                      </div>
                    )}
                    {template?.indicative_price_pp && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Vanaf</dt>
                        <dd className="font-semibold text-foreground text-right">
                          €{template.indicative_price_pp} p.p.
                        </dd>
                      </div>
                    )}
                  </dl>

                  {copy?.vibe && copy.vibe.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">
                        Sfeer
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {copy.vibe.map((v) => (
                          <span
                            key={v}
                            className="text-xs font-medium px-2.5 py-1 rounded-full bg-[hsl(var(--accent-soft))] text-primary"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link to={`/programma-samenstellen?template=${slug}`} className="block">
                    <Button className="w-full gap-2" size="lg">
                      Gebruik dit programma
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Volledig aan te passen aan uw groep
                  </p>
                </div>
              </aside>
            </div>
          </section>
        )}

        {/* Highlights + storytelling */}
        {copy && <ProgramHighlights copy={copy} />}

        {/* Voor wie — donker contrastblok */}
        {copy?.forWhom && (
          <section className="py-20 bg-[hsl(var(--ocean-deep))] text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.05]" style={{ background: "var(--gradient-sunset)" }} />
            <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
              <Quote className="h-10 w-10 mx-auto mb-6" style={{ color: "hsl(var(--sunset))" }} />
              <p className="text-xs uppercase tracking-[0.25em] text-white/70 font-semibold mb-5">
                Voor wie
              </p>
              <p className="text-2xl md:text-3xl font-display leading-snug text-white/95">
                {copy.forWhom}
              </p>
              {copy.vibe && copy.vibe.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2 justify-center">
                  {copy.vibe.map((v) => (
                    <span
                      key={v}
                      className="text-sm font-medium px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-sm"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Praktisch */}
        {copy && template && (
          <ProgramPractical copy={copy} durationDays={template.duration_days} />
        )}

        {/* Tijdlijn */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="mb-10">
              <p className="text-xs uppercase tracking-[0.2em] text-primary/70 font-semibold mb-3">
                Het verloop
              </p>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Programma per dag
              </h2>
            </div>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : template ? (
              <ProgramTimeline template={template} />
            ) : null}
          </div>
        </section>

        {/* CTA call-out */}
        <section className="pb-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div
              className="relative rounded-3xl overflow-hidden p-10 md:p-14 text-white text-center"
              style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-dramatic)" }}
            >
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20" style={{ background: "var(--gradient-sunset)" }} />
              <div className="relative">
                <p className="text-xs uppercase tracking-[0.25em] text-white/80 font-semibold mb-4">
                  Klaar voor uw eilandbeleving?
                </p>
                <h3 className="text-3xl md:text-4xl font-display font-bold mb-4 leading-tight">
                  Stel dit programma op maat samen
                </h3>
                <p className="text-white/85 max-w-xl mx-auto mb-8">
                  Pas datum, groepsgrootte en activiteiten naar wens aan in onze
                  configurator. Wij verzorgen de rest — één partij, één factuur.
                </p>
                <Link to={`/programma-samenstellen?template=${slug}`}>
                  <Button
                    size="lg"
                    className="text-base px-8 gap-2 border-0"
                    style={{
                      background: "hsl(var(--sunset))",
                      color: "hsl(var(--sunset-foreground))",
                    }}
                  >
                    Gebruik dit programma
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Andere programma's */}
        {related.length > 0 && (
          <section className="py-20" style={{ background: "var(--gradient-sand)" }}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
              <div className="text-center mb-12">
                <p className="text-xs uppercase tracking-[0.2em] text-primary/70 font-semibold mb-3">
                  Verder kijken
                </p>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  Andere programma's
                </h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((t) => (
                  <ProgramCard key={t.id} template={t} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default VoorbeeldprogrammaDetail;
