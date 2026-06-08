import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { CateringWizard } from "@/components/catering/CateringWizard";

const CateringAanvragen = () => {
  const [params] = useSearchParams();
  const type = params.get("type");

  return (
    <>
      <Helmet>
        <title>Catering aanvragen op Vlieland – Bureau Vlieland</title>
        <meta
          name="description"
          content="Vraag in 5 stappen catering aan voor uw groep op Vlieland: lunch, borrel, BBQ of diner. Indicatieve prijs direct in beeld, definitieve offerte binnen 2 werkdagen. Aanvragen graag minimaal 7 dagen vóór de gewenste datum."
        />
        <link rel="canonical" href="https://bureauvlieland.nl/catering-aanvragen" />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 bg-background">
          <section className="border-b bg-muted/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-10">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Catering aanvragen
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                In 5 stappen uw catering samengesteld. Indicatieve prijs incl. BTW direct in beeld; definitieve offerte volgt binnen 2 werkdagen. <span className="font-medium text-foreground">Aanvragen graag minimaal 7 dagen vóór de gewenste datum.</span>
              </p>
            </div>
          </section>
          <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-10">
            <CateringWizard initialType={type} />
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default CateringAanvragen;
