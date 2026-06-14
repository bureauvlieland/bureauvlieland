import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { CateringQuickRequest } from "@/components/catering/CateringQuickRequest";

const CateringAanvragen = () => {
  const [params] = useSearchParams();
  const type = params.get("type");

  return (
    <>
      <Helmet>
        <title>Catering aanvragen op Vlieland – Bureau Vlieland</title>
        <meta
          name="description"
          content="Vraag catering aan op Vlieland: lunch, borrel, Beach Grill of diner. Vrijblijvend voorstel op maat binnen 2 werkdagen. Aanvragen graag minimaal 7 dagen vóór de gewenste datum."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/catering-aanvragen" />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 bg-background">
          <section className="border-b bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-10">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Catering aanvragen
              </h1>
              <p className="text-muted-foreground mt-2">
                Vertel ons kort wat u zoekt. Wij komen binnen 2 werkdagen met een voorstel op maat —
                vrijblijvend en zonder verplichtingen. <span className="font-medium text-foreground">Aanvragen graag minimaal 7 dagen vóór de gewenste datum.</span>
              </p>
            </div>
          </section>
          <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-10">
            <CateringQuickRequest initialType={type} />
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default CateringAanvragen;

