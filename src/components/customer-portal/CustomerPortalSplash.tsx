import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar, ChevronRight, Hash, Mail, Phone, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice, PortalHead, Stepper, type NoticeTone, type PortalHeadFact } from "@/components/system";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";
import type { ProgramRequestItem } from "@/types/programRequest";
import { isMaatwerkProject } from "@/lib/projectOrigin";
import { greetingName } from "@/lib/greetingName";
import { useProgramStatus } from "@/hooks/useProgramStatus";
import { buildPortalSteps } from "./portalSteps";
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
 * Het startpunt van een meerdaags programma (klantportaal fase 3): fotomozaïek,
 * welkom met een goede aanhef, de drie stappen, één melding met de stand en
 * één primaire knop naar het programma; delen als tweede knop.
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
  const { termsAccepted, allConfirmed, hasSelectedAccommodation, isPostExecution } = useProgramStatus(
    {
      ...program,
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
    { hasAccommodationRequest: !!accommodation },
  );

  const isMaatwerk = isMaatwerkProject(program);
  const isQuoteAwaitingApproval = !isPostExecution && program.quote_status === "offerte_verstuurd" && !termsAccepted;
  const isMaatwerkEmpty = isMaatwerk && statusSummary.total === 0;
  const { steps, current } = buildPortalSteps({
    isMultiDay,
    hasSelectedAccommodation,
    allConfirmed,
    isPostExecution,
    termsAccepted,
    isCancelled: !!program.cancelled_at,
  });

  const dateRange =
    selectedDates.length > 0
      ? selectedDates.length === 1
        ? format(selectedDates[0], "EEE d MMMM yyyy", { locale: nl })
        : `${format(selectedDates[0], "EEE d MMM", { locale: nl })} t/m ${format(selectedDates[selectedDates.length - 1], "EEE d MMM yyyy", { locale: nl })}`
      : null;
  const facts: PortalHeadFact[] = [];
  if (dateRange) facts.push({ key: "datum", icon: <Calendar />, label: dateRange });
  if (program.number_of_people > 0) facts.push({ key: "personen", icon: <Users />, label: `${program.number_of_people} personen` });
  if (program.reference_number) facts.push({ key: "kenmerk", icon: <Hash />, label: program.reference_number });

  // Bedrijf voorop; anders de naam zonder meegetypte aanhef ("Mevrouw. M. ...").
  const name = program.customer_company?.trim() || greetingName(program.customer_name);

  const status: { tone: NoticeTone; title: string; text: string } = isPostExecution
    ? { tone: "success", title: "Uw programma is uitgevoerd", text: "Bureau Vlieland bereidt de facturatie voor. Vul eventueel nog ontbrekende gegevens aan." }
    : isQuoteAwaitingApproval
      ? { tone: "warning", title: "Uw offerte staat klaar", text: "Open het programma om de onderdelen te bekijken en akkoord te geven." }
      : isMaatwerkEmpty
        ? { tone: "info", title: "Bureau Vlieland is uw programma aan het samenstellen", text: "Zodra het programma klaar is, vindt u het hier terug. Wij nemen contact met u op." }
        : { tone: "info", title: "Dit is een werkdocument", text: "Onderdelen, aantallen en tijden kunnen we samen verder aanscherpen. Na afstemming maken we het voorstel definitief." };

  const primaryLabel = termsAccepted
    ? "Programma bekijken"
    : isQuoteAwaitingApproval
      ? "Offerte bekijken en akkoord geven"
      : statusSummary.total > 0
        ? "Programma beoordelen"
        : "Programma bekijken";

  return (
    <div className="space-y-6">
      {/* Fotomozaïek: raster vanaf sm, strook op een telefoon */}
      <div className="hidden h-72 grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-1.5 overflow-hidden rounded-lg shadow-medium sm:grid">
        <div className="group relative row-span-2 overflow-hidden">
          <img
            src={PHOTOS[0].src}
            alt={PHOTOS[0].alt}
            loading="eager"
            className="h-full w-full object-cover transition-transform duration-slow ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ocean-deep/40 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 text-primary-foreground">
            <p className="text-eyebrow font-medium uppercase opacity-80">Bureau Vlieland</p>
            <p className="text-lg font-semibold leading-tight">Uw verblijf op het eiland</p>
          </div>
        </div>
        {PHOTOS.slice(1).map((p) => (
          <div key={p.alt} className="group overflow-hidden">
            <img src={p.src} alt={p.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-slow ease-out group-hover:scale-105" />
          </div>
        ))}
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 sm:hidden">
        {PHOTOS.map((p) => (
          <div key={p.alt} className="h-44 w-52 shrink-0 snap-start overflow-hidden rounded-lg">
            <img src={p.src} alt={p.alt} loading="lazy" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>

      <PortalHead
        title={name ? `Welkom, ${name}` : "Welkom"}
        description="Fijn dat u er bent. Hier vindt u uw programma, de logies en alles voor uw verblijf op Vlieland op één plek. Bureau Vlieland regelt het; u kijkt, kiest en geeft akkoord."
        facts={facts}
      />

      {current && (
        <div className="rounded-lg border bg-card px-4 py-3">
          <Stepper steps={steps} current={current} />
        </div>
      )}

      <Notice tone={status.tone} title={status.title}>
        <p>{status.text}</p>
      </Notice>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => onNavigate("program")}>
          {primaryLabel}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        {onShareWithParticipants && (
          <Button variant="outline" onClick={onShareWithParticipants}>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Delen met deelnemers
          </Button>
        )}
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Vragen?</span>
        <a href="mailto:hallo@bureauvlieland.nl" className="inline-flex items-center gap-1 transition-colors duration-fast hover:text-foreground">
          <Mail className="h-3 w-3" aria-hidden="true" />
          hallo@bureauvlieland.nl
        </a>
        <a href="tel:+31562700208" className="inline-flex items-center gap-1 transition-colors duration-fast hover:text-foreground">
          <Phone className="h-3 w-3" aria-hidden="true" />
          0562 700 208
        </a>
      </p>
    </div>
  );
};
