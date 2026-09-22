import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, MessageSquareHeart, PenLine } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { StickyMobileCTA } from "@/components/home/StickyMobileCTA";
import { Container, LoadingState, RouteChooser, Section, SectionHeader, type RouteChooserRoute } from "@/components/system";
import { ReferenceCard } from "@/components/referenties/ReferenceCard";
import { heroImageFor } from "@/components/referenties/heroImage";
import { ReferenceCaseView } from "@/components/referenties/ReferenceCaseView";
import { usePublishedReferenceCase, usePublishedReferenceCases } from "@/hooks/usePublishedReferenceCases";
import { caseKind, wizardUrlForProgram } from "@/lib/referenceCases";

/**
 * Eén referentiepagina (docs/plan-reviews-oogsten.md, fase 3): het
 * programma van een eerdere groep, met akkoord van de klant. "Zoiets ook?"
 * opent de programma-bouwer met dezelfde bouwstenen op dezelfde dagen.
 */
const SITE = "https://bureauvlieland.nl";

const ReferentieDetail = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading, isError } = usePublishedReferenceCase(slug || null);
  const { data: all = [] } = usePublishedReferenceCases();

  useEffect(() => {
    if (!isLoading && (isError || item === null)) {
      navigate("/referenties", { replace: true });
    }
  }, [isLoading, isError, item, navigate]);

  const canonical = `${SITE}/referenties/${slug}`;
  const wizardUrl = item ? wizardUrlForProgram(item.program) : "/programma-samenstellen";
  const others = all.filter((c) => c.slug !== slug).slice(0, 3);
  const kind = item ? caseKind(item) : null;
  const description = item?.intro || "Een programma van een eerdere groep op Vlieland, met de dagindeling en het citaat van de opdrachtgever.";

  const jsonLd = item
    ? {
        "@context": "https://schema.org",
        "@type": "TouristTrip",
        name: item.title,
        description: item.intro || undefined,
        touristType: kind ?? undefined,
        itinerary: { "@type": "ItemList", numberOfItems: item.days },
        provider: { "@type": "Organization", name: "Bureau Vlieland", url: SITE },
      }
    : null;

  const routes: RouteChooserRoute[] = [
    {
      icon: PenLine,
      title: "Gebruik dit programma als vertrekpunt",
      text: "Open dezelfde onderdelen in de programma-bouwer, kies uw datum en groepsgrootte en pas aan wat u wilt.",
      to: wizardUrl,
      label: "Open in de programma-bouwer",
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
      title: "Meer referenties",
      text: "Bekijk hoe andere groepen hun dagen op Vlieland invulden.",
      to: "/referenties",
      label: "Alle referenties",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{item ? `${item.title} | Referentie Bureau Vlieland` : "Referentie | Bureau Vlieland"}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={item?.title ?? "Referentie Bureau Vlieland"} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        {item?.photos[0] && <meta property="og:image" content={heroImageFor(item)} />}
        {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
      </Helmet>
      <Navigation />
      <LandingBreadcrumb items={[{ label: "Referenties", href: "/referenties" }, { label: item?.title ?? "Referentie" }]} />

      <main id="main-content">
        {isLoading || !item ? (
          <Section>
            <Container size="content">
              <LoadingState label="Referentie laden…" />
            </Container>
          </Section>
        ) : (
          <>
            <ReferenceCaseView item={item} cta={{ label: "Zoiets ook?", to: wizardUrl }} secondary={{ label: "Alle referenties", to: "/referenties" }} />

            {others.length > 0 && (
              <Section>
                <Container size="wide">
                  <SectionHeader eyebrow="Verder kijken" title="Andere referenties" align="center" />
                  <ul className="mt-12 grid gap-4 md:grid-cols-3" aria-label="Andere referenties">
                    {others.map((c) => (
                      <li key={c.id}>
                        <ReferenceCard item={c} />
                      </li>
                    ))}
                  </ul>
                </Container>
              </Section>
            )}

            <RouteChooser
              id="zoiets"
              title="Zoiets ook?"
              intro="Dit programma is een vertrekpunt: dezelfde onderdelen, uw datum en groepsgrootte. Wij verzorgen de rest. Eén partij, één factuur."
              routes={routes}
            />
          </>
        )}

        <RelatedLinks pathname="/voorbeeldprogrammas" title="Zelf verder bouwen" />
      </main>

      <Footer />
      {item && <StickyMobileCTA label="Zoiets ook?" to={wizardUrl} />}
    </div>
  );
};

export default ReferentieDetail;
