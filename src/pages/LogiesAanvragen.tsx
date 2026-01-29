import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { AccommodationWizard } from "@/components/accommodation/AccommodationWizard";
import { BedDouble, CheckCircle, Clock, Euro, Info } from "lucide-react";
import { parseISO, isValid } from "date-fns";
import { useMemo } from "react";

const LogiesAanvragen = () => {
  const [searchParams] = useSearchParams();

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

    // Parse arrival date
    if (arrivalParam) {
      const parsed = parseISO(arrivalParam);
      if (isValid(parsed)) {
        result.arrival_date = parsed;
      }
    }

    // Parse departure date
    if (departureParam) {
      const parsed = parseISO(departureParam);
      if (isValid(parsed)) {
        result.departure_date = parsed;
      }
    }

    // Parse guests
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
        <title>Logies Aanvragen | Bureau Vlieland</title>
        <meta
          name="description"
          content="Vraag eenvoudig verblijfsaccommodatie aan voor uw groep op Vlieland. Hotels, vakantiewoningen, groepsaccommodaties en meer."
        />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background pt-24 pb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <BedDouble className="w-4 h-4" />
                Verblijf op Vlieland
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Vraag logies aan voor uw groep
              </h1>
              <p className="text-muted-foreground text-lg mb-8">
                Vertel ons over uw wensen en wij vragen offertes aan bij de beste 
                accommodaties op Vlieland. U ontvangt een overzicht om uit te kiezen.
              </p>

              {/* USP Icons */}
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Vrijblijvend</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Binnen 2 dagen reactie</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Euro className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Gratis advies</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Wizard Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {/* Show info banner when data is pre-filled */}
            {hasPrefilledData && (
              <div className="max-w-4xl mx-auto mb-6">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      Gegevens overgenomen uit uw programma
                    </p>
                    <p className="text-sm text-muted-foreground">
                      De datums en groepsgrootte zijn automatisch ingevuld. U kunt deze indien nodig aanpassen.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <AccommodationWizard 
              initialData={initialData}
              onSuccess={(token) => {
                // Could navigate to a confirmation/tracking page
                console.log("Request submitted with token:", token);
              }}
            />
          </div>
        </section>

        {/* Info Section */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-semibold mb-6 text-center">
                Hoe werkt het?
              </h2>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  {
                    step: 1,
                    title: "Vul uw wensen in",
                    description: "Datum, groepsgrootte en type accommodatie",
                  },
                  {
                    step: 2,
                    title: "Wij zoeken voor u",
                    description: "Bureau Vlieland vraagt offertes aan bij geschikte accommodaties",
                  },
                  {
                    step: 3,
                    title: "Vergelijk offertes",
                    description: "U ontvangt een overzicht van alle opties",
                  },
                  {
                    step: 4,
                    title: "Boek direct",
                    description: "Kies uw favoriet en boek rechtstreeks bij de accommodatie",
                  },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto mb-3">
                      {item.step}
                    </div>
                    <h3 className="font-medium mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LogiesAanvragen;
