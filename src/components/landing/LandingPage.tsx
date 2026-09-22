import { Helmet } from "react-helmet";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { LandingPageStructuredData } from "@/components/LandingPageStructuredData";
import { FaqSection } from "@/components/FaqSection";
import { ReviewsBlock } from "@/components/reviews/ReviewsBlock";
import { StickyMobileCTA } from "@/components/home/StickyMobileCTA";
import { usePublishedTemplates } from "@/hooks/useProgramTemplates";
import { transformImageUrl } from "@/lib/supabaseImage";
import { renderRichText } from "@/lib/richText";
import { BodySection, Paragraphs } from "./sections";
import { sectionCounter } from "./sectionCounter";
import {
  Container,
  FactList,
  MediaCard,
  PageHero,
  PersonQuote,
  RouteChooser,
  Section,
  SectionHeader,
  type SectionTone,
} from "@/components/system";
import type { LandingContent } from "@/content/landings/types";

/**
 * Het ene sjabloon voor alle landingspagina's (ontwerpsysteem fase 3).
 * De inhoud komt uit `src/content/landings/*.ts`; dit bestand bepaalt de
 * opbouw: kruimelpad, foto-hero met één actie, intro met eilandfeiten,
 * de secties uit het inhoudsbestand (genummerd), echte voorbeeldprogramma's
 * uit de database, één klantcitaat, Google-reviews, het keuzeblok, de
 * veelgestelde vragen en één linkblok.
 */
const SITE = "https://bureauvlieland.nl";

const TemplatesSection = ({ block, tone, eyebrow, number }: { block: NonNullable<LandingContent["templates"]>; tone: SectionTone; eyebrow: string; number: string }) => {
  const { data: templates = [] } = usePublishedTemplates();
  const picked = templates
    .filter((t) => t.is_published !== false)
    .filter((t) => (block.durationDays ? t.duration_days === block.durationDays : true))
    .filter((t) => (block.minDays ? (t.duration_days ?? 0) >= block.minDays : true))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, block.limit ?? 3);
  if (picked.length === 0) return null;
  return (
    <Section tone={tone}>
      <Container size="wide">
        <SectionHeader eyebrow={eyebrow} number={number} title={block.title} intro={block.intro} align="center" />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {picked.map((t) => (
            <MediaCard
              key={t.id}
              image={t.image_url ? transformImageUrl(t.image_url, { width: 900, quality: 78 }) : null}
              alt={t.name}
              meta={`${t.duration_days} ${t.duration_days === 1 ? "dag" : "dagen"}`}
              title={t.name}
              text={t.short_description ?? undefined}
              to={`/voorbeeldprogrammas/${t.id}`}
            />
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {renderRichText("Alle voorbeelden staan bij [voorbeeldprogramma's](/voorbeeldprogrammas).")}
        </p>
      </Container>
    </Section>
  );
};

export const LandingPage = ({ content }: { content: LandingContent }) => {
  const canonical = `${SITE}${content.path}`;
  const crumbs = [
    { name: "Home", url: SITE },
    ...(content.parent ? [{ name: content.parent.label, url: `${SITE}${content.parent.to}` }] : []),
    { name: content.breadcrumb, url: canonical },
  ];
  const next = sectionCounter();

  return (
    <>
      <Helmet>
        <title>{content.seo.title}</title>
        <meta name="description" content={content.seo.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={content.seo.title} />
        <meta property="og:description" content={content.seo.description} />
        <meta property="og:image" content={`${SITE}/og-image.jpg`} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
      </Helmet>
      <LandingPageStructuredData
        serviceName={content.service.name}
        serviceDescription={content.service.description}
        canonicalUrl={canonical}
        breadcrumbItems={crumbs}
      />

      <Navigation />
      <LandingBreadcrumb
        items={[...(content.parent ? [{ label: content.parent.label, href: content.parent.to }] : []), { label: content.breadcrumb }]}
      />

      <main id="main-content">
        <PageHero
          image={content.hero.image}
          alt={content.hero.alt}
          eyebrow={content.hero.eyebrow}
          title={content.hero.title}
          intro={content.hero.intro}
          cta={{ label: "Stel uw programma samen", to: "/programma-samenstellen" }}
          secondary={{ label: "Liever maatwerk?", to: "/programma-op-maat" }}
        />

        <Section>
          <Container size="wide">
            <div className="grid gap-10 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SectionHeader title={content.intro.title} />
                <Paragraphs items={content.intro.paragraphs} className="mt-6 max-w-3xl" />
              </div>
              {content.facts && <FactList items={content.facts} className="self-start" />}
            </div>
          </Container>
        </Section>

        {content.sections.map((section, i) => {
          const { number, tone } = next();
          return <BodySection key={`${section.kind}-${i}`} section={section} tone={tone} eyebrow={content.hero.eyebrow} number={number} />;
        })}

        {content.templates && (() => {
          const { number, tone } = next();
          return <TemplatesSection block={content.templates} tone={tone} eyebrow={content.hero.eyebrow} number={number} />;
        })()}

        {content.quote && (
          <Section tone="sand">
            <Container size="content">
              <PersonQuote text={content.quote.text} author={content.quote.author} company={content.quote.company} />
            </Container>
          </Section>
        )}

        <ReviewsBlock scope={{ landingPath: content.path }} />

        <RouteChooser />

        <FaqSection schemaId={content.slug} pageUrl={canonical} items={content.faq} />

        <RelatedLinks title="Bekijk ook" links={content.also.map((l) => ({ href: l.to, label: l.label, description: l.description ?? "" }))} />
      </main>

      <Footer />
      <StickyMobileCTA />
    </>
  );
};

export default LandingPage;
