import { RESPONSE_TIME } from "@/content/promises";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RelatedLinks } from "@/components/RelatedLinks";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { CateringQuickRequest } from "@/components/catering/CateringQuickRequest";
import { Container, FunnelHead, Section } from "@/components/system";

const CateringAanvragen = () => {
  const [params] = useSearchParams();
  const type = params.get("type");

  return (
    <>
      <Helmet>
        <title>Catering aanvragen op Vlieland – Bureau Vlieland</title>
        <meta
          name="description"
          content={`Vraag catering aan op Vlieland: lunch, borrel, BBQ op locatie of diner. Vrijblijvend voorstel op maat ${RESPONSE_TIME.within}. Aanvragen graag minimaal 7 dagen vóór de gewenste datum.`}
        />
        <link rel="canonical" href="https://bureauvlieland.nl/catering-aanvragen" />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main id="main-content" className="flex-1 bg-background">
          <FunnelHead
            eyebrow="Catering"
            title="Catering aanvragen"
            intro={`Vertel ons kort wat u zoekt, dan komen wij ${RESPONSE_TIME.within} met een voorstel op maat. Aanvragen graag minimaal 7 dagen vóór de gewenste datum.`}
          />
          <Section spacing="compact">
            <Container size="prose">
              <CateringQuickRequest initialType={type} />
            </Container>
          </Section>
        </main>
        <RelatedLinks />
        <Footer />
      </div>
    </>
  );
};

export default CateringAanvragen;
