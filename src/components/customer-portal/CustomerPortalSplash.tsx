import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Calendar,
  Mail,
  Phone,
  Users,
  AlertCircle,
  Share2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";
import type { ProgramRequestItem } from "@/types/programRequest";
import { isMaatwerkProject } from "@/lib/projectOrigin";
import { useProgramStatus } from "@/hooks/useProgramStatus";
import { ProgramStepper, type StepId } from "./ProgramStepper";
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
    origin?: string | null;
    quote_status?: string | null;
    invoicing_mode?: string | null;
    items?: ProgramRequestItem[];
    billing_company_name?: string;
    billing_address_street?: string;
    billing_address_postal?: string;
    billing_address_city?: string;
    billing_contact_name?: string;
  };
  selectedDates: Date[];
  statusSummary: StatusSummary;
  accommodation: AccommodationRequest | null;
  accommodationQuotes: AccommodationQuote[];
  isMultiDay: boolean;
  onNavigate: (tab: "accommodation" | "program" | "billing" | "accept") => void;
  onShareWithParticipants?: () => void;
}

export const CustomerPortalSplash = ({
  program,
  selectedDates,
  statusSummary,
  accommodation,
  accommodationQuotes,
  isMultiDay,
  onNavigate,
  onShareWithParticipants,
}: CustomerPortalSplashProps) => {
  const items = program.items ?? [];
  const { termsAccepted, billingComplete } = useProgramStatus(
    {
      terms_accepted_at: program.terms_accepted_at,
      billing_company_name: program.billing_company_name,
      billing_address_street: program.billing_address_street,
      billing_address_postal: program.billing_address_postal,
      billing_address_city: program.billing_address_city,
      billing_contact_name: program.billing_contact_name,
      items,
      quote_status: program.quote_status,
    },
    accommodationQuotes,
    statusSummary,
    selectedDates,
  );

  const isMaatwerk = isMaatwerkProject(program);
  const isQuoteAwaitingApproval =
    program.quote_status === "offerte_verstuurd" && !termsAccepted;
  const isMaatwerkEmpty = isMaatwerk && statusSummary.total === 0;

  const accommodationStatus: "none" | "requested" | "selected" =
    accommodationQuotes.some((q) => q.status === "selected")
      ? "selected"
      : accommodation
        ? "requested"
        : "none";
  const customerApprovedCount = items.filter(
    (i) =>
      i.block_type !== "self_arranged" &&
      i.status !== "cancelled" &&
      !!i.customer_approved_at,
  ).length;
  const customerApprovableCount = items.filter(
    (i) => i.block_type !== "self_arranged" && i.status !== "cancelled",
  ).length;

  const handleStepAction = (stepId: StepId) => {
    if (stepId === "lodging") onNavigate("accommodation");
    else if (stepId === "providers" || stepId === "approve") onNavigate("program");
    else if (stepId === "billing_terms") onNavigate(billingComplete ? "accept" : "billing");
  };

  const dateRange =
    selectedDates.length > 0
      ? selectedDates.length === 1
        ? format(selectedDates[0], "EEE d MMMM yyyy", { locale: nl })
        : `${format(selectedDates[0], "EEE d MMM", { locale: nl })} – ${format(
            selectedDates[selectedDates.length - 1],
            "EEE d MMM yyyy",
            { locale: nl },
          )}`
      : null;

  return (
    <div className="space-y-6">
      {/* Fotomosaic hero — volledige breedte, desktop grid */}
      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-1.5 h-72 rounded-2xl overflow-hidden shadow-medium">
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
        {[
          { src: cyclingGroup, alt: "Fietsen op Vlieland" },
          { src: speedboat, alt: "Speedboot activiteit" },
          { src: sunsetDinner, alt: "Diner bij zonsondergang" },
          { src: beachActivity, alt: "Strandactiviteit" },
        ].map((p) => (
          <div key={p.alt} className="overflow-hidden group">
            <img
              src={p.src}
              alt={p.alt}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          </div>
        ))}
      </div>

      {/* Mobiele scrollstrip */}
      <div className="flex sm:hidden gap-2 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory">
        {[
          { src: vlielandLandscape, alt: "Vlieland landschap" },
          { src: cyclingGroup, alt: "Fietsen op Vlieland" },
          { src: sunsetDinner, alt: "Diner bij zonsondergang" },
          { src: speedboat, alt: "Speedboot activiteit" },
          { src: beachActivity, alt: "Strandactiviteit" },
        ].map((p) => (
          <div key={p.alt} className="shrink-0 w-52 h-44 rounded-xl overflow-hidden snap-start">
            <img src={p.src} alt={p.alt} loading="lazy" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* Welkomstboodschap */}
      <div className="space-y-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            Welkom
            {program.customer_company
              ? `, ${program.customer_company}`
              : program.customer_name
                ? `, ${program.customer_name}`
                : ""}
          </h1>
          {dateRange && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1 flex-wrap">
              <Calendar className="h-3.5 w-3.5" />
              {dateRange}
              {program.number_of_people > 0 && (
                <>
                  <span className="mx-1">·</span>
                  <Users className="h-3.5 w-3.5" />
                  {program.number_of_people} personen
                </>
              )}
              {program.reference_number && (
                <>
                  <span className="mx-1">·</span>
                  <span>Kenmerk {program.reference_number}</span>
                </>
              )}
            </p>
          )}
        </div>

        <p className="text-muted-foreground">
          Fijn dat u er bent! Via dit portaal vindt u alles over uw verblijf op Vlieland op één
          plek. Bureau Vlieland coördineert het programma en de logies — u hoeft alleen te kijken,
          kiezen en akkoord te geven.
        </p>
        <p className="text-muted-foreground text-sm">
          Met vriendelijke eilandgroet,
          <br />
          <span className="font-medium text-foreground">Erwin</span>
        </p>

        <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {isQuoteAwaitingApproval ? (
              <>
                <strong>Uw offerte staat klaar.</strong> Open het programma om de onderdelen te
                bekijken en akkoord te geven.
              </>
            ) : isMaatwerkEmpty ? (
              <>
                <strong>Bureau Vlieland is uw programma aan het samenstellen.</strong> Zodra het
                programma klaar is, vindt u het hier terug. Wij nemen contact met u op.
              </>
            ) : (
              <>
                <strong>Dit is een werkdocument.</strong> Onderdelen, aantallen en tijden kunnen we
                samen verder aanscherpen. Na afstemming maken we het voorstel definitief.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Traject-lint — exact hetzelfde visuele blok als op de tabs */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Zo verloopt uw traject</h2>
        <p className="text-sm text-muted-foreground">
          Klik op een stap om er direct heen te gaan. Op elke pagina ziet u dit lint terug, zodat u
          altijd weet waar u staat.
        </p>
        <ProgramStepper
          statusSummary={statusSummary}
          billingComplete={billingComplete}
          termsAccepted={termsAccepted}
          isMultiDay={isMultiDay}
          accommodationStatus={accommodationStatus}
          accommodationQuoteReceivedCount={
            accommodationQuotes.filter((q) => q.status === "submitted").length
          }
          customerApprovedCount={customerApprovedCount}
          customerApprovableCount={customerApprovableCount}
          quoteStatus={program.quote_status}
          onStepAction={handleStepAction}
        />
      </div>

      {/* Snel-navigatie + Delen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold">Direct naar het programma</h3>
            <p className="text-sm text-muted-foreground">
              Bekijk uw activiteiten, geef feedback en keur per onderdeel goed.
            </p>
            <Button className="w-full" onClick={() => onNavigate("program")}>
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

        {onShareWithParticipants && (
          <Card className="border-dashed">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Delen met deelnemers</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Stuur uw groep een vereenvoudigde weergave — met dagindeling, kaart en praktische
                info. Zonder facturatie of akkoordstappen.
              </p>
              <Button variant="outline" className="w-full" onClick={onShareWithParticipants}>
                <Share2 className="h-4 w-4 mr-2" />
                Deellink & QR-code
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contact */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
        <span>Vragen?</span>
        <a
          href="mailto:hallo@bureauvlieland.nl"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Mail className="h-3 w-3" />
          hallo@bureauvlieland.nl
        </a>
        <a
          href="tel:+31562700208"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Phone className="h-3 w-3" />
          0562 700 208
        </a>
      </div>
    </div>
  );
};
