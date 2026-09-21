import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Calendar, Euro, MessageSquareHeart, PenLine, Sparkles, Users } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { StickyMobileCTA } from "@/components/home/StickyMobileCTA";
import { Button } from "@/components/ui/button";
import { useTemplateWithItems, usePublishedTemplates } from "@/hooks/useProgramTemplates";
import { ProgramTimeline } from "@/components/programmas/ProgramTimeline";
import { TemplateCard } from "@/components/programmas/TemplateCard";
import { BodySection, Checklist, Paragraphs } from "@/components/landing/sections";
import { sectionCounter } from "@/components/landing/sectionCounter";
import { Container, FactList, LoadingState, Notice, PageHero, Pill, RouteChooser, Section, SectionHeader, type RouteChooserRoute } from "@/components/system";
import { getTemplateCopy } from "@/lib/programTemplateCopy";
import { renderRichText } from "@/lib/richText";
import { transformImageUrl } from "@/lib/supabaseImage";
import heroVlieland from "@/assets/hero-vlieland.jpg";

const SITE = "https://bureauvlieland.nl";
const EYEBROW = "Voorbeeldprogramma";

const days = (n: number) => `${n} ${n === 1 ? "dag" : "dagen"}`;

const VoorbeeldprogrammaDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading, isError } = useTemplateWithItems(slug || null);
  const { data: allTemplates } = usePublishedTemplates();

  useEffect(() => {
    if (!isLoading && (isError || (slug && template === null))) {
      navigate("/voorbeeldprogrammas", { replace: true });
    }
  }, [isLoading, isError, template, slug, navigate]);

  const copy = getTemplateCopy(slug);
  const related = (allTemplates || []).filter((t) => t.id !== slug).slice(0, 3);
  const canonical = `${SITE}/voorbeeldprogrammas/${slug}`;
  const useUrl = `/programma-samenstellen?template=${slug}`;
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

  const heroIntro = copy?.hook || template?.short_description || undefined;
  const factSummary = copy?.hook && template?.short_description && template.short_description !== copy.hook ? template.short_description : undefined;
  const facts = template
    ? [
        { icon: Calendar, label: "Duur", value: days(template.duration_days) },
        ...(template.target_group ? [{ icon: Users, label: "Doelgroep", value: template.target_group }] : []),
        ...(template.indicative_price_pp ? [{ icon: Euro, label: "Indicatie", value: `vanaf € ${template.indicative_price_pp} p.p., inclusief btw` }] : []),
        ...(copy?.vibe?.length ? [{ icon: Sparkles, label: "Sfeer", value: copy.vibe.join(", ") }] : []),
      ]
    : [];
  const descriptionParagraphs = template?.description ? template.description.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) : [];

  const routes: RouteChooserRoute[] = [
    {
      icon: PenLine,
      title: "Gebruik dit programma",
      text: "Open het programma in de programma-bouwer en pas datum, groepsgrootte en onderdelen aan uw groep aan.",
      to: useUrl,
      label: "Gebruik dit programma",
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
      title: "Andere voorbeelden",
      text: "Bekijk alle kant-en-klare programma's, per duur en thema.",
      to: "/voorbeeldprogrammas",
      label: "Alle voorbeeldprogramma's",
    },
  ];

  const next = sectionCounter();
  const highlightsAt = copy ? next() : null;
  const forWhomAt = copy?.forWhom ? next() : null;
  const practicalAt = copy && template ? next() : null;
  const timelineAt = next();

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
      <LandingBreadcrumb items={[{ label: "Voorbeeldprogramma's", href: "/voorbeeldprogrammas" }, { label: template?.name ?? "Programma" }]} />

      <main id="main-content">
        {isLoading || !template ? (
          <Section>
            <Container size="content">
              <LoadingState label="Programma laden…" />
            </Container>
          </Section>
        ) : (
          <>
            <PageHero
              image={template.image_url ? transformImageUrl(template.image_url, { width: 1800, quality: 80 }) : heroVlieland}
              alt={template.name}
              eyebrow={`${EYEBROW} · ${days(template.duration_days)}`}
              title={template.name}
              intro={heroIntro}
              cta={{ label: "Gebruik dit programma", to: useUrl }}
              secondary={{ label: "Alle voorbeeldprogramma's", to: "/voorbeeldprogrammas" }}
            />

            <Section>
              <Container size="wide">
                <div className="grid gap-10 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <SectionHeader title="Wat u beleeft" />
                    {descriptionParagraphs.length > 0 && <Paragraphs items={descriptionParagraphs} className="mt-6 max-w-3xl" />}
                  </div>
                  <div className="space-y-4 self-start">
                    <FactList title="In het kort" summary={factSummary} items={facts} />
                    <Button asChild size="lg" className="w-full">
                      <Link to={useUrl}>
                        Gebruik dit programma
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">Volledig aan te passen aan uw groep.</p>
                  </div>
                </div>
              </Container>
            </Section>

            {copy && highlightsAt && (
              <BodySection
                section={{ kind: "prose", title: "Wat dit programma bijzonder maakt", paragraphs: copy.story, checklist: copy.highlights }}
                tone={highlightsAt.tone}
                eyebrow={EYEBROW}
                number={highlightsAt.number}
              />
            )}

            {copy?.forWhom && forWhomAt && (
              <Section tone="sand">
                <Container size="content">
                  <SectionHeader eyebrow={EYEBROW} number={forWhomAt.number} title="Voor wie" align="center" />
                  <p className="mx-auto mt-8 max-w-3xl text-center font-display text-display-md font-light leading-snug text-foreground">{copy.forWhom}</p>
                  {copy.vibe && copy.vibe.length > 0 && (
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {copy.vibe.map((v) => (
                        <Pill key={v} tone="neutral" size="md" className="bg-card">
                          {v}
                        </Pill>
                      ))}
                    </div>
                  )}
                </Container>
              </Section>
            )}

            {copy && practicalAt && (
              <Section tone={practicalAt.tone}>
                <Container size="content">
                  <SectionHeader eyebrow={EYEBROW} number={practicalAt.number} title="Praktische informatie" />
                  <div className="mt-8 max-w-3xl">
                    <Checklist items={copy.practical} />
                    {template.duration_days === 2 ? (
                      <Notice tone="info" title="Doordeweekse aankomst aanbevolen" className="mt-8">
                        <p>
                          Voor tweedaagse programma's adviseren wij een aankomst van maandag tot en met donderdag. In het weekend hanteren onze
                          logiespartners doorgaans een minimumverblijf van twee nachten, waardoor een tweedaags arrangement op vrijdag of zaterdag
                          vaak niet mogelijk is. Wij denken graag met u mee over alternatieve data.
                        </p>
                      </Notice>
                    ) : (
                      <p className="mt-8 text-lg font-medium leading-relaxed text-foreground">
                        Dit voorbeeldprogramma is een vertrekpunt. Wij stemmen tijden, activiteiten en aantallen graag met u af, zodat het
                        programma naadloos aansluit bij uw groep en gelegenheid.
                      </p>
                    )}
                  </div>
                </Container>
              </Section>
            )}

            <Section tone={timelineAt.tone}>
              <Container size="content">
                <SectionHeader eyebrow={EYEBROW} number={timelineAt.number} title="Programma per dag" intro="Tijden zijn indicatief; wij stemmen ze af op de boot, het getij en uw groep." />
                <div className="mt-10">
                  <ProgramTimeline template={template} />
                </div>
              </Container>
            </Section>

            {related.length > 0 && (
              <Section tone="sand">
                <Container size="wide">
                  <SectionHeader eyebrow="Verder kijken" title="Andere programma's" align="center" />
                  <ul className="mt-12 grid gap-4 md:grid-cols-3" aria-label="Andere voorbeeldprogramma's">
                    {related.map((t) => (
                      <li key={t.id}>
                        <TemplateCard template={t} />
                      </li>
                    ))}
                  </ul>
                  <p className="mt-8 text-center text-sm text-muted-foreground">
                    {renderRichText("Alle voorbeelden staan bij [voorbeeldprogramma's](/voorbeeldprogrammas).")}
                  </p>
                </Container>
              </Section>
            )}

            <RouteChooser
              title="Klaar voor uw eilandbeleving?"
              intro="Pas datum, groepsgrootte en activiteiten naar wens aan; wij verzorgen de rest. Eén partij, één factuur."
              routes={routes}
            />
          </>
        )}

        <RelatedLinks pathname="/voorbeeldprogrammas" title="Zelf verder bouwen" />
      </main>

      <Footer />
      {template && <StickyMobileCTA label="Gebruik dit programma" to={useUrl} />}
    </div>
  );
};

export default VoorbeeldprogrammaDetail;
