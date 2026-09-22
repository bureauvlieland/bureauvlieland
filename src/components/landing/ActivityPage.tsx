import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { FaqSection } from "@/components/FaqSection";
import { ReviewsBlock } from "@/components/reviews/ReviewsBlock";
import { StickyMobileCTA } from "@/components/home/StickyMobileCTA";
import { WaddenAmbassadeurBadge } from "@/components/WaddenAmbassadeurBadge";
import { DirectBookingPanel } from "@/components/map/DirectBookingPanel";
import { Button } from "@/components/ui/button";
import { usePublishedBuildingBlocks, getBlockById } from "@/hooks/useBuildingBlocks";
import { useDirectBookableActivities } from "@/hooks/useDirectBookableActivities";
import { findBundleForBlock } from "@/lib/directBookable";
import { Container, FactList, PageHero, Section, SectionHeader, type SectionTone } from "@/components/system";
import type { ActivityLandingContent } from "@/content/landings/types";
import { BodySection, Paragraphs } from "./sections";
import { sectionCounter } from "./sectionCounter";

/**
 * De tweede variant van het landingssjabloon (ontwerpsysteem fase 3 deel 2):
 * een pagina voor één boekbare activiteit. Zelfde opbouw als `LandingPage`
 * (kruimelpad, foto-hero, intro, genummerde secties, FAQ, reviews, één
 * linkblok), met daarnaast de kaart "In het kort" en een boekblok. Hangt de
 * bouwsteen aan de boekmodule, dan boekt de pagina direct; anders stuurt
 * ze naar het aanvraagformulier. Geen keuzeblok: de actie is hier boeken.
 */
const SITE = "https://bureauvlieland.nl";

export const ActivityPage = ({ content }: { content: ActivityLandingContent }) => {
  const canonical = `${SITE}${content.path}`;
  const heroImageAbs = `${SITE}${content.hero.image}`;

  const { data: blocks } = usePublishedBuildingBlocks();
  const { bundles } = useDirectBookableActivities();
  const block = blocks ? getBlockById(blocks, content.booking.blockId) : undefined;
  const bundle = block ? findBundleForBlock(block, bundles) : null;

  const primary = bundle
    ? { label: content.booking.bookLabel, to: "#boeken" }
    : { label: content.booking.requestLabel, to: content.booking.requestPath };
  const trust = [...content.intro.trust, { title: bundle ? content.booking.trustBookable : content.booking.trustRequest }];

  const next = sectionCounter();
  const bookingTone: SectionTone = content.sections.length % 2 === 0 ? "muted" : "default";

  return (
    <>
      <Helmet>
        <title>{content.seo.title}</title>
        <meta name="description" content={content.seo.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={content.seo.title} />
        <meta property="og:description" content={content.seo.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={heroImageAbs} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TouristTrip",
            name: content.trip.name,
            description: content.trip.description,
            touristType: content.trip.touristType,
            url: canonical,
            image: heroImageAbs,
            provider: { "@type": "Organization", name: "Bureau Vlieland" },
            offers: {
              "@type": "AggregateOffer",
              lowPrice: content.trip.lowPrice,
              highPrice: content.trip.highPrice,
              priceCurrency: "EUR",
              availability: "https://schema.org/InStock",
              url: canonical,
            },
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
              { "@type": "ListItem", position: 2, name: content.breadcrumb, item: canonical },
            ],
          })}
        </script>
      </Helmet>

      <Navigation />
      <LandingBreadcrumb items={[{ label: content.breadcrumb }]} />

      <main id="main-content">
        <PageHero
          image={content.hero.image}
          alt={content.hero.alt}
          eyebrow={content.hero.eyebrow}
          title={content.hero.title}
          intro={content.hero.intro}
          cta={primary}
          secondary={{ label: "Offerte voor een groep", to: content.booking.groupRequestPath }}
        />

        <Section>
          <Container size="wide">
            <div className="grid gap-10 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SectionHeader title={content.intro.title} />
                <Paragraphs items={content.intro.paragraphs} className="mt-6 max-w-3xl" />
                <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                  <WaddenAmbassadeurBadge variant="compact" />
                  <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    {trust.map((item) => {
                      const Icon = "icon" in item ? item.icon : undefined;
                      return (
                        <li key={String(item.title)} className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4 text-primary" aria-hidden="true" />}
                          {item.title}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              <FactList title="In het kort" summary={content.summary} items={content.facts} className="self-start" />
            </div>
          </Container>
        </Section>

        {content.sections.map((section, i) => {
          const { number, tone } = next();
          return <BodySection key={`${section.kind}-${i}`} section={section} tone={tone} eyebrow={content.hero.eyebrow} number={number} />;
        })}

        <Section id="boeken" tone={bookingTone} className="scroll-mt-24">
          <Container size="content">
            <SectionHeader
              align="center"
              eyebrow="Boeken"
              title={content.booking.title}
              intro={bundle ? content.booking.intro : content.booking.introRequest}
            />
            <p className="mt-6 text-center text-foreground">
              <strong className="font-medium">{content.booking.price}</strong>
              {content.booking.priceNote && <span className="text-muted-foreground"> ({content.booking.priceNote})</span>}
            </p>
            {bundle ? (
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="w-full max-w-md text-left">
                  <DirectBookingPanel bundle={bundle} />
                </div>
                <Button asChild size="lg" variant="outline">
                  <Link to="/programma-samenstellen">Toevoegen aan mijn programma</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to={content.booking.requestPath}>Aanvragen</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/programma-samenstellen">Toevoegen aan mijn programma</Link>
                </Button>
              </div>
            )}
          </Container>
        </Section>

        <FaqSection schemaId={content.slug} pageUrl={canonical} title={content.faqTitle} items={content.faq} />

        <ReviewsBlock scope={{ landingPath: content.path }} title={content.reviews.title} subtitle={content.reviews.subtitle} />

        <RelatedLinks title="Bekijk ook" links={content.also.map((l) => ({ href: l.to, label: l.label, description: l.description ?? "" }))} />
      </main>

      <Footer />
      <StickyMobileCTA label={primary.label} to={primary.to} />
    </>
  );
};

export default ActivityPage;
