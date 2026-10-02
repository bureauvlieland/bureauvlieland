import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { differenceInDays, format, isPast } from "date-fns";
import { nl } from "date-fns/locale";
import { BedDouble, Check, ChevronRight, Download, Globe, List, Mail, Map as MapIcon, Pencil, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, Notice, Pill } from "@/components/system";
import { SelectQuoteDialog } from "@/components/accommodation-portal/SelectQuoteDialog";
import { RESPONSE_TIME } from "@/content/promises";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";
import {
  ACCOMMODATION_TYPES,
  ROOM_TYPES,
  ROOM_OCCUPANCY_OPTIONS,
  LOCATION_PREFERENCES,
  FACILITIES,
  BUDGET_RANGES,
  getBoardDisplay,
} from "@/types/accommodation";
import { summarizeBoard, summarizeRooms } from "@/lib/accommodationSetup";
import { presentQuotePartner } from "@/lib/accommodationQuotePresentation";
import { cn } from "@/lib/utils";
import { AccommodationQuoteCard } from "./AccommodationQuoteCard";
import { ContactAccommodationDialog } from "./ContactAccommodationDialog";
import { AccommodationMessageThread } from "./AccommodationMessageThread";
import { HotelLocationMap } from "./HotelLocationMap";
import { HotelGallery } from "./HotelGallery";
import { AccommodationQuotesMap } from "./AccommodationQuotesMap";

interface AccommodationSectionProps {
  accommodation: AccommodationRequest | null;
  quotes: AccommodationQuote[];
  extrasByQuoteId?: Record<string, any[]>;
  onSelectQuote: (quoteId: string, signatureName: string, acceptedTerms: boolean) => Promise<boolean>;
  selectedDates: Date[];
  onEditAccommodation?: () => void;
  onEditAccommodationSetup?: () => void;
  customerToken?: string;
  numberOfPeople?: number;
  invoicingMode?: string | null;
}

const formatPrice = (price: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(price);
const day = (iso: string, pattern = "EEE d MMM") => format(new Date(iso), pattern, { locale: nl });

/** Een kopje met inhoud in de logieskaart. */
const Block = ({ label, children, className }: { label: string; children: ReactNode; className?: string }) => (
  <div className={className}>
    <h3 className="text-eyebrow font-medium uppercase text-muted-foreground">{label}</h3>
    <div className="mt-1.5 text-sm">{children}</div>
  </div>
);

/**
 * Het tabblad Logies (klantportaal fase 3): per toestand één kaart in plaats
 * van kaart-in-kaart-in-kaart. Gekozen logies: de feiten, foto's, kamers,
 * verzorging, adres en contact als links, kaart en route, en de echte acties
 * als knoppen onderaan. Offertes: de wensen als pills en per offerte een
 * keuzekaart. Aangevraagd: één melding met de stand.
 */
export const AccommodationSection = ({
  accommodation,
  quotes,
  extrasByQuoteId,
  onSelectQuote,
  selectedDates,
  onEditAccommodation,
  onEditAccommodationSetup,
  customerToken,
  numberOfPeople,
  invoicingMode,
}: AccommodationSectionProps) => {
  const isBureauCentral = invoicingMode === "bureau_central";
  const [quoteView, setQuoteView] = useState<"list" | "map">("list");
  const [selectedQuoteForConfirm, setSelectedQuoteForConfirm] = useState<AccommodationQuote | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [contactQuote, setContactQuote] = useState<AccommodationQuote | null>(null);

  // De logiesaanvraag krijgt datum, aantal en de programmacode mee.
  const logiesUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedDates.length > 1) {
      const sorted = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      params.set("arrival", format(sorted[0], "yyyy-MM-dd"));
      params.set("departure", format(sorted[sorted.length - 1], "yyyy-MM-dd"));
    }
    if (numberOfPeople) params.set("guests", numberOfPeople.toString());
    if (customerToken) params.set("programToken", customerToken);
    const query = params.toString();
    return query ? `/logies-aanvragen?${query}` : "/logies-aanvragen";
  }, [selectedDates, numberOfPeople, customerToken]);

  const handleSelectQuote = async (signatureName: string, acceptedTerms: boolean) => {
    if (!selectedQuoteForConfirm) return;
    setIsSelecting(true);
    const success = await onSelectQuote(selectedQuoteForConfirm.id, signatureName, acceptedTerms);
    setIsSelecting(false);
    if (success) setSelectedQuoteForConfirm(null);
  };

  // De wensen van de klant, als maatstaf bij het kiezen (alleen wat is ingevuld).
  const wishChips = useMemo(() => {
    if (!accommodation) return [] as string[];
    const chips: string[] = [];
    const arrival = new Date(accommodation.arrival_date);
    const departure = new Date(accommodation.departure_date);
    if (!Number.isNaN(arrival.getTime()) && !Number.isNaN(departure.getTime())) {
      const nights = differenceInDays(departure, arrival);
      chips.push(`${format(arrival, "d MMM", { locale: nl })} t/m ${format(departure, "d MMM", { locale: nl })}${nights > 0 ? ` · ${nights} ${nights === 1 ? "nacht" : "nachten"}` : ""}`);
    }
    if (accommodation.number_of_guests) chips.push(`${accommodation.number_of_guests} personen`);
    const rooms = summarizeRooms(accommodation);
    if (rooms) chips.push(rooms);
    const board = summarizeBoard(accommodation);
    if (board) chips.push(board);
    for (const v of accommodation.location_preference || []) {
      const l = LOCATION_PREFERENCES.find((o) => o.value === v);
      if (l && v !== "no_preference") chips.push(l.label);
    }
    const facilities = (accommodation.facilities_required || [])
      .map((v) => FACILITIES.find((o) => o.value === v)?.label)
      .filter(Boolean) as string[];
    if (facilities.length > 0) chips.push(facilities.join(" · "));
    return chips;
  }, [accommodation]);

  const numberOfNights = accommodation
    ? differenceInDays(new Date(accommodation.departure_date), new Date(accommodation.arrival_date))
    : selectedDates.length > 1
      ? selectedDates.length - 1
      : 1;

  const selectedQuote = quotes.find((q) => q.status === "selected");
  const submittedQuotes = quotes.filter((q) => q.status === "submitted");
  const expiredQuotes = quotes.filter((q) => q.status === "expired");
  const declinedQuotes = quotes.filter((q) => q.status === "declined" || q.status === "rejected");

  // Redenen van afwijzing, zonder namen van partners.
  const declineReasons = useMemo(() => {
    const reasons = declinedQuotes
      .map((q) => q.partner_notes)
      .filter((note): note is string => !!note && note.trim().length > 0);
    return [...new Set(reasons)];
  }, [declinedQuotes]);

  // Gesloten: geen passende logies gevonden.
  if (accommodation?.status === "cancelled") {
    return (
      <Notice tone="info" title="Logiesaanvraag gesloten" icon={<BedDouble className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}>
        <p>
          Bureau Vlieland heeft helaas geen passende logies kunnen vinden voor uw aanvraag. Neem gerust contact met ons op als u zelf logies heeft
          gevonden of als wij u op een andere manier kunnen helpen.
        </p>
        <p className="mt-1 text-xs">
          {day(accommodation.arrival_date)} t/m {day(accommodation.departure_date, "EEE d MMM yyyy")} · {accommodation.number_of_guests} gasten
        </p>
      </Notice>
    );
  }

  // Nog geen aanvraag: één lege staat met de knop.
  if (!accommodation) {
    return (
      <EmptyState
        icon={<BedDouble />}
        title="Nog geen logies"
        description={`Wij vragen vrijblijvend offertes aan bij geschikte locaties en voegen ze toe aan uw programma. U ontvangt ${RESPONSE_TIME.within} passende voorstellen.`}
        action={
          <Button asChild>
            <Link to={logiesUrl}>
              Logies laten regelen
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />
    );
  }

  // Gekozen: één kaart met alles over het verblijf.
  if (selectedQuote) {
    const partner = presentQuotePartner(selectedQuote);
    const quotePartner = selectedQuote.partner;
    const board = getBoardDisplay(selectedQuote.board_type);
    const phone = quotePartner?.booking_contact_phone || quotePartner?.phone;
    const email = quotePartner?.contact_email || quotePartner?.email;
    const rooms = selectedQuote.room_configuration ?? [];
    const includes = Array.isArray(selectedQuote.includes) ? selectedQuote.includes : [];
    const nights = Math.max(numberOfNights, 1);
    const facts = [
      `${day(accommodation.arrival_date)} t/m ${day(accommodation.departure_date)}`,
      `${nights} ${nights === 1 ? "nacht" : "nachten"}`,
      `${accommodation.number_of_guests} gasten`,
      board.isKnown ? board.label : null,
    ].filter(Boolean);
    const address = [quotePartner?.address_street, [quotePartner?.address_postal, quotePartner?.address_city].filter(Boolean).join(" ")]
      .filter((s) => s && String(s).trim().length > 0)
      .join(", ");

    return (
      <div className="space-y-6">
        <article className="rounded-lg border bg-card p-4 sm:p-6" aria-labelledby="logies-kop">
          <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <h2 id="logies-kop" className="font-display text-2xl font-medium leading-tight">
                {selectedQuote.accommodation_name}
              </h2>
              {quotePartner?.name && quotePartner.name !== selectedQuote.accommodation_name && (
                <p className="text-sm text-muted-foreground">{quotePartner.name}</p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">{facts.join(" · ")}</p>
            </div>
            <div className="sm:text-right">
              <p className="font-display text-2xl font-semibold leading-none">{formatPrice(selectedQuote.price_total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedQuote.price_includes_vat ? "incl. btw" : "excl. btw"}
                {selectedQuote.price_per_person_per_night ? ` · ${formatPrice(selectedQuote.price_per_person_per_night)} p.p. per nacht` : ""}
              </p>
            </div>
          </header>
          <p className="mt-3 text-sm text-muted-foreground">
            {isBureauCentral
              ? "Bureau Vlieland regelt de reservering en de facturatie. U hoeft verder niets te doen."
              : "Uw verblijf is geboekt. Hieronder vindt u alle praktische informatie."}
          </p>

          <div className="mt-5">
            <HotelGallery images={partner.images} accommodationName={selectedQuote.accommodation_name} />
          </div>

          {(selectedQuote.description || partner.aboutText) && (
            <div className="mt-5 space-y-2 whitespace-pre-line text-sm text-muted-foreground">
              {selectedQuote.description && <p>{selectedQuote.description}</p>}
              {partner.aboutText && <p>{partner.aboutText}</p>}
            </div>
          )}
          {partner.highlights.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {partner.highlights.map((h) => (
                <Pill key={h} tone="neutral">
                  {h}
                </Pill>
              ))}
            </div>
          )}

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Block label="Kamerindeling">
              {rooms.length > 0 ? (
                <ul className="space-y-1">
                  {rooms.map((room, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span>
                        {room.count}× {ROOM_TYPES.find((t) => t.value === room.type)?.label || room.type}
                        {room.occupancy ? <span className="text-muted-foreground"> · {room.occupancy} pers.</span> : null}
                      </span>
                      {room.price_per_night ? <span className="text-muted-foreground">{formatPrice(room.price_per_night)} p.n.</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">De kamerindeling volgt van de accommodatie.</p>
              )}
            </Block>
            <Block label="Verzorging">
              <p>{board.label}</p>
              {selectedQuote.board_notes && <p className="mt-1 whitespace-pre-line text-muted-foreground">{selectedQuote.board_notes}</p>}
              {!board.isKnown && <p className="mt-1 text-muted-foreground">Wilt u dit direct weten? Stel uw vraag via "Nieuw bericht" hieronder.</p>}
            </Block>
            {includes.length > 0 && (
              <Block label="Inbegrepen">
                <ul className="space-y-1">
                  {includes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                      <span>{String(item)}</span>
                    </li>
                  ))}
                </ul>
              </Block>
            )}
            {(partner.checkInTime || partner.checkOutTime) && (
              <Block label="In- en uitchecken">
                <p>
                  {partner.checkInTime && `Inchecken vanaf ${partner.checkInTime}`}
                  {partner.checkInTime && partner.checkOutTime && " · "}
                  {partner.checkOutTime && `uitchecken voor ${partner.checkOutTime}`}
                </p>
              </Block>
            )}
            {(address || phone || email || partner.websiteUrl) && (
              <Block label="Adres en contact">
                {address && <p>{address}</p>}
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {phone && (
                    <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      {phone}
                    </a>
                  )}
                  {email && (
                    <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                      {email}
                    </a>
                  )}
                  {partner.websiteUrl && (
                    <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                      Website
                    </a>
                  )}
                </p>
                {quotePartner?.booking_contact_name && <p className="mt-1 text-xs text-muted-foreground">t.a.v. {quotePartner.booking_contact_name}</p>}
              </Block>
            )}
            {partner.locationDescription && (
              <Block label="Ligging">
                <p className="whitespace-pre-line text-muted-foreground">{partner.locationDescription}</p>
              </Block>
            )}
          </div>

          {partner.coordinates && (
            <Block label="Kaart en route" className="mt-5">
              <HotelLocationMap lat={partner.coordinates.lat} lng={partner.coordinates.lng} label={selectedQuote.accommodation_name} address={address || null} />
            </Block>
          )}
          {selectedQuote.partner_notes && (
            <Block label="Toelichting van de accommodatie" className="mt-5">
              <p className="whitespace-pre-line text-muted-foreground">{selectedQuote.partner_notes}</p>
            </Block>
          )}
          {selectedQuote.conditions && (
            <Block label="Voorwaarden" className="mt-5">
              <p className="whitespace-pre-line text-muted-foreground">{selectedQuote.conditions}</p>
            </Block>
          )}

          <footer className="mt-6 flex flex-wrap gap-2 border-t pt-4">
            {onEditAccommodationSetup && (
              <Button variant="outline" size="sm" onClick={onEditAccommodationSetup}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Kamers en verzorging aanpassen
              </Button>
            )}
            {onEditAccommodation && (
              <Button variant="outline" size="sm" onClick={onEditAccommodation}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Datum, aantal personen of doel wijzigen
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { generateStayOverviewPdf } = await import("@/lib/stayOverviewPdf");
                await generateStayOverviewPdf(accommodation, selectedQuote, accommodation.customer_company || accommodation.customer_name);
              }}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Verblijfsoverzicht (pdf)
            </Button>
          </footer>
        </article>

        {customerToken && (
          <AccommodationMessageThread
            customerToken={customerToken}
            quoteId={selectedQuote.id}
            accommodationName={selectedQuote.accommodation_name}
            isBureauCentral={isBureauCentral}
          />
        )}
      </div>
    );
  }

  // Offertes binnen: kiezen.
  if (submittedQuotes.length > 0) {
    const requested = accommodation.quotes_requested_count;
    const received = submittedQuotes.length;
    const declined = accommodation.quotes_declined_count || 0;
    const waiting = Math.max(0, requested - received - declined);
    const showMapToggle = submittedQuotes.length > 1 && submittedQuotes.some((q) => presentQuotePartner(q).coordinates);

    return (
      <div className="space-y-4">
        <div className="space-y-1 text-sm">
          <p>{received === 1 ? "Bekijk de offerte en kies als die bij u past." : "Vergelijk de offertes en kies de optie die het beste bij u past."}</p>
          {requested > 0 && (
            <p className="text-muted-foreground">
              {requested} logiespartner{requested !== 1 ? "s" : ""} benaderd
              {received > 0 && `, ${received} offerte${received !== 1 ? "s" : ""} ontvangen`}
              {declined > 0 && `, ${declined} afgewezen`}
              {waiting > 0 && `, wij wachten nog op ${waiting}`}.
            </p>
          )}
        </div>

        {wishChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-accent-soft px-3 py-2.5">
            <span className="mr-1 text-xs font-semibold text-primary">Uw wensen</span>
            {wishChips.map((chip) => (
              <Pill key={chip} tone="neutral" className="bg-background">
                {chip}
              </Pill>
            ))}
            {onEditAccommodationSetup && (
              <button type="button" onClick={onEditAccommodationSetup} className="ml-auto text-xs font-medium text-primary hover:underline">
                Wensen aanpassen
              </button>
            )}
          </div>
        )}

        {showMapToggle && (
          <div className="flex w-fit items-center gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Weergave">
            <Button variant={quoteView === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setQuoteView("list")} aria-pressed={quoteView === "list"}>
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              Lijst
            </Button>
            <Button variant={quoteView === "map" ? "secondary" : "ghost"} size="sm" onClick={() => setQuoteView("map")} aria-pressed={quoteView === "map"}>
              <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Kaart
            </Button>
          </div>
        )}

        {quoteView === "map" && <AccommodationQuotesMap quotes={submittedQuotes} formatPrice={formatPrice} />}

        {submittedQuotes.map((quote) => {
          const validUntil = new Date(quote.valid_until);
          return (
            <div key={quote.id} id={`quote-${quote.id}`} className="scroll-mt-32">
              <AccommodationQuoteCard
                quote={quote}
                isExpired={isPast(validUntil)}
                validUntil={validUntil}
                onSelect={() => setSelectedQuoteForConfirm(quote)}
                onContact={customerToken ? () => setContactQuote(quote) : undefined}
                formatPrice={formatPrice}
                extrasOverride={extrasByQuoteId ? (extrasByQuoteId[quote.id] ?? []) : undefined}
                numberOfGuests={accommodation.number_of_guests}
                numberOfNights={numberOfNights}
                facilitiesRequired={accommodation.facilities_required ?? null}
              />
            </div>
          );
        })}

        <SelectQuoteDialog
          quote={selectedQuoteForConfirm}
          open={!!selectedQuoteForConfirm}
          onOpenChange={(open) => !open && setSelectedQuoteForConfirm(null)}
          onConfirm={handleSelectQuote}
          isSelecting={isSelecting}
        />

        {customerToken && contactQuote && (
          <ContactAccommodationDialog
            open={!!contactQuote}
            onOpenChange={(open) => {
              if (!open) setContactQuote(null);
            }}
            accommodationName={contactQuote.accommodation_name}
            quoteId={contactQuote.id}
            customerToken={customerToken}
            isBureauCentral={isBureauCentral}
          />
        )}
      </div>
    );
  }

  // Alleen verlopen offertes.
  if (expiredQuotes.length > 0) {
    return (
      <Notice tone="warning" title="Logiesofferte verlopen">
        <p>
          De offerte van <strong>{expiredQuotes[0].accommodation_name}</strong> was geldig tot en met{" "}
          {day(expiredQuotes[0].valid_until, "EEE d MMMM yyyy")} en is verlopen. Neem contact op met Bureau Vlieland voor een nieuwe offerte.
        </p>
      </Notice>
    );
  }

  // Aangevraagd: wachten op offertes.
  const accommodationType = ACCOMMODATION_TYPES.find((t) => t.value === accommodation.accommodation_type);
  const requested = accommodation.quotes_requested_count || 0;
  const declined = accommodation.quotes_declined_count || 0;
  const allDeclined = requested > 0 && declined >= requested;
  const waiting = Math.max(0, requested - declined);
  const statusParts: string[] = [];
  if (requested > 0) statusParts.push(`Bureau Vlieland heeft ${requested} logiespartner${requested !== 1 ? "s" : ""} benaderd.`);
  if (declined > 0) statusParts.push(`${declined} partner${declined !== 1 ? "s" : ""} ${declined !== 1 ? "hebben" : "heeft"} helaas afgewezen.`);
  if (allDeclined) statusParts.push("Bureau Vlieland zoekt naar alternatieven en neemt contact met u op.");
  else if (waiting > 0) statusParts.push(`Wij wachten nog op ${waiting} partner${waiting !== 1 ? "s" : ""}.`);
  else statusParts.push("U ontvangt een e-mail zodra er offertes binnenkomen.");

  const occupancyLabel = ROOM_OCCUPANCY_OPTIONS.find((o) => o.value === accommodation.room_occupancy)?.label;
  const roomTypeLabels = (accommodation.room_types || []).map((v) => ROOM_TYPES.find((r) => r.value === v)?.label).filter(Boolean) as string[];
  const locationLabels = (accommodation.location_preference || [])
    .filter((v) => v !== "no_preference")
    .map((v) => LOCATION_PREFERENCES.find((l) => l.value === v)?.label)
    .filter(Boolean) as string[];
  const facilityLabels = (accommodation.facilities_required || []).map((v) => FACILITIES.find((f) => f.value === v)?.label).filter(Boolean) as string[];
  const budgetLabel = BUDGET_RANGES.find((b) => b.value === accommodation.budget_range)?.label;
  const wishPills = [...roomTypeLabels, ...locationLabels, ...facilityLabels];
  const hasWishes = wishPills.length > 0 || !!occupancyLabel || !!budgetLabel || !!accommodation.special_requests;
  const facts = [
    `${day(accommodation.arrival_date)} t/m ${day(accommodation.departure_date)}`,
    `${accommodation.number_of_guests} gasten`,
    accommodationType?.label ?? null,
    accommodation.room_count ? `${accommodation.room_count} kamer${accommodation.room_count > 1 ? "s" : ""}` : null,
  ].filter(Boolean);

  return (
    <article className="rounded-lg border bg-card p-4 sm:p-6" aria-labelledby="logies-kop">
      <header>
        <h2 id="logies-kop" className="font-display text-2xl font-medium leading-tight">
          Uw logiesaanvraag
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{facts.join(" · ")}</p>
      </header>

      <Notice tone={allDeclined ? "danger" : "info"} title={allDeclined ? "Geen beschikbaarheid" : "Aangevraagd"} className="mt-4">
        <p>{statusParts.join(" ")}</p>
        {declineReasons.length > 0 && (
          <ul className="mt-2 list-disc pl-5">
            {declineReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </Notice>

      <div className={cn("mt-5 grid gap-5", hasWishes ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        <Block label="Kamers">{summarizeRooms(accommodation) || <span className="text-muted-foreground">nog niet opgegeven</span>}</Block>
        <Block label="Verzorging">{summarizeBoard(accommodation) || <span className="text-muted-foreground">nog niet opgegeven</span>}</Block>
        {hasWishes && (
          <Block label="Uw wensen">
            {wishPills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {wishPills.map((label) => (
                  <Pill key={label} tone="neutral">
                    {label}
                  </Pill>
                ))}
              </div>
            )}
            {(occupancyLabel || budgetLabel) && (
              <p className={cn("text-muted-foreground", wishPills.length > 0 && "mt-1.5")}>{[occupancyLabel, budgetLabel].filter(Boolean).join(" · ")}</p>
            )}
            {accommodation.special_requests && <p className="mt-1.5 whitespace-pre-line text-muted-foreground">{accommodation.special_requests}</p>}
          </Block>
        )}
      </div>

      {(onEditAccommodationSetup || onEditAccommodation) && (
        <footer className="mt-6 flex flex-wrap gap-2 border-t pt-4">
          {onEditAccommodationSetup && (
            <Button variant="outline" size="sm" onClick={onEditAccommodationSetup}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Kamers en verzorging aanpassen
            </Button>
          )}
          {onEditAccommodation && (
            <Button variant="outline" size="sm" onClick={onEditAccommodation}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Datum, aantal personen of doel wijzigen
            </Button>
          )}
        </footer>
      )}
    </article>
  );
};
