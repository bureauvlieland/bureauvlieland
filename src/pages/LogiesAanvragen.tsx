import { RESPONSE_TIME } from "@/content/promises";
import { Helmet } from "react-helmet";
import { Link, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { AccommodationWizard } from "@/components/accommodation/AccommodationWizard";
import { parseISO, isValid } from "date-fns";
import { useMemo } from "react";
import { Container, FunnelHead, Notice, Section, SectionHeader } from "@/components/system";

const HOW_IT_WORKS = [
  { step: 1, title: "Vul uw wensen in", description: "Datum, groepsgrootte en type accommodatie." },
  { step: 2, title: "Wij zoeken voor u", description: "Bureau Vlieland vraagt offertes aan bij geschikte accommodaties." },
  { step: 3, title: "Vergelijk de offertes", description: "U ontvangt een overzicht van alle opties." },
  { step: 4, title: "Boek via Bureau Vlieland", description: "Wij begeleiden het boekingsproces voor u." },
];

const LogiesAanvragen = () => {
  const [searchParams] = useSearchParams();

  // Check if coming from configurator
  const fromConfigurator = searchParams.get("fromConfigurator") === "true";

  // Get program token if coming from customer portal
  const linkedProgramToken = searchParams.get("programToken") || undefined;

  // Parse URL parameters for pre-filling
  const initialData = useMemo(() => {
    const arrivalParam = searchParams.get("arrival");
    const departureParam = searchParams.get("departure");
    const guestsParam = searchParams.get("guests");

    const result: {
      arrival_date?: Date;
      departure_date?: Date;
      number_of_guests?: number;
    } = {};

    if (arrivalParam) {
      const parsed = parseISO(arrivalParam);
      if (isValid(parsed)) {
        result.arrival_date = parsed;
      }
    }

    if (departureParam) {
      const parsed = parseISO(departureParam);
      if (isValid(parsed)) {
        result.departure_date = parsed;
      }
    }

    if (guestsParam) {
      const parsed = parseInt(guestsParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        result.number_of_guests = parsed;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }, [searchParams]);

  const hasPrefilledData = !!initialData;

  return (
    <>
      <Helmet>
        <title>Logies aanvragen | Bureau Vlieland</title>
        <meta
          name="description"
          content="Vraag eenvoudig verblijfsaccommodatie aan voor uw groep op Vlieland. Hotels, vakantiewoningen, groepsaccommodaties en meer."
        />
      </Helmet>

      <Navigation />

      <main id="main-content" className="min-h-screen bg-background">
        <FunnelHead
          eyebrow="Logies"
          title="Vraag logies aan voor uw groep"
          intro={`Vertel ons uw wensen, dan vragen wij offertes aan bij passende accommodaties op Vlieland en kiest u uit het overzicht. Vrijblijvend. ${RESPONSE_TIME.sentence}`}
        />

        <AccommodationWizard
          initialData={initialData}
          fromConfigurator={fromConfigurator}
          linkedProgramToken={linkedProgramToken}
          notice={
            hasPrefilledData ? (
              <Notice tone="info" title="Gegevens overgenomen uit uw programma">
                De datums en groepsgrootte zijn ingevuld; u kunt ze aanpassen.{" "}
                <Link to="/programma-samenstellen" className="underline underline-offset-2">
                  Terug naar uw programma
                </Link>
              </Notice>
            ) : undefined
          }
        />

        <Section tone="muted">
          <Container size="content">
            <SectionHeader as="h2" size="md" weight="medium" align="center" title="Zo werkt het" className="mb-8" />
            <div className="grid gap-6 md:grid-cols-4">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="mb-1 font-medium text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
};

export default LogiesAanvragen;
