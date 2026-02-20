import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  BedDouble,
  Calendar,
  CheckCircle2,
  FileText,
  Mail,
  Phone,
  Users,
  ChevronRight,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";

interface StatusSummary {
  total: number;
  confirmed: number;
  pending: number;
  alternative: number;
  progress: number;
  counter_proposed?: number;
}

interface CustomerPortalSplashProps {
  program: {
    customer_name: string;
    customer_company?: string;
    reference_number?: string | null;
    number_of_people: number;
    terms_accepted_at?: string;
  };
  selectedDates: Date[];
  statusSummary: StatusSummary;
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
  isMultiDay: boolean;
  onNavigate: (tab: "accommodation" | "program") => void;
}

const steps = [
  {
    number: 1,
    title: "Logies regelen",
    description: "Offertes vergelijken & keuze maken",
    icon: BedDouble,
    multiDayOnly: true,
  },
  {
    number: 2,
    title: "Programma bekijken",
    description: "Activiteiten beoordelen & goedkeuren",
    icon: Calendar,
    multiDayOnly: false,
  },
  {
    number: 3,
    title: "Akkoord geven",
    description: "Facturatiegegevens invullen & ondertekenen",
    icon: FileText,
    multiDayOnly: false,
  },
  {
    number: 4,
    title: "Klaar!",
    description: "Bevestiging van alle onderdelen",
    icon: CheckCircle2,
    multiDayOnly: false,
  },
];

function getAccommodationStatus(
  accommodation: AccommodationRequest | null,
  quotes: AccommodationQuote[]
): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  const selected = quotes.some((q) => q.status === "selected");
  if (selected) return { label: "✓ Gekozen", variant: "default" };
  const submitted = quotes.some((q) => q.status === "submitted");
  if (submitted) return { label: "Offertes ontvangen", variant: "secondary" };
  if (accommodation) return { label: "In behandeling", variant: "outline" };
  return { label: "Nog te regelen", variant: "outline" };
}

function getProgramStatus(statusSummary: StatusSummary, termsAccepted: boolean): {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
} {
  if (termsAccepted) return { label: "✓ Ondertekend", variant: "default" };
  if (statusSummary.total === 0) return { label: "Nog geen activiteiten", variant: "outline" };
  if (statusSummary.pending === 0 && statusSummary.alternative === 0)
    return { label: "Klaar voor akkoord", variant: "secondary" };
  if (statusSummary.alternative > 0) return { label: "Actie vereist", variant: "destructive" };
  return { label: `${statusSummary.confirmed}/${statusSummary.total} bevestigd`, variant: "outline" };
}

export const CustomerPortalSplash = ({
  program,
  selectedDates,
  statusSummary,
  accommodation,
  accommodationQuotes,
  isMultiDay,
  onNavigate,
}: CustomerPortalSplashProps) => {
  const termsAccepted = !!program.terms_accepted_at;
  const accStatus = getAccommodationStatus(accommodation, accommodationQuotes);
  const progStatus = getProgramStatus(statusSummary, termsAccepted);
  const visibleSteps = steps.filter((s) => !s.multiDayOnly || isMultiDay);

  const dateRange =
    selectedDates.length > 0
      ? selectedDates.length === 1
        ? format(selectedDates[0], "d MMMM yyyy", { locale: nl })
        : `${format(selectedDates[0], "d MMM", { locale: nl })} – ${format(
            selectedDates[selectedDates.length - 1],
            "d MMM yyyy",
            { locale: nl }
          )}`
      : null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Blok 1: Welkomstboodschap */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welkom{program.customer_company ? `, ${program.customer_company}` : program.customer_name ? `, ${program.customer_name}` : ""}
          </h1>
          {program.reference_number && (
            <p className="text-sm text-muted-foreground mt-1">Kenmerk: {program.reference_number}</p>
          )}
          {dateRange && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              {dateRange}
              {program.number_of_people > 0 && (
                <>
                  <span className="mx-1">·</span>
                  <Users className="h-3.5 w-3.5" />
                  {program.number_of_people} personen
                </>
              )}
            </p>
          )}
        </div>

        <p className="text-muted-foreground">
          Via dit portaal kunt u uw verblijf op Vlieland samenstellen en goedkeuren. Bureau Vlieland coördineert alles — u houdt overzicht.
        </p>

        {/* Werkdocument disclaimer */}
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Dit is een werkdocument.</strong> Onderdelen, aantallen en tijden kunnen we samen verder aanscherpen.
            Na afstemming maken we het voorstel definitief.
          </p>
        </div>
      </div>

      {/* Blok 2: Hoe werkt het traject? */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Hoe werkt het traject?</h2>
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute top-6 left-6 right-6 h-0.5 bg-border hidden sm:block" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {visibleSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative flex flex-col items-center text-center gap-2 p-3">
                  <div className="z-10 w-12 h-12 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Stap {step.number}</p>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Blok 3: Logies en Programma los van elkaar */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Twee onafhankelijke trajecten</h2>
        <p className="text-sm text-muted-foreground">
          Logies en programma worden los van elkaar geregeld. Elk onderdeel heeft zijn eigen aanbieder en facturatie.
        </p>

        <div className={`grid gap-4 ${isMultiDay ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          {/* Logies card – alleen tonen bij meerdaags */}
          {isMultiDay && (
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BedDouble className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">Logies</h3>
                  </div>
                  <Badge variant={accStatus.variant}>{accStatus.label}</Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  Bureau Vlieland vraagt offertes aan bij passende accommodaties op het eiland.
                  U vergelijkt en kiest de optie die het beste past.
                </p>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Receipt className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <strong>Factuur van:</strong> de accommodatieaanbieder rechtstreeks aan u.
                    Bureau Vlieland is geen partij in de financiële afhandeling van het logies.
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant={accommodationQuotes.some((q) => q.status === "selected") ? "outline" : "default"}
                  onClick={() => onNavigate("accommodation")}
                >
                  {accommodationQuotes.some((q) => q.status === "selected")
                    ? "Logies bekijken"
                    : accommodation
                    ? "Offertes bekijken"
                    : "Logies regelen"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Programma card */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Programma</h3>
                </div>
                <Badge variant={progStatus.variant}>{progStatus.label}</Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                Bureau Vlieland coördineert de activiteiten en stemt af met de aanbieders.
                Bekijk het programma, geef feedback en geef akkoord.
              </p>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Receipt className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <strong>Factuur van:</strong> Bureau Vlieland (coördinatie) én individuele aanbieders
                  voor hun eigen activiteiten — afhankelijk van het facturatiemodel.
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => onNavigate("program")}
              >
                {termsAccepted ? "Programma bekijken" : statusSummary.total > 0 ? "Programma beoordelen" : "Programma bekijken"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Blok 4: Contact */}
      <div className="border-t pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-medium text-sm">Vragen?</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Neem contact op met Bureau Vlieland</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:hallo@bureauvlieland.nl"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-4 w-4" />
              hallo@bureauvlieland.nl
            </a>
            <a
              href="tel:+31562451515"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-4 w-4" />
              0562 – 45 15 15
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
