import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Clock, CloudSun, Euro, Handshake, MapPin, Users, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { StickyMobileCTA } from "@/components/home/StickyMobileCTA";
import { Button } from "@/components/ui/button";
import { type BuildingBlock, categoryLabels, formatBlockPrice, formatPriceNote } from "@/types/buildingBlock";
import { getBlockImage, getProviderName } from "@/lib/buildingBlockUtils";
import { usePublicPartnerUnavailability } from "@/hooks/usePublicPartnerUnavailability";
import { PartnerAvailabilityNote } from "@/components/shared/PartnerAvailabilityNote";
import { FaqSection } from "@/components/FaqSection";
import { SeeAlsoActivities } from "@/components/SeeAlsoActivities";
import { getActivityContent } from "@/content/activityContent";
import { buildFallbackFaq } from "@/lib/activityFallbackFaq";
import { BUILDING_BLOCK_PUBLIC_SELECT_WITH_PROVIDER } from "@/lib/buildingBlockColumns";
import { useDirectBookableActivities } from "@/hooks/useDirectBookableActivities";
import { findBundleForBlock } from "@/lib/directBookable";
import { DirectBookingPanel } from "@/components/map/DirectBookingPanel";
import { Checklist, Paragraphs } from "@/components/landing/sections";
import { Container, FactList, LoadingState, MediaCard, PageHero, Section, SectionHeader } from "@/components/system";

const SITE = "https://bureauvlieland.nl";

// Interne en beheerde diensten blijven buiten de publieke catalogus.
const HIDDEN_IDS = new Set(["boot-enkel-heen", "boot-enkel-terug", "boot-retour", "fiets-huur"]);

const truncate = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");

const FACT_ICONS: Record<string, LucideIcon> = {
  duur: Clock,
  prijs: Euro,
  groepsgrootte: Users,
  locatie: MapPin,
  vertrekpunt: MapPin,
  seizoen: CalendarDays,
  weersafhankelijk: CloudSun,
  aanbieder: Handshake,
};

const PageFrame = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background">
    <Navigation />
    <main id="main-content">{children}</main>
    <Footer />
  </div>
);

const ActiviteitDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [block, setBlock] = useState<BuildingBlock | null>(null);
  const [related, setRelated] = useState<BuildingBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { byPartner: unavailableByPartner } = usePublicPartnerUnavailability();
  const { bundles } = useDirectBookableActivities();
  const bundle = block ? findBundleForBlock(block, bundles) : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      setLoading(true);
      setNotFound(false);

      // Eerst op slug, dan op id (oude adressen).
      const { data: bySlug } = await supabase
        .from("building_blocks")
        .select(BUILDING_BLOCK_PUBLIC_SELECT_WITH_PROVIDER)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      let result = bySlug as unknown as BuildingBlock | null;

      if (!result) {
        const { data: byId } = await supabase
          .from("building_blocks")
          .select(BUILDING_BLOCK_PUBLIC_SELECT_WITH_PROVIDER)
          .eq("id", slug)
          .eq("status", "published")
          .maybeSingle();
        result = byId as unknown as BuildingBlock | null;
        // Oud adres /activiteit/<id> doorsturen naar /activiteit/<slug>.
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

      // Verwant: dezelfde categorie, drie stuks, zonder zichzelf en verborgen diensten.
      const { data: rel } = await supabase
        .from("building_blocks")
        .select(BUILDING_BLOCK_PUBLIC_SELECT_WITH_PROVIDER)
        .eq("status", "published")
        .eq("category", result.category)
        .neq("id", result.id)
        .order("sort_order")
        .limit(8);

      if (!cancelled) {
        setRelated(((rel ?? []) as unknown as BuildingBlock[]).filter((b) => !HIDDEN_IDS.has(b.id)).slice(0, 3));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  const extra = getActivityContent(block?.slug ?? block?.id);

  /** Redactionele FAQ als die er is, anders een feitelijke FAQ uit de databasevelden. */
  const faqItems = useMemo(() => {
    if (extra?.faq?.length) return extra.faq;
    return block ? buildFallbackFaq(block) : [];
  }, [extra, block]);

  const seo = useMemo(() => {
    if (!block) return null;
    const url = `${SITE}/activiteit/${block.slug ?? block.id}`;
    const rawDesc = extra?.summary || block.short_description || block.description || `${block.name} op Vlieland, te boeken via Bureau Vlieland.`;
    const description = truncate(rawDesc.replace(/\s+/g, " ").trim(), 158);
    const title = truncate(`${block.name} op Vlieland | Bureau Vlieland`, 60);
    const image = getBlockImage(block);
    const absoluteImage = image.startsWith("http") ? image : `${SITE}${image}`;

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
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Activiteiten Vlieland", item: `${SITE}/activiteiten-vlieland` },
        { "@type": "ListItem", position: 3, name: "Bouwstenen", item: `${SITE}/bouwstenen` },
        { "@type": "ListItem", position: 4, name: block.name, item: url },
      ],
    };

    return { url, title, description, absoluteImage, product, breadcrumb };
  }, [block, extra]);

  if (loading) {
    return (
      <PageFrame>
        <Section>
          <Container size="content">
            <LoadingState label="Bouwsteen laden…" />
          </Container>
        </Section>
      </PageFrame>
    );
  }

  if (notFound || !block || !seo) {
    return (
      <PageFrame>
        <Helmet>
          <title>Bouwsteen niet gevonden | Bureau Vlieland</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <PageHero
          eyebrow="Bouwstenen"
          title="Deze bouwsteen bestaat niet (meer)"
          intro="Mogelijk is hij hernoemd of niet meer beschikbaar. Alle bouwstenen die u nu kunt boeken staan in de catalogus."
          cta={{ label: "Bekijk alle bouwstenen", to: "/bouwstenen" }}
          secondary={{ label: "Activiteiten op Vlieland", to: "/activiteiten-vlieland" }}
        />
        <RelatedLinks pathname="/bouwstenen" title="Verder kijken" />
      </PageFrame>
    );
  }

  const image = getBlockImage(block);
  const heroImage = image === "/placeholder.svg" ? undefined : image;
  const category = categoryLabels[block.category] ?? block.category;
  const provider = getProviderName(block);
  const addPath = `/programma-samenstellen?block=${block.id}`;
  const requestPath = `/snel-aanvragen?block=${block.id}`;
  const primary = bundle ? { label: "Direct reserveren", to: "#boeken" } : { label: "Toevoegen aan programma", to: addPath };
  const secondary = { label: bundle ? "Liever aanvragen?" : "Dit onderdeel los aanvragen", to: requestPath };
  const availability = block.provider_id ? unavailableByPartner.get(block.provider_id) : undefined;

  const priceLine = [formatBlockPrice(block), formatPriceNote(block)].filter(Boolean).join(" ");
  const dbFacts: { label: string; value: string }[] = [
    ...(block.duration ? [{ label: "Duur", value: block.duration }] : []),
    ...(block.min_people && block.max_people ? [{ label: "Groepsgrootte", value: `${block.min_people} tot ${block.max_people} personen` }] : []),
    ...(block.location_address ? [{ label: "Locatie", value: block.location_address }] : []),
    { label: "Prijs", value: priceLine },
    { label: "Aanbieder", value: provider },
  ];
  // Redactionele feiten gaan voor; uit de database komt alleen wat daar nog
  // niet in staat (een vertrekpunt telt als locatie).
  const covered = new Set((extra?.practical ?? []).map((p) => p.label.toLowerCase()));
  if (covered.has("vertrekpunt")) covered.add("locatie");
  const facts = [...(extra?.practical ?? []), ...dbFacts.filter((f) => !covered.has(f.label.toLowerCase()))].map((f) => ({
    ...f,
    icon: FACT_ICONS[f.label.toLowerCase()],
  }));

  const descriptionParagraphs = block.description ? block.description.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) : [];
  const paragraphs = [...descriptionParagraphs, ...(extra?.paragraphs ?? [])];

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
      <LandingBreadcrumb
        items={[
          { label: "Activiteiten", href: "/activiteiten-vlieland" },
          { label: "Bouwstenen", href: "/bouwstenen" },
          { label: block.name },
        ]}
      />

      <main id="main-content">
        <PageHero
          image={heroImage}
          alt={block.name}
          eyebrow={`${category} · ${provider}`}
          title={block.name}
          intro={block.short_description ?? undefined}
          cta={primary}
          secondary={secondary}
        />

        <Section>
          <Container size="wide">
            <div className="grid gap-10 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SectionHeader title={`Over ${block.name}`} />
                {paragraphs.length > 0 && <Paragraphs items={paragraphs} className="mt-6 max-w-3xl whitespace-pre-line" />}
                {extra?.goodToKnow && extra.goodToKnow.length > 0 && (
                  <div className="mt-10 max-w-3xl">
                    <h3 className="font-display text-display-md font-medium text-foreground">Goed om te weten</h3>
                    <div className="mt-4">
                      <Checklist items={extra.goodToKnow} />
                    </div>
                  </div>
                )}
              </div>
              <FactList title="In het kort" summary={extra?.summary} items={facts} className="self-start" />
            </div>
          </Container>
        </Section>

        <Section id="boeken" tone="muted" className="scroll-mt-24">
          <Container size="content">
            <SectionHeader
              align="center"
              eyebrow="Boeken"
              title={bundle ? "Direct reserveren" : "Aanvragen of toevoegen"}
              intro={
                bundle
                  ? "Kies een datum en tijd; u reserveert rechtstreeks bij de aanbieder. Liever in een compleet programma? Voeg het onderdeel dan toe."
                  : "Voeg dit onderdeel toe aan uw programma, of vraag het los aan. Wij checken de beschikbaarheid bij de aanbieder."
              }
            />
            <p className="mt-6 text-center text-foreground">
              <strong className="font-medium">{formatBlockPrice(block)}</strong>
              {formatPriceNote(block) && <span className="text-muted-foreground"> {formatPriceNote(block)}</span>}
            </p>
            {availability && <PartnerAvailabilityNote note={availability} variant="panel" className="mx-auto mt-6 max-w-md" />}
            {bundle ? (
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="w-full max-w-md text-left">
                  <DirectBookingPanel bundle={bundle} />
                </div>
                <Button asChild size="lg" variant="outline">
                  <Link to={addPath}>Toevoegen aan programma</Link>
                </Button>
                <Link to={requestPath} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  Liever aanvragen in plaats van direct boeken?
                </Link>
              </div>
            ) : (
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to={addPath}>Toevoegen aan programma</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to={requestPath}>Dit onderdeel los aanvragen</Link>
                </Button>
              </div>
            )}
          </Container>
        </Section>

        {faqItems.length > 0 && (
          <FaqSection
            title={`Veelgestelde vragen over ${block.name.toLowerCase()}`}
            items={faqItems}
            schemaId={`activiteit-${block.slug ?? block.id}`}
            pageUrl={seo.url}
          />
        )}

        <SeeAlsoActivities currentSlug={block.slug ?? block.id} />

        {related.length > 0 && (
          <Section tone="muted" spacing="compact">
            <Container size="wide">
              <SectionHeader as="h2" size="md" weight="medium" title={`Ook leuk: ${category.toLowerCase()}`} />
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Vergelijkbare bouwstenen">
                {related.map((r) => {
                  const img = getBlockImage(r);
                  return (
                    <li key={r.id}>
                      <MediaCard
                        image={img === "/placeholder.svg" ? null : img}
                        alt={r.name}
                        meta={`door ${getProviderName(r)}`}
                        title={r.name}
                        text={r.short_description ?? undefined}
                        footer={[formatBlockPrice(r), formatPriceNote(r)].filter(Boolean).join(" ")}
                        to={`/activiteit/${r.slug ?? r.id}`}
                      />
                    </li>
                  );
                })}
              </ul>
              <p className="mt-6">
                <Button asChild variant="outline" size="sm">
                  <Link to="/bouwstenen">Bekijk alle bouwstenen</Link>
                </Button>
              </p>
            </Container>
          </Section>
        )}

        <RelatedLinks pathname="/bouwstenen" title="Verder kijken" />
      </main>

      <Footer />
      <StickyMobileCTA label={primary.label} to={primary.to} />
    </div>
  );
};

export default ActiviteitDetail;
