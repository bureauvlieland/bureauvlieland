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
import vlielandLandscape from "@/assets/vlieland-landscape.jpg";
import cyclingGroup from "@/assets/cycling-group.jpg";
import sunsetDinner from "@/assets/sunset-dinner.jpg";
import speedboat from "@/assets/speedboat.jpg";
import beachActivity from "@/assets/beach-activity.jpg";

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
    program_type?: string;
    quote_status?: string | null;
    invoicing_mode?: string | null;
  };
  selectedDates: Date[];
  statusSummary: StatusSummary;
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
  isMultiDay: boolean;
  onNavigate: (tab: "accommodation" | "program" | "billing") => void;
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
  const isMaatwerk = !!program.program_type?.startsWith("maatwerk_");
  const isQuoteAwaitingApproval = program.quote_status === "offerte_verstuurd" && !termsAccepted;
  const isMaatwerkEmpty = isMaatwerk && statusSummary.total === 0;
  const accStatus = getAccommodationStatus(accommodation, accommodationQuotes);
  const progStatus = isMaatwerkEmpty 
    ? { label: "In voorbereiding", variant: "outline" as const }
    : isQuoteAwaitingApproval
    ? { label: "Wacht op akkoord", variant: "secondary" as const }
    : getProgramStatus(statusSummary, termsAccepted);
  const effectiveInvoicingMode = program.invoicing_mode ?? null;
  const visibleSteps = steps.filter((s) => !s.multiDayOnly || isMultiDay);
  const dateRange =
    selectedDates.length > 0
      ? selectedDates.length === 1
        ? format(selectedDates[0], "EEE d MMMM yyyy", { locale: nl })
        : `${format(selectedDates[0], "EEE d MMM", { locale: nl })} – ${format(
            selectedDates[selectedDates.length - 1],
            "EEE d MMM yyyy",
            { locale: nl }
          )}`
      : null;

  return (
    <div className="space-y-6">

      {/* Fotomosaic hero — volledige breedte, desktop grid */}
      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-1.5 h-72 rounded-2xl overflow-hidden shadow-medium">
        {/* Grote foto links — met subtiele gradient overlay */}
        <div className="row-span-2 relative overflow-hidden group">
          <img
            src={vlielandLandscape}
            alt="Vlieland landschap"
            loading="eager"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <p className="text-xs font-medium uppercase tracking-widest opacity-80">Bureau Vlieland</p>
            <p className="text-lg font-semibold leading-tight">Uw verblijf op het eiland</p>
          </div>
        </div>
        <div className="overflow-hidden group">
          <img
            src={cyclingGroup}
            alt="Fietsen op Vlieland"
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        </div>
        <div className="overflow-hidden group">
          <img
            src={speedboat}
            alt="Speedboot activiteit"
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        </div>
        <div className="overflow-hidden group">
          <img
            src={sunsetDinner}
            alt="Diner bij zonsondergang"
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        </div>
        <div className="overflow-hidden group">
          <img
            src={beachActivity}
            alt="Strandactiviteit"
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        </div>
      </div>

      {/* Fotomosaic hero — mobiel scrollstrip */}
      <div className="flex sm:hidden gap-2 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory">
        {[
          { src: vlielandLandscape, alt: "Vlieland landschap" },
          { src: cyclingGroup, alt: "Fietsen op Vlieland" },
          { src: sunsetDinner, alt: "Diner bij zonsondergang" },
          { src: speedboat, alt: "Speedboot activiteit" },
          { src: beachActivity, alt: "Strandactiviteit" },
        ].map((photo) => (
          <div key={photo.alt} className="shrink-0 w-52 h-44 rounded-xl overflow-hidden snap-start">
            <img
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Hoofdlayout: 2/3 links + 1/3 rechts (zelfde als vervolgpagina's) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-8 items-start">

        {/* Linkerkolom: welkom + uitleg + stappen + contact */}
        <div className="space-y-6">

          {/* Welkomstboodschap */}
          <div className="space-y-3">
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
              Fijn dat u er bent! Via dit portaal vindt u alles over uw verblijf op Vlieland op één plek.
              Bureau Vlieland coördineert het programma en de logies — u hoeft alleen te kijken, kiezen en akkoord te geven.
            </p>
            <p className="text-muted-foreground text-sm">
              Met vriendelijke eilandgroet,<br />
              <span className="font-medium text-foreground">Erwin</span>
            </p>

            <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {isQuoteAwaitingApproval ? (
                  <><strong>Uw offerte staat klaar.</strong> Open het programma om de onderdelen te bekijken en akkoord te geven.</>
                ) : isMaatwerkEmpty ? (
                  <><strong>Bureau Vlieland is uw programma aan het samenstellen.</strong> Zodra het programma klaar is, vindt u het hier terug. Wij nemen contact met u op.</>
                ) : (
                  <><strong>Dit is een werkdocument.</strong> Onderdelen, aantallen en tijden kunnen we samen verder aanscherpen. Na afstemming maken we het voorstel definitief.</>
                )}
              </p>
            </div>
          </div>

          {/* Hoe werkt het traject? */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Hoe werkt het traject?</h2>
            <div className="relative">
              <div className="absolute top-6 left-6 right-6 h-0.5 bg-border hidden sm:block" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Contact — compact */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
            <span>Vragen?</span>
            <a href="mailto:hallo@bureauvlieland.nl" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Mail className="h-3 w-3" />
              hallo@bureauvlieland.nl
            </a>
            <a href="tel:+31562700208" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Phone className="h-3 w-3" />
              0562 700 208
            </a>
          </div>
        </div>

        {/* Rechterkolom (1/3): logies + programma kaarten */}
        <div className="space-y-4">
          {/* Logies card — alleen bij meerdaags */}
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
                    {effectiveInvoicingMode === "bureau_central" ? (
                      <>
                        <strong>Factuur van:</strong> Bureau Vlieland.
                        De accommodatieaanbieder factureert Bureau Vlieland (inkoop).
                      </>
                    ) : (
                      <>
                        <strong>Factuur van:</strong> Bureau Vlieland.
                      </>
                    )}
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
                {isMaatwerkEmpty
                  ? "Bureau Vlieland stelt uw programma op maat samen. U vindt het straks hier terug."
                  : isQuoteAwaitingApproval
                  ? "Uw offerte staat klaar. Open het programma om per onderdeel of in één keer akkoord te geven."
                  : "Bureau Vlieland coördineert de activiteiten en stemt af met de aanbieders. Bekijk het programma, geef feedback en geef akkoord."
                }
              </p>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Receipt className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                    <>
                      <strong>Factuur van:</strong> Bureau Vlieland.
                      Aanbieders factureren Bureau Vlieland (inkoop).
                    </>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => onNavigate("program")}
              >
                {termsAccepted
                  ? "Programma bekijken"
                  : isQuoteAwaitingApproval
                  ? "Offerte bekijken en akkoord geven"
                  : statusSummary.total > 0
                  ? "Programma beoordelen"
                  : "Programma bekijken"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
