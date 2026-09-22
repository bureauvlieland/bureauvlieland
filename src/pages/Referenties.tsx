import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { BookOpen, MessageSquareHeart, PenLine } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { LandingBreadcrumb } from "@/components/LandingBreadcrumb";
import { Button } from "@/components/ui/button";
import { Container, EmptyState, LoadingState, PageHero, RouteChooser, Section, SectionHeader, type RouteChooserRoute } from "@/components/system";
import { ReferenceCard } from "@/components/referenties/ReferenceCard";
import { usePublishedReferenceCases } from "@/hooks/usePublishedReferenceCases";
import { WIZARD_PATH } from "@/lib/referenceCases";

/**
 * Overzicht van de referentiepagina's (docs/plan-reviews-oogsten.md, fase 3):
 * echte programma's van eerdere groepen, met akkoord van de klant. Elke
 * kaart is de link naar de pagina met de dagindeling en het citaat.
 */
const URL = "https://bureauvlieland.nl/referenties";
const TITLE = "Referenties: zo deden andere groepen het | Bureau Vlieland";
const DESCRIPTION =
  "Echte programma's van groepen die met Bureau Vlieland op Vlieland waren: de dagindeling, de feiten en wat de opdrachtgever erover zegt.";

const routes: RouteChooserRoute[] = [
  {
    icon: PenLine,
    title: "Stel zelf uw programma samen",
    text: "Kies activiteiten, catering en vervoer in een paar stappen. U ziet meteen prijzen per onderdeel.",
    to: WIZARD_PATH,
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
    title: "Voorbeeldprogramma's",
    text: "Kant-en-klare dagindelingen, per duur en thema, als vertrekpunt voor uw eigen programma.",
    to: "/voorbeeldprogrammas",
    label: "Bekijk de voorbeelden",
  },
];

const Referenties = () => {
  const { data: cases = [], isLoading } = usePublishedReferenceCases();

  const itemListJsonLd =
    cases.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: cases.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${URL}/${c.slug}`, name: c.title })),
        }
      : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={URL} />
        {itemListJsonLd && <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>}
      </Helmet>
      <Navigation />
      <LandingBreadcrumb items={[{ label: "Referenties" }]} />

      <main id="main-content">
        <PageHero
          eyebrow="Referenties"
          title="Zo deden andere groepen het"
          intro="Echte programma's van groepen die met ons op Vlieland waren: de dagindeling, de feiten en wat de opdrachtgever erover zegt. Elke pagina staat er met akkoord van de klant, en elk programma is als vertrekpunt voor uw eigen programma te gebruiken."
          cta={{ label: "Stel zelf uw programma samen", to: WIZARD_PATH }}
          secondary={{ label: "Liever maatwerk?", to: "/programma-op-maat" }}
        />

        <Section spacing="compact">
          <Container size="wide">
            <SectionHeader
              eyebrow="Referenties"
              number="01"
              title="Programma's van eerdere groepen"
              intro="Klik op een referentie voor de dagindeling en het citaat van de opdrachtgever."
            />
            {isLoading ? (
              <div className="mt-10">
                <LoadingState label="Referenties laden…" />
              </div>
            ) : cases.length === 0 ? (
              <div className="mt-10">
                <EmptyState
                  title="Nog geen referenties online"
                  description="De eerste referentiepagina's verschijnen zodra klanten hun akkoord hebben gegeven. Bekijk intussen de voorbeeldprogramma's."
                  action={
                    <Button asChild variant="outline">
                      <Link to="/voorbeeldprogrammas">Naar de voorbeeldprogramma's</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Referenties">
                {cases.map((c) => (
                  <li key={c.id}>
                    <ReferenceCard item={c} />
                  </li>
                ))}
              </ul>
            )}
          </Container>
        </Section>

        <RouteChooser
          title="Klaar voor uw eigen programma?"
          intro="Kies zelf uw onderdelen of laat ons een voorstel maken. Eén partij, één factuur."
          routes={routes}
        />

        <RelatedLinks pathname="/voorbeeldprogrammas" title="Zelf verder bouwen" />
      </main>

      <Footer />
    </div>
  );
};

export default Referenties;
