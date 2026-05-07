import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Loader2, ArrowRight, Search, Info, Clock, Users, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BuildingBlock } from "@/types/buildingBlock";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useKenBurns } from "@/hooks/use-ken-burns";
import { usePublishedBuildingBlocks } from "@/hooks/useBuildingBlocks";
import {
  getBlockImage,
  getProviderName,
} from "@/lib/buildingBlockUtils";
import {
  categoryLabels,
  formatBlockPrice,
  formatPriceNote,
  type BuildingBlockCategory,
} from "@/types/buildingBlock";
import heroImage from "@/assets/vlieland-landscape.jpg";

// Hide internal/managed-service blocks from public catalog
const HIDDEN_IDS = new Set([
  "boot-enkel-heen",
  "boot-enkel-terug",
  "boot-retour",
  "fiets-huur",
]);

const Bouwstenen = () => {
  const kenBurns = useKenBurns();
  const { data: blocks, isLoading } = usePublishedBuildingBlocks();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<BuildingBlockCategory | "all">("all");
  const [detailBlock, setDetailBlock] = useState<BuildingBlock | null>(null);

  const visibleBlocks = useMemo(() => {
    return (blocks ?? []).filter((b) => !HIDDEN_IDS.has(b.id));
  }, [blocks]);

  const categories = useMemo(() => {
    const set = new Set<BuildingBlockCategory>();
    visibleBlocks.forEach((b) => set.add(b.category));
    return Array.from(set);
  }, [visibleBlocks]);

  const filtered = useMemo(() => {
    return visibleBlocks.filter((b) => {
      if (activeCategory !== "all" && b.category !== activeCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${b.name} ${b.short_description ?? ""} ${b.description ?? ""} ${getProviderName(b)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [visibleBlocks, activeCategory, search]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Bouwstenen — alle activiteiten en diensten | Bureau Vlieland</title>
        <meta
          name="description"
          content="Bekijk alle bouwstenen voor uw programma op Vlieland: activiteiten, catering, vervoer en meer. Voeg toe aan uw offerte."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/bouwstenen" />
        <meta property="og:title" content="Bouwstenen | Bureau Vlieland" />
        <meta property="og:description" content="Alle activiteiten en diensten voor uw programma op Vlieland." />
        <meta property="og:url" content="https://bureauvlieland.nl/bouwstenen" />
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
              Alle bouwstenen
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              Activiteiten, catering, vervoer en diensten — combineer ze in uw eigen programma.
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="py-8 border-b border-border bg-card">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="flex flex-col gap-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam, partner of trefwoord…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory("all")}
                >
                  Alles ({visibleBlocks.length})
                </Button>
                {categories.map((cat) => {
                  const count = visibleBlocks.filter((b) => b.category === cat).length;
                  return (
                    <Button
                      key={cat}
                      variant={activeCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveCategory(cat)}
                    >
                      {categoryLabels[cat] ?? cat} ({count})
                    </Button>
                  );
                })}
              </div>
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
                Geen bouwstenen gevonden voor deze selectie.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((block) => (
                  <Card key={block.id} className="overflow-hidden flex flex-col group hover:shadow-lg transition-shadow">
                    <div className="relative h-44 overflow-hidden bg-muted">
                      <img
                        src={getBlockImage(block)}
                        alt={block.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-background/95 text-foreground border border-border shadow-sm backdrop-blur-sm hover:bg-background">
                          {categoryLabels[block.category] ?? block.category}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="flex-1 flex flex-col p-5 gap-3">
                      <div>
                        <h3 className="font-display font-semibold text-lg text-foreground leading-tight mb-1">
                          {block.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          door {getProviderName(block)}
                        </p>
                      </div>
                      {block.short_description && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {block.short_description}
                        </p>
                      )}
                      <div className="flex items-baseline justify-between mt-auto pt-3 border-t border-border">
                        <div>
                          <span className="text-base font-semibold text-foreground">
                            {formatBlockPrice(block)}
                          </span>
                          {formatPriceNote(block) && (
                            <span className="text-xs text-muted-foreground ml-1">
                              {formatPriceNote(block)}
                            </span>
                          )}
                        </div>
                        <Link to={`/programma-samenstellen?block=${block.id}`}>
                          <Button size="sm" variant="ghost" className="gap-1 text-primary hover:text-primary">
                            Toevoegen
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4 text-foreground">
              Klaar om uw programma samen te stellen?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Combineer bouwstenen tot een compleet programma en vraag een vrijblijvende offerte aan.
            </p>
            <Link to="/programma-samenstellen">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                Stel zelf uw programma samen
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Bouwstenen;
