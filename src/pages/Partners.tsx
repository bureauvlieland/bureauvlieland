import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ExternalLink, Globe, MapPin, Calendar } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/lighthouse-vlieland.jpg";

interface PublicPartner {
  id: string;
  name: string;
  partner_type: string | null;
  image_url: string | null;
  about_text: string | null;
  website_url: string | null;
  location_description: string | null;
  map_tenant_slug: string | null;
  block_count: number;
}

const usePublicPartners = () => {
  return useQuery({
    queryKey: ["public-partners"],
    queryFn: async (): Promise<PublicPartner[]> => {
      // Step 1 — count published blocks per provider_id (no FK exists, so no embed)
      const { data: blocks, error: blockErr } = await supabase
        .from("building_blocks")
        .select("provider_id")
        .eq("status", "published")
        .not("provider_id", "is", null);
      if (blockErr) throw blockErr;

      const blockCountByProvider = new Map<string, number>();
      for (const row of blocks ?? []) {
        const pid = (row as any).provider_id as string | null;
        if (!pid) continue;
        blockCountByProvider.set(pid, (blockCountByProvider.get(pid) ?? 0) + 1);
      }

      const providerIds = Array.from(blockCountByProvider.keys()).filter((id) => id !== "bureau");

      // Step 2 — fetch all active partners that either provide a published block OR have a MAP slug
      const orFilter = providerIds.length > 0
        ? `id.in.(${providerIds.join(",")}),map_tenant_slug.not.is.null`
        : `map_tenant_slug.not.is.null`;

      const { data: partnerRows, error: partnerErr } = await supabase
        .from("partners")
        .select("id, name, partner_type, image_url, about_text, website_url, location_description, map_tenant_slug")
        .eq("is_active", true)
        .or(orFilter);
      if (partnerErr) throw partnerErr;

      const result: PublicPartner[] = (partnerRows ?? [])
        .filter((p) => p.id !== "bureau")
        .map((p) => ({
          id: p.id,
          name: p.name,
          partner_type: p.partner_type,
          image_url: p.image_url,
          about_text: p.about_text,
          website_url: p.website_url,
          location_description: p.location_description,
          map_tenant_slug: p.map_tenant_slug,
          block_count: blockCountByProvider.get(p.id) ?? 0,
        }));

      return result.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
};

type PartnerFilter = "all" | "activity_provider" | "accommodation";

const Partners = () => {
  const kenBurns = useKenBurns();
  const { data: partners, isLoading } = usePublicPartners();
  const [filter, setFilter] = useState<PartnerFilter>("all");

  const counts = useMemo(() => {
    const all = partners?.length ?? 0;
    const activity = partners?.filter((p) => p.partner_type === "activity_provider").length ?? 0;
    const accommodation = partners?.filter((p) => p.partner_type === "accommodation").length ?? 0;
    return { all, activity, accommodation };
  }, [partners]);

  const filtered = useMemo(() => {
    if (!partners) return [];
    if (filter === "all") return partners;
    return partners.filter((p) => p.partner_type === filter);
  }, [partners, filter]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Onze eilandpartners | Bureau Vlieland</title>
        <meta
          name="description"
          content="Maak kennis met onze partners op Vlieland: activiteitenaanbieders, accommodaties en lokale ondernemers achter onze programma's."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/partners" />
        <meta property="og:title" content="Onze eilandpartners | Bureau Vlieland" />
        <meta property="og:description" content="De lokale ondernemers en aanbieders achter onze programma's op Vlieland." />
        <meta property="og:url" content="https://bureauvlieland.nl/partners" />
      </Helmet>
      <Navigation />

      <main id="main-content">
        {/* Hero */}
        <section className="relative h-[40vh] min-h-[320px] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})`, ...kenBurns }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
          </div>
          <div className="relative z-10 text-center text-primary-foreground px-4 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">
              Onze eilandpartners
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              Lokale ondernemers, restaurants, gidsen en accommodaties die uw programma op Vlieland mogelijk maken.
            </p>
          </div>
        </section>

        {/* Filter */}
        <section className="py-8 border-b border-border bg-card">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                Alle partners ({counts.all})
              </Button>
              <Button
                variant={filter === "activity_provider" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("activity_provider")}
              >
                Activiteiten ({counts.activity})
              </Button>
              <Button
                variant={filter === "accommodation" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("accommodation")}
              >
                Accommodaties ({counts.accommodation})
              </Button>
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                Geen partners gevonden voor deze selectie.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p) => {
                  const isAccommodation = p.partner_type === "accommodation";
                  const mapUrl = p.map_tenant_slug
                    ? `https://boeking.mijnactiviteitenplanner.nl/${p.map_tenant_slug}`
                    : null;
                  return (
                    <Card key={p.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                      <div className="relative h-44 overflow-hidden bg-muted">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <span className="text-4xl font-display">{p.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex gap-2">
                          <Badge className="bg-background/95 text-foreground border border-border shadow-sm backdrop-blur-sm hover:bg-background">
                            {isAccommodation ? "Accommodatie" : "Activiteiten"}
                          </Badge>
                          {mapUrl && (
                            <Badge className="bg-primary/10 text-primary border border-primary/30 backdrop-blur-sm hover:bg-primary/15">
                              Direct boekbaar
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="flex-1 flex flex-col p-5 gap-3">
                        <div>
                          <h3 className="font-display font-semibold text-lg text-foreground leading-tight mb-1">
                            {p.name}
                          </h3>
                          {p.location_description && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {p.location_description}
                            </p>
                          )}
                        </div>
                        {p.about_text && (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {p.about_text}
                          </p>
                        )}
                        {p.block_count > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {p.block_count} {p.block_count === 1 ? "bouwsteen" : "bouwstenen"} in ons aanbod
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-border">
                          {p.website_url && (
                            <a
                              href={p.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex"
                            >
                              <Button size="sm" variant="outline" className="gap-1.5">
                                <Globe className="h-3.5 w-3.5" />
                                Website
                              </Button>
                            </a>
                          )}
                          {mapUrl && (
                            <a
                              href={mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex"
                            >
                              <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90">
                                Boek direct
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4 text-foreground">
              Samen maken wij uw eilandbeleving
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Wij combineren het beste van onze partners tot één samenhangend programma — u heeft slechts één aanspreekpunt.
            </p>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <a href="/programma-samenstellen">Vraag uw offerte aan</a>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Partners;
