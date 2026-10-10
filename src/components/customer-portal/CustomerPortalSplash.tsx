import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, Mail, Phone, Users, Share2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice, Stepper } from "@/components/system";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";
import type { ProgramRequestItem } from "@/types/programRequest";
import { isMaatwerkProject } from "@/lib/projectOrigin";
import { greetingName } from "@/lib/greetingName";
import { useProgramStatus } from "@/hooks/useProgramStatus";
import { currentPortalStep, nextPortalStep, portalSteps } from "@/lib/customerPortalSteps";
import vlielandLandscape from "@/assets/vlieland-landscape.jpg";
import cyclingGroup from "@/assets/cycling-group.jpg";
import outdoorDining from "@/assets/outdoor-dining.jpg";
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
    selected_dates?: string[] | null;
    completion_status?: string | null;
    cancelled_at?: string | null;
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

const PHOTOS = [
  { src: vlielandLandscape, alt: "Vlieland landschap" },
  { src: cyclingGroup, alt: "Fietsen op Vlieland" },
  { src: speedboat, alt: "Speedboot activiteit" },
  { src: outdoorDining, alt: "Diner aan een lange tafel" },
  { src: beachActivity, alt: "Strandactiviteit" },
];

/**
 * Het Overzicht van een meerdaags programma (klantportaal fase 3b): foto's,
 * welkom met de feiten, de stand in één melding, de drie stappen, één
 * primaire knop en delen als tweede knop.
 */
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
  const { termsAccepted, billingComplete, allConfirmed, hasSelectedAccommodation, customerActionsCount, isPostExecution } =
    useProgramStatus(
      { ...program, items },
      accommodationQuotes,
      statusSummary,
      selectedDates,
      { hasAccommodationRequest: !!accommodation },
    );

  const isMaatwerk = isMaatwerkProject(program);
  const isCancelled = !!program.cancelled_at;
  const isQuoteAwaitingApproval = !isPostExecution && program.quote_status === "offerte_verstuurd" && !termsAccepted;
  const isMaatwerkEmpty = isMaatwerk && statusSummary.total === 0;

  const stepInput = {
    isMultiDay,
    hasSelectedAccommodation,
    programDone: allConfirmed || isPostExecution,
    termsAccepted,
    billingComplete,
    isCancelled,
    hasQuotesToChoose: accommodationQuotes.some((q) => q.status === "submitted"),
    customerActionsCount,
  };
  const currentStep = currentPortalStep(stepInput);
  const nextStep = isMaatwerkEmpty ? null : nextPortalStep(stepInput);

  const dateRange =
    selectedDates.length > 0
      ? selectedDates.length === 1
        ? format(selectedDates[0], "EEEE d MMMM yyyy", { locale: nl })
        : `${format(selectedDates[0], "EEE d MMM", { locale: nl })} tot ${format(selectedDates[selectedDates.length - 1], "EEE d MMM yyyy", { locale: nl })}`
      : null;

  const greeting = program.customer_company?.trim() || greetingName(program.customer_name);

  const primaryLabel = termsAccepted
    ? "Programma bekijken"
    : isQuoteAwaitingApproval
      ? "Offerte bekijken en goedkeuren"
      : statusSummary.total > 0
        ? "Programma beoordelen"
        : "Programma bekijken";

  return (
    <div className="space-y-6">
      <div className="hidden h-72 grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-1.5 overflow-hidden rounded-lg shadow-medium sm:grid">
        <div className="relative row-span-2 overflow-hidden">
          <img src={PHOTOS[0].src} alt={PHOTOS[0].alt} loading="eager" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ocean-deep/50 via-transparent to-transparent" aria-hidden="true" />
          <p className="absolute bottom-4 left-4 text-lg font-semibold leading-tight text-primary-foreground">Uw verblijf op het eiland</p>
        </div>
        {PHOTOS.slice(1).map((p) => (
          <img key={p.alt} src={p.src} alt={p.alt} loading="lazy" className="h-full w-full object-cover" />
        ))}
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 sm:hidden">
        {PHOTOS.map((p) => (
          <img key={p.alt} src={p.src} alt={p.alt} loading="lazy" className="h-44 w-52 shrink-0 snap-start rounded-lg object-cover" />
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <h1 className="font-display text-display-md font-medium text-foreground">Welkom{greeting ? `, ${greeting}` : ""}</h1>
          {dateRange && (
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {dateRange}
              {program.number_of_people > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {program.number_of_people} personen
                </>
              )}
              {program.reference_number && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Kenmerk {program.reference_number}</span>
                </>
              )}
            </p>
          )}
        </div>

        <p className="text-muted-foreground">
          Fijn dat u er bent. Hier vindt u alles over uw verblijf op Vlieland op één plek. Bureau Vlieland regelt het programma
          en de logies; u kijkt, kiest en geeft akkoord.
        </p>
        <p className="text-sm text-muted-foreground">
          Met vriendelijke eilandgroet,
          <br />
          <span className="font-medium text-foreground">Erwin</span>
        </p>
      </div>

      {isPostExecution ? (
        <Notice tone={nextStep ? "warning" : "success"} title="Uw programma is uitgevoerd">
          {nextStep ? (
            <>
              <p>{nextStep.text}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => onNavigate(nextStep.target)}>
                {nextStep.buttonLabel}
              </Button>
            </>
          ) : (
            "Dank voor uw bezoek aan Vlieland. Bureau Vlieland stuurt de facturen per e-mail."
          )}
        </Notice>
      ) : isMaatwerkEmpty ? (
        <Notice tone="info" title="Bureau Vlieland stelt uw programma samen">
          Zodra het klaarstaat, vindt u het hier terug. Wij nemen contact met u op.
        </Notice>
      ) : nextStep ? (
        <Notice tone={nextStep.tone} title={nextStep.title}>
          <p>{nextStep.text}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => onNavigate(nextStep.target)}>
            {nextStep.buttonLabel}
          </Button>
        </Notice>
      ) : isCancelled ? (
        <Notice tone="info" title="Dit programma is geannuleerd">
          Heeft u vragen? Neem gerust contact met ons op.
        </Notice>
      ) : (
        <Notice tone="success" title="Alles is rond">
          Uw programma is bevestigd en de voorwaarden zijn ondertekend. Tot ziens op Vlieland.
        </Notice>
      )}

      {currentStep && !isMaatwerkEmpty && (
        <div className="rounded-lg border bg-card px-4 py-3">
          <Stepper steps={portalSteps(isMultiDay)} current={currentStep} />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="w-full sm:w-auto" onClick={() => onNavigate("program")}>
          {primaryLabel}
          <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </Button>
        {onShareWithParticipants && (
          <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={onShareWithParticipants}>
            <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Delen met deelnemers
          </Button>
        )}
      </div>
      {onShareWithParticipants && (
        <p className="-mt-3 text-sm text-muted-foreground">
          Deelnemers krijgen een eenvoudige weergave met dagindeling, kaart en praktische informatie, zonder facturatie of akkoord.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
        <span>Vragen?</span>
        <a href="mailto:hallo@bureauvlieland.nl" className="flex items-center gap-1 transition-colors hover:text-foreground">
          <Mail className="h-3 w-3" aria-hidden="true" />
          hallo@bureauvlieland.nl
        </a>
        <a href="tel:+31562700208" className="flex items-center gap-1 transition-colors hover:text-foreground">
          <Phone className="h-3 w-3" aria-hidden="true" />
          0562 700 208
        </a>
      </div>
    </div>
  );
};
