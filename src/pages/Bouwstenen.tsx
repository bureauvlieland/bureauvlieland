import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Clock, Search, Ticket, Zap } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { RESPONSE_TIME } from "@/content/promises";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CatalogCard, Container, EmptyState, LoadingState, PageHero, Pill, RouteChooser, Section, SectionHeader } from "@/components/system";
import { usePublishedBuildingBlocks } from "@/hooks/useBuildingBlocks";
import { useDirectBookableActivities } from "@/hooks/useDirectBookableActivities";
import { usePublicPartnerUnavailability } from "@/hooks/usePublicPartnerUnavailability";
import { PartnerAvailabilityNote } from "@/components/shared/PartnerAvailabilityNote";
import { matchBundlesToBlocks, buildBookingLink, type BookableBundle } from "@/lib/directBookable";
import { getBlockImage, getProviderName } from "@/lib/buildingBlockUtils";
import { categoryLabels, formatBlockPrice, formatPriceNote, type BuildingBlock, type BuildingBlockCategory } from "@/types/buildingBlock";

const URL = "https://bureauvlieland.nl/bouwstenen";

// Interne en beheerde diensten blijven buiten de publieke catalogus.
const HIDDEN_IDS = new Set(["boot-enkel-heen", "boot-enkel-terug", "boot-retour", "fiets-huur"]);

const formatNextDeparture = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return format(d, "EEE d MMM HH:mm", { locale: nl });
};

const NextDeparture = ({ iso }: { iso: string }) => {
  const next = formatNextDeparture(iso);
  if (!next) return null;
  return (
    <p className="flex items-center gap-1.5">
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      Eerstvolgend: {next}
    </p>
  );
};

const euro = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

/** Kaart voor een direct boekbare activiteit uit de boekmodule zonder eigen bouwsteen. */
const BookableOnlyCard = ({ bundle }: { bundle: BookableBundle }) => (
  <CatalogCard
    image={bundle.image}
    alt={bundle.name}
    to={buildBookingLink(bundle)}
    badge={<Pill tone="brand">Direct boekbaar</Pill>}
    title={bundle.name}
    byline={bundle.partnerName ? `door ${bundle.partnerName}` : undefined}
    text={bundle.description ?? undefined}
    note={<NextDeparture iso={bundle.nextDeparture} />}
    price={{
      value: bundle.pricePerPerson ? euro(bundle.pricePerPerson) : "Op aanvraag",
      note: [bundle.pricePerPerson ? "p.p." : null, `${bundle.momentCount} ${bundle.momentCount === 1 ? "moment" : "momenten"}`].filter(Boolean).join(" · "),
    }}
    primary={{ label: "Direct reserveren", to: buildBookingLink(bundle), icon: Ticket }}
  />
);

const BlockCard = ({ block, bundle, availability }: { block: BuildingBlock; bundle?: BookableBundle; availability: ReturnType<typeof usePublicPartnerUnavailability>["byPartner"] }) => {
  const detail = `/activiteit/${block.slug ?? block.id}`;
  const note = block.provider_id ? availability.get(block.provider_id) : undefined;
  return (
    <CatalogCard
      image={getBlockImage(block)}
      alt={block.name}
      to={detail}
      badge={
        <>
          <Pill tone="neutral" className="bg-card">{categoryLabels[block.category] ?? block.category}</Pill>
          {bundle && <Pill tone="brand">Direct boekbaar</Pill>}
        </>
      }
      title={block.name}
      byline={`door ${getProviderName(block)}`}
      text={block.short_description ?? undefined}
      note={
        (note || bundle) && (
          <div className="space-y-1">
            <PartnerAvailabilityNote note={note} />
            {bundle && <NextDeparture iso={bundle.nextDeparture} />}
          </div>
        )
      }
      price={{ value: formatBlockPrice(block), note: formatPriceNote(block) || undefined }}
      primary={
        bundle
          ? { label: "Direct reserveren", to: detail, icon: Ticket }
          : { label: "Aan programma toevoegen", to: `/programma-samenstellen?block=${block.id}` }
      }
      secondary={bundle ? { label: "Aan programma toevoegen", to: `/programma-samenstellen?block=${block.id}` } : undefined}
      tertiary={{
        label: bundle ? "Liever aanvragen in plaats van direct boeken?" : "Liever dit ene onderdeel snel aanvragen?",
        to: `/snel-aanvragen?block=${block.id}`,
      }}
    />
  );
};

const faq = [
  {
    question: "Wat is een bouwsteen?",
    answer: "Een bouwsteen is een los programmaonderdeel, zoals een activiteit, excursie, lunch, diner, vergaderruimte of vervoer, dat u kunt combineren tot een compleet programma op Vlieland.",
  },
  {
    question: "Kan ik een losse activiteit boeken zonder programma?",
    answer: `Ja. Elke bouwsteen is los aan te vragen. Wij checken de beschikbaarheid bij de aanbieder en u ontvangt ${RESPONSE_TIME.within} een voorstel. Bouwstenen met het label "Direct boekbaar" reserveert u meteen online.`,
  },
  {
    question: "Staan de prijzen inclusief btw?",
    answer: "Alle getoonde bedragen zijn inclusief btw. Op de factuur staat de btw apart gespecificeerd.",
  },
  {
    question: "Hoe ver van tevoren moet ik boeken?",
    answer: "In het hoogseizoen (mei tot en met oktober) adviseren wij minimaal vier tot zes weken vooraf. Buiten het seizoen lukt het vaak op kortere termijn.",
  },
];

const Bouwstenen = () => {
  const { data: blocks, isLoading } = usePublishedBuildingBlocks();
  const { bundles } = useDirectBookableActivities();
  const { byPartner: unavailableByPartner } = usePublicPartnerUnavailability();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<BuildingBlockCategory | "all">("all");
  const [onlyBookable, setOnlyBookable] = useState(false);

  const visibleBlocks = useMemo(() => (blocks ?? []).filter((b) => !HIDDEN_IDS.has(b.id)), [blocks]);

  const { matched, unmatched } = useMemo(() => matchBundlesToBlocks(visibleBlocks, bundles), [visibleBlocks, bundles]);

  const categories = useMemo(() => {
    const set = new Set<BuildingBlockCategory>();
    visibleBlocks.forEach((b) => set.add(b.category));
    return Array.from(set);
  }, [visibleBlocks]);

  const bookableCount = matched.size + unmatched.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleBlocks.filter((b) => {
      if (onlyBookable && !matched.has(b.id)) return false;
      if (activeCategory !== "all" && b.category !== activeCategory) return false;
      if (q) {
        const hay = `${b.name} ${b.short_description ?? ""} ${b.description ?? ""} ${getProviderName(b)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [visibleBlocks, activeCategory, search, onlyBookable, matched]);

  // Activiteiten uit de boekmodule zonder eigen bouwsteen: als losse kaart,
  // alleen bij "Alles" (ze vallen buiten de categorie-indeling).
  const extraBundles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unmatched.filter((bundle) => {
      if (activeCategory !== "all") return false;
      if (q) {
        const hay = `${bundle.name} ${bundle.partnerName ?? ""} ${bundle.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [unmatched, activeCategory, search]);

  const hasFilters = search !== "" || activeCategory !== "all" || onlyBookable;
  const resetFilters = () => {
    setSearch("");
    setActiveCategory("all");
    setOnlyBookable(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Bouwstenen: alle activiteiten en diensten | Bureau Vlieland</title>
        <meta
          name="description"
          content="Bekijk alle bouwstenen voor uw programma op Vlieland: activiteiten, catering, vervoer en meer. Voeg toe aan uw programma of boek direct."
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Bouwstenen | Bureau Vlieland" />
        <meta property="og:description" content="Alle activiteiten en diensten voor uw programma op Vlieland." />
        <meta property="og:url" content={URL} />
      </Helmet>
      <Navigation />
      <LandingBreadcrumb items={[{ label: "Bouwstenen" }]} />

      <main id="main-content">
        <PageHero
          eyebrow="Bouwstenen"
          title="Alle bouwstenen"
          intro="Activiteiten, catering, vervoer en diensten: voeg ze toe aan een programma, vraag ze los aan of reserveer direct."
          cta={{ label: "Stel een programma samen", to: "/programma-samenstellen" }}
          secondary={{ label: "Eén losse activiteit aanvragen", to: "/snel-aanvragen" }}
        />

        <Section spacing="compact">
          <Container size="wide">
            <SectionHeader
              eyebrow="Bouwstenen"
              number="01"
              title="Kies uit het aanbod"
              intro="Zoek of filter op categorie. Een bouwsteen met een boekmodule reserveert u direct; de rest voegt u toe aan uw programma of vraagt u los aan."
            />

            <div className="mt-8 flex flex-col gap-4">
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  aria-label="Zoek een bouwsteen"
                  placeholder="Zoek op naam, partner of trefwoord…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter op categorie">
                <Button variant={activeCategory === "all" && !onlyBookable ? "default" : "outline"} size="sm" aria-pressed={activeCategory === "all" && !onlyBookable} onClick={() => { setActiveCategory("all"); setOnlyBookable(false); }}>
                  Alles ({visibleBlocks.length})
                </Button>
                {categories.map((cat) => {
                  const count = visibleBlocks.filter((b) => b.category === cat).length;
                  const active = activeCategory === cat;
                  return (
                    <Button key={cat} variant={active ? "default" : "outline"} size="sm" aria-pressed={active} onClick={() => { setActiveCategory(cat); setOnlyBookable(false); }}>
                      {categoryLabels[cat] ?? cat} ({count})
                    </Button>
                  );
                })}
                {bookableCount > 0 && (
                  <Button
                    variant={onlyBookable ? "default" : "outline"}
                    size="sm"
                    aria-pressed={onlyBookable}
                    onClick={() => {
                      setOnlyBookable((v) => !v);
                      setActiveCategory("all");
                    }}
                  >
                    <Zap aria-hidden="true" />
                    Direct boekbaar ({bookableCount})
                  </Button>
                )}
              </div>
            </div>

            {isLoading ? (
              <LoadingState label="Bouwstenen laden…" className="mt-10" />
            ) : filtered.length === 0 && extraBundles.length === 0 ? (
              <EmptyState
                className="mt-10"
                icon={<Search />}
                title="Geen bouwstenen gevonden voor deze selectie."
                description="Probeer een andere zoekterm of categorie."
                action={hasFilters ? <Button variant="outline" size="sm" onClick={resetFilters}>Filters wissen</Button> : undefined}
              />
            ) : (
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Bouwstenen">
                {filtered.map((block) => (
                  <li key={block.id}>
                    <BlockCard block={block} bundle={matched.get(block.id)} availability={unavailableByPartner} />
                  </li>
                ))}
                {extraBundles.map((bundle) => (
                  <li key={`map-${bundle.activityTypeId}`}>
                    <BookableOnlyCard bundle={bundle} />
                  </li>
                ))}
              </ul>
            )}
          </Container>
        </Section>

        <RouteChooser
          title="Klaar om uw programma samen te stellen?"
          intro="Combineer bouwstenen tot een compleet programma en vraag een vrijblijvende offerte aan. Eén aanspreekpunt, één factuur."
        />

        <FaqSection schemaId="bouwstenen" pageUrl={URL} items={faq} />
        <RelatedLinks />
      </main>

      <Footer />
    </div>
  );
};

export default Bouwstenen;
