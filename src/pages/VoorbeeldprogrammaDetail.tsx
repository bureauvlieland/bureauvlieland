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
import { ArrowLeft, ArrowRight, Calendar, Users, Euro } from "lucide-react";
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
    <div className="min-h-screen">
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
        <section className="relative h-[44vh] min-h-[320px] flex items-end overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})`, ...kenBurns }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          </div>
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl pb-10 text-white">
            <Link
              to="/voorbeeldprogrammas"
              className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Alle voorbeeldprogramma's
            </Link>
            {isLoading ? (
              <Skeleton className="h-12 w-2/3 bg-white/20" />
            ) : (
              <>
                <h1 className="text-3xl md:text-5xl font-display font-bold mb-3">
                  {template?.name}
                </h1>
                {(copy?.hook || template?.short_description) && (
                  <p className="text-lg md:text-xl text-white/90 max-w-3xl mb-4">
                    {copy?.hook || template?.short_description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {template && (
                    <span className="inline-flex items-center gap-1 text-sm bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full">
                      <Calendar className="h-3.5 w-3.5" />
                      {template.duration_days} {template.duration_days === 1 ? "dag" : "dagen"}
                    </span>
                  )}
                  {template?.target_group && (
                    <span className="inline-flex items-center gap-1 text-sm bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full">
                      <Users className="h-3.5 w-3.5" />
                      {template.target_group}
                    </span>
                  )}
                  {template?.indicative_price_pp && (
                    <span className="inline-flex items-center gap-1 text-sm bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full">
                      <Euro className="h-3.5 w-3.5" />
                      Vanaf €{template.indicative_price_pp} p.p.
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Description */}
        {template?.description && (
          <section className="py-12 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
              <p className="text-lg text-muted-foreground whitespace-pre-line leading-relaxed">
                {template.description}
              </p>
            </div>
          </section>
        )}

        {/* Timeline */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : template ? (
              <ProgramTimeline template={template} />
            ) : null}

            <div className="text-center mt-12">
              <Link to={`/programma-samenstellen?template=${slug}`}>
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

        {/* Related */}
        {related.length > 0 && (
          <section className="py-16 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-8 text-center">
                Andere programma's
              </h2>
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
