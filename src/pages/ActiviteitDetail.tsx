import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Clock, Users, MapPin, ArrowLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  type BuildingBlock,
  categoryLabels,
  formatBlockPrice,
  formatPriceNote,
} from "@/types/buildingBlock";
import { getBlockImage, getProviderName } from "@/lib/buildingBlockUtils";

// Hide internal/managed-service blocks from public catalog
const HIDDEN_IDS = new Set([
  "boot-enkel-heen",
  "boot-enkel-terug",
  "boot-retour",
  "fiets-huur",
]);

const truncate = (s: string, n: number) =>
  s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";

const ActiviteitDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [block, setBlock] = useState<BuildingBlock | null>(null);
  const [related, setRelated] = useState<BuildingBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      setLoading(true);
      setNotFound(false);

      // Lookup by slug first, fallback to id (legacy)
      const { data: bySlug } = await supabase
        .from("building_blocks")
        .select(`*, provider:partners!building_blocks_provider_id_fkey(id, name, email)`)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      let result = bySlug as unknown as BuildingBlock | null;

      if (!result) {
        const { data: byId } = await supabase
          .from("building_blocks")
          .select(`*, provider:partners!building_blocks_provider_id_fkey(id, name, email)`)
          .eq("id", slug)
          .eq("status", "published")
          .maybeSingle();
        result = byId as unknown as BuildingBlock | null;
        // Redirect legacy /activiteit/<id> → /activiteit/<slug>
        if (result?.slug && !cancelled) {
          navigate(`/activiteit/${result.slug}`, { replace: true });
          return;
        }
      }

      if (cancelled) return;

      if (!result || HIDDEN_IDS.has(result.id)) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setBlock(result);

      // Related: same category, 3 items, exclude self & hidden
      const { data: rel } = await supabase
        .from("building_blocks")
        .select(`*, provider:partners!building_blocks_provider_id_fkey(id, name, email)`)
        .eq("status", "published")
        .eq("category", result.category)
        .neq("id", result.id)
        .order("sort_order")
        .limit(8);

      if (!cancelled) {
        const relList = ((rel ?? []) as unknown as BuildingBlock[])
          .filter((b) => !HIDDEN_IDS.has(b.id))
          .slice(0, 3);
        setRelated(relList);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  const seo = useMemo(() => {
    if (!block) return null;
    const url = `https://bureauvlieland.nl/activiteit/${block.slug ?? block.id}`;
    const rawDesc = block.short_description || block.description || `${block.name} op Vlieland — boek via Bureau Vlieland.`;
    const description = truncate(rawDesc.replace(/\s+/g, " ").trim(), 158);
    const title = truncate(`${block.name} op Vlieland | Bureau Vlieland`, 60);
    const image = getBlockImage(block);
    const absoluteImage = image.startsWith("http") ? image : `https://bureauvlieland.nl${image}`;

    const product: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: block.name,
      description: rawDesc,
      image: absoluteImage,
      brand: { "@type": "Organization", name: getProviderName(block) },
      category: categoryLabels[block.category] ?? block.category,
      url,
    };
    if (block.price_adult != null && block.price_type !== "on_request") {
      product.offers = {
        "@type": "Offer",
        price: block.price_adult,
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url,
      };
    }

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://bureauvlieland.nl/" },
        { "@type": "ListItem", position: 2, name: "Bouwstenen", item: "https://bureauvlieland.nl/bouwstenen" },
        { "@type": "ListItem", position: 3, name: block.name, item: url },
      ],
    };

    return { url, title, description, absoluteImage, product, breadcrumb };
  }, [block]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !block || !seo) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Bouwsteen niet gevonden | Bureau Vlieland</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <Navigation />
        <main className="container mx-auto px-4 py-32 text-center">
          <h1 className="font-display text-3xl mb-4">Deze bouwsteen bestaat niet (meer)</h1>
          <p className="text-muted-foreground mb-6">Mogelijk is hij hernoemd of niet meer beschikbaar.</p>
          <Link to="/bouwstenen">
            <Button>Bekijk alle bouwstenen</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const image = getBlockImage(block);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={seo.url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.url} />
        <meta property="og:image" content={seo.absoluteImage} />
        <script type="application/ld+json">{JSON.stringify(seo.product)}</script>
        <script type="application/ld+json">{JSON.stringify(seo.breadcrumb)}</script>
      </Helmet>

      <Navigation />

      <main id="main-content">
        {/* Breadcrumb */}
        <nav aria-label="Kruimelpad" className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl pt-6 text-sm text-muted-foreground">
          <ol className="flex items-center gap-1 flex-wrap">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li><Link to="/bouwstenen" className="hover:text-foreground">Bouwstenen</Link></li>
            <li><ChevronRight className="h-3.5 w-3.5" /></li>
            <li className="text-foreground truncate max-w-[60vw]" aria-current="page">{block.name}</li>
          </ol>
        </nav>

        {/* Hero */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl pt-6 pb-10">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
              <img src={image} alt={block.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute top-3 left-3">
                <Badge className="bg-background/95 text-foreground border border-border shadow-sm backdrop-blur-sm">
                  {categoryLabels[block.category] ?? block.category}
                </Badge>
              </div>
            </div>

            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2 leading-tight">
                {block.name}
              </h1>
              <p className="text-sm text-muted-foreground mb-4">
                door {getProviderName(block)}
              </p>
              {block.short_description && (
                <p className="text-lg text-muted-foreground mb-6">{block.short_description}</p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mb-6">
                {block.duration && (
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{block.duration}</span>
                )}
                {block.min_people && block.max_people && (
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{block.min_people}–{block.max_people} pers.</span>
                )}
                {block.location_address && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{block.location_address}</span>
                )}
              </div>

              <div className="border-t border-border pt-4 mb-6">
                <div className="text-2xl font-semibold text-foreground">
                  {formatBlockPrice(block)}
                  {formatPriceNote(block) && (
                    <span className="text-sm text-muted-foreground ml-2 font-normal">
                      {formatPriceNote(block)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to={`/snel-aanvragen?block=${block.id}`} className="flex-1">
                  <Button size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    Direct aanvragen
                  </Button>
                </Link>
                <Link to={`/programma-samenstellen?block=${block.id}`} className="flex-1">
                  <Button size="lg" variant="outline" className="w-full">
                    Toevoegen aan programma
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Long description */}
        {block.description && (
          <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-8">
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              Over {block.name}
            </h2>
            <div className="prose prose-neutral max-w-none text-foreground whitespace-pre-line">
              {block.description}
            </div>
          </section>
        )}

        {/* Related */}
        {related.length > 0 && (
          <section className="bg-muted/30 py-16 mt-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
              <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
                Ook leuk: {categoryLabels[block.category] ?? "vergelijkbare bouwstenen"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((r) => (
                  <Link to={`/activiteit/${r.slug ?? r.id}`} key={r.id} className="group">
                    <Card className="overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow">
                      <div className="relative h-40 overflow-hidden bg-muted">
                        <img
                          src={getBlockImage(r)}
                          alt={r.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-4 flex-1 flex flex-col">
                        <h3 className="font-display font-semibold text-foreground leading-tight mb-1">
                          {r.name}
                        </h3>
                        {r.short_description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {r.short_description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              <div className="mt-8 text-center">
                <Link to="/bouwstenen">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Bekijk alle bouwstenen
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ActiviteitDetail;
