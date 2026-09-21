import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ExternalLink, Globe, MapPin } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/vlieland-landscape.jpg";
import { transformImageUrl } from "@/lib/supabaseImage";
import { Container, EmptyState, LoadingState, PageHero, Pill, RouteChooser, Section, SectionHeader } from "@/components/system";

const URL = "https://bureauvlieland.nl/partners";

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
      // Fetch all publicly visible partners
      const { data: partners, error } = await supabase
        .from("partners_public")
        .select("id, name, partner_type, image_url, about_text, website_url, location_description, map_tenant_slug")
        .eq("is_public", true);
      if (error) throw error;

      // Count published blocks per provider for display
      const { data: blocks } = await supabase
        .from("building_blocks")
        .select("provider_id")
        .eq("status", "published")
        .not("provider_id", "is", null);

      const blockCountByProvider = new Map<string, number>();
      for (const row of (blocks ?? []) as { provider_id: string | null }[]) {
        const pid = row.provider_id;
        if (!pid) continue;
        blockCountByProvider.set(pid, (blockCountByProvider.get(pid) ?? 0) + 1);
      }

      return (partners ?? [])
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
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
};

type PartnerFilter = "all" | "activity_provider" | "accommodation";

const normalizeWebsiteUrl = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Reject obvious junk
  if (!/\./.test(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, "")}`;
};

const Partners = () => {
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

  const filters: { key: PartnerFilter; label: string; count: number }[] = [
    { key: "all", label: "Alle partners", count: counts.all },
    { key: "activity_provider", label: "Activiteiten", count: counts.activity },
    { key: "accommodation", label: "Accommodaties", count: counts.accommodation },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Onze eilandpartners | Bureau Vlieland</title>
        <meta
          name="description"
          content="Maak kennis met onze partners op Vlieland: activiteitenaanbieders, accommodaties en lokale ondernemers achter onze programma's."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Onze eilandpartners | Bureau Vlieland" />
        <meta property="og:description" content="De lokale ondernemers en aanbieders achter onze programma's op Vlieland." />
        <meta property="og:url" content={URL} />
      </Helmet>
      <Navigation />

      <main id="main-content">
        <PageHero
          image={heroImage}
          alt="Het landschap van Vlieland"
          eyebrow="Eilandpartners"
          title="Onze eilandpartners"
          intro="Lokale ondernemers, restaurants, gidsen en accommodaties die uw programma op Vlieland mogelijk maken. Wij kennen ze persoonlijk en boeken ze voor u."
          cta={{ label: "Stel uw programma samen", to: "/programma-samenstellen" }}
          secondary={{ label: "Bekijk de bouwstenen", to: "/bouwstenen" }}
        />

        <Section spacing="compact">
          <Container size="wide">
            <SectionHeader eyebrow="Eilandpartners" number="01" title="Alle partners" intro="Filter op soort partner. Een partner met een eigen boekmodule is direct te boeken." />
            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter op soort partner">
              {filters.map((f) => (
                <Button key={f.key} variant={filter === f.key ? "default" : "outline"} size="sm" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label} ({f.count})
                </Button>
              ))}
            </div>

            {isLoading ? (
              <LoadingState label="Partners laden…" className="mt-10" />
            ) : filtered.length === 0 ? (
              <EmptyState className="mt-10" title="Geen partners gevonden voor deze selectie." />
            ) : (
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => {
                  const isAccommodation = p.partner_type === "accommodation";
                  const mapUrl = p.map_tenant_slug ? `https://boeking.mijnactiviteitenplanner.nl/${p.map_tenant_slug}` : null;
                  const websiteHref = normalizeWebsiteUrl(p.website_url);
                  return (
                    <li key={p.id} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-accent-soft">
                        {p.image_url ? (
                          <img
                            src={transformImageUrl(p.image_url, { width: 800, quality: 78 })}
                            alt={p.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-display text-display-lg font-light text-primary/40" aria-hidden="true">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          <Pill tone="neutral" className="bg-card">{isAccommodation ? "Accommodatie" : "Activiteiten"}</Pill>
                          {mapUrl && <Pill tone="brand">Direct boekbaar</Pill>}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-5">
                        <div>
                          <h3 className="font-display text-display-md font-medium text-foreground">{p.name}</h3>
                          {p.location_description && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              {p.location_description}
                            </p>
                          )}
                        </div>
                        {p.about_text && <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{p.about_text}</p>}
                        {p.block_count > 0 && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" aria-hidden="true" />
                            {p.block_count} {p.block_count === 1 ? "bouwsteen" : "bouwstenen"} in ons aanbod
                          </p>
                        )}
                        {(websiteHref || mapUrl) && (
                          <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
                            {websiteHref && (
                              <Button asChild size="sm" variant="outline">
                                <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                                  <Globe aria-hidden="true" />
                                  Website
                                </a>
                              </Button>
                            )}
                            {mapUrl && (
                              <Button asChild size="sm">
                                <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                                  Boek direct
                                  <ExternalLink aria-hidden="true" />
                                </a>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Container>
        </Section>

        <RouteChooser
          title="Samen maken wij uw eilandbeleving"
          intro="Wij combineren het beste van onze partners tot één samenhangend programma. U heeft één aanspreekpunt en één factuur."
        />

        <FaqSection
          schemaId="eilandpartners"
          pageUrl={URL}
          title="Zelf eilandpartner worden?"
          items={[
            {
              question: "Hoe word ik eilandpartner van Bureau Vlieland?",
              answer: "Neem contact met ons op via hallo@bureauvlieland.nl. Na een kennismaking krijgt u toegang tot het partnerportaal waarin u uw aanbod en beschikbaarheid beheert.",
            },
            {
              question: "Wat kost een samenwerking?",
              answer: "Bureau Vlieland rekent een commissie over de geboekte omzet exclusief btw. Er zijn geen abonnements- of aanmeldkosten.",
            },
            {
              question: "Hoe verloopt de facturatie?",
              answer: "Bureau Vlieland factureert de klant centraal. U stuurt uw factuur naar ons en wij betalen uit volgens de afgesproken termijn.",
            },
            {
              question: "Bepaal ik zelf mijn tarieven en beschikbaarheid?",
              answer: "Ja. U beheert uw eigen bouwstenen, prijzen en beschikbaarheid in het partnerportaal en accepteert of weigert elke aanvraag zelf.",
            },
          ]}
        />
        <RelatedLinks />
      </main>

      <Footer />
    </div>
  );
};

export default Partners;
