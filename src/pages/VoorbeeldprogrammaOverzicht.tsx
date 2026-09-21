import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { BookOpen, MessageSquareHeart, PenLine, Search } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { FaqSection } from "@/components/FaqSection";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { Button } from "@/components/ui/button";
import { Container, EmptyState, LoadingState, PageHero, RouteChooser, Section, SectionHeader, type RouteChooserRoute } from "@/components/system";
import { TemplateCard } from "@/components/programmas/TemplateCard";
import { usePublishedTemplates } from "@/hooks/useProgramTemplates";
import { inferTheme, durationBucket, THEME_META, type ProgramTheme } from "@/lib/programTemplateTheme";

const URL = "https://bureauvlieland.nl/voorbeeldprogrammas";

type DurationFilter = "all" | "1" | "2" | "3" | "4+";
type ThemeFilter = "all" | ProgramTheme;

const DURATION_OPTIONS: { id: DurationFilter; label: string }[] = [
  { id: "all", label: "Alle duren" },
  { id: "1", label: "1 dag" },
  { id: "2", label: "2 dagen" },
  { id: "3", label: "3 dagen" },
  { id: "4+", label: "4+ dagen" },
];

const routes: RouteChooserRoute[] = [
  {
    icon: PenLine,
    title: "Stel zelf uw programma samen",
    text: "Kies activiteiten, catering en vervoer in een paar stappen. U ziet meteen prijzen per onderdeel.",
    to: "/programma-samenstellen",
    label: "Begin met samenstellen",
    primary: true,
  },
  {
    icon: MessageSquareHeart,
    title: "Programma op maat",
    text: "Liever niet zelf puzzelen? Vertel ons uw wensen, dan sturen wij een persoonlijk voorstel.",
    to: "/programma-op-maat",
    label: "Vertel ons uw wensen",
  },
  {
    icon: BookOpen,
    title: "Liever even overleggen?",
    text: "Bel 0562 700 208 of stuur een bericht. Wij denken graag mee over een programma dat bij uw groep past.",
    to: "/contact",
    label: "Neem contact op",
  },
];

const faq = [
  {
    question: "Wat is een voorbeeldprogramma?",
    answer: "Een voorbeeldprogramma is een kant-en-klare dagindeling voor Vlieland, samengesteld uit activiteiten, catering en vervoer. U kunt het één op één overnemen of als startpunt gebruiken.",
  },
  {
    question: "Kan ik een voorbeeldprogramma aanpassen?",
    answer: "Ja. Elk programma is volledig aanpasbaar: onderdelen wisselen, tijden verschuiven of dagen toevoegen kan altijd.",
  },
  {
    question: "Zijn de genoemde prijzen definitief?",
    answer: "De getoonde bedragen zijn richtprijzen inclusief btw op basis van een standaard groepsgrootte. Uw definitieve offerte volgt na uw aanvraag.",
  },
  {
    question: "Zit de overtocht bij het programma inbegrepen?",
    answer: "In de meeste voorbeeldprogramma's is de veerboot vanuit Harlingen opgenomen. Bij uw aanvraag kunt u aangeven of u dit zelf regelt.",
  },
];

const VoorbeeldprogrammaOverzicht = () => {
  const { data: templates, isLoading } = usePublishedTemplates();
  const [duration, setDuration] = useState<DurationFilter>("all");
  const [theme, setTheme] = useState<ThemeFilter>("all");

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => {
      if (duration !== "all" && durationBucket(t.duration_days) !== duration) return false;
      if (theme !== "all" && inferTheme(t.name, t.description) !== theme) return false;
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
          url: `${URL}/${t.id}`,
          name: t.name,
        })),
      }
    : null;

  const hasFilters = duration !== "all" || theme !== "all";
  const resetFilters = () => {
    setDuration("all");
    setTheme("all");
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Voorbeeldprogramma's Vlieland | Bureau Vlieland</title>
        <meta
          name="description"
          content={`${templates?.length ?? "Diverse"} kant-en-klare programma's voor uw groep op Vlieland: kies een programma en pas het naar wens aan.`}
        />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="Voorbeeldprogramma's Vlieland | Bureau Vlieland" />
        <meta property="og:description" content="Kant-en-klare programma's voor groepen op Vlieland, van avontuur tot wellness." />
        <meta property="og:url" content={URL} />
        {itemListJsonLd && <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>}
      </Helmet>
      <Navigation />
      <LandingBreadcrumb items={[{ label: "Voorbeeldprogramma's" }]} />

      <main id="main-content">
        <PageHero
          eyebrow="Voorbeeldprogramma's"
          title="Kant-en-klare programma's voor uw groep"
          intro="Dagindelingen van eerdere groepen, van een actieve eilanddag tot een meerdaagse heisessie. Laat u inspireren en pas ze naar wens aan; elk programma is volledig aanpasbaar."
          cta={{ label: "Stel zelf uw programma samen", to: "/programma-samenstellen" }}
          secondary={{ label: "Liever maatwerk?", to: "/programma-op-maat" }}
        />

        <Section spacing="compact">
          <Container size="wide">
            <SectionHeader
              eyebrow="Voorbeeldprogramma's"
              number="01"
              title="Onze programma's"
              intro="Filter op duur of thema; klik op een programma voor de volledige dagindeling."
            />

            <div className="mt-8 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter op duur">
                <span className="mr-1 text-sm font-medium text-muted-foreground">Duur:</span>
                {DURATION_OPTIONS.map((opt) => (
                  <Button key={opt.id} variant={duration === opt.id ? "default" : "outline"} size="sm" aria-pressed={duration === opt.id} onClick={() => setDuration(opt.id)}>
                    {opt.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter op thema">
                <span className="mr-1 text-sm font-medium text-muted-foreground">Thema:</span>
                <Button variant={theme === "all" ? "default" : "outline"} size="sm" aria-pressed={theme === "all"} onClick={() => setTheme("all")}>
                  Alle thema's
                </Button>
                {Object.values(THEME_META).map((t) => (
                  <Button key={t.id} variant={theme === t.id ? "default" : "outline"} size="sm" aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <LoadingState label="Programma's laden…" className="mt-10" />
            ) : filtered.length > 0 ? (
              <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Voorbeeldprogramma's">
                {filtered.map((t) => (
                  <li key={t.id}>
                    <TemplateCard template={t} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                className="mt-10"
                icon={<Search />}
                title="Geen programma's gevonden met deze filters."
                description="Kies een andere duur of een ander thema."
                action={hasFilters ? <Button variant="outline" size="sm" onClick={resetFilters}>Filters wissen</Button> : undefined}
              />
            )}
          </Container>
        </Section>

        <RouteChooser
          title="Geen passend programma gevonden?"
          intro="Stel uw eigen programma samen uit onze bouwstenen, of vertel ons uw wensen voor een voorstel op maat."
          routes={routes}
        />

        <FaqSection schemaId="voorbeeldprogrammas" pageUrl={URL} items={faq} />
        <RelatedLinks />
      </main>

      <Footer />
    </div>
  );
};

export default VoorbeeldprogrammaOverzicht;
