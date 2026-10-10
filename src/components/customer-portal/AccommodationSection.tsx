import { RESPONSE_TIME } from "@/content/promises";
import { EmptyState, Notice, Pill } from "@/components/system";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { differenceInDays, format, isPast } from "date-fns";
import { nl } from "date-fns/locale";
import {
  BedDouble,
  Calendar,
  Users,
  CheckCircle2,
  ChevronRight,
  Pencil,
  Phone,
  Mail,
  Globe,
  Download,
  List,
  Map as MapIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelectQuoteDialog } from "@/components/accommodation-portal/SelectQuoteDialog";
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
import { accommodationTypeIcon, locationIcon } from "@/lib/accommodationIcons";
import { AccommodationQuoteCard } from "./AccommodationQuoteCard";
import { ContactAccommodationDialog } from "./ContactAccommodationDialog";
import { AccommodationMessageThread } from "./AccommodationMessageThread";
import { HotelLocationMap } from "./HotelLocationMap";
import { HotelGallery } from "./HotelGallery";
import { AccommodationQuotesMap } from "./AccommodationQuotesMap";
import { presentQuotePartner } from "@/lib/accommodationQuotePresentation";
import { transformImageUrl } from "@/lib/supabaseImage";

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

const dateSpan = (arrival: string, departure: string) =>
  `${format(new Date(arrival), "EEE d MMM", { locale: nl })} tot ${format(new Date(departure), "EEE d MMM yyyy", { locale: nl })}`;

/** Klein kopje binnen een kaart, zonder eigen eyebrow-stijl. */
const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-1 text-xs font-medium text-muted-foreground">{children}</p>
);

/**
 * Het tabblad Logies (klantportaal fase 3b): per toestand één kaart met één
 * status uit de woordenlijst (Aangevraagd, Kies uw logies, Gekozen,
 * Bevestigd, Geen beschikbaarheid), de echte acties als knoppen bij de
 * kaart en geen kaart-in-kaart-in-kaart meer.
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
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactQuote, setContactQuote] = useState<AccommodationQuote | null>(null);

  // De logiesaanvraag krijgt data, aantal en programma mee, zodat de klant niets dubbel invult.
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

  // Wensen van de klant als pills boven de offertes (alleen wat is ingevuld).
  const wishChips = useMemo(() => {
    if (!accommodation) return [] as string[];
    const chips: string[] = [];
    const arrival = new Date(accommodation.arrival_date);
    const departure = new Date(accommodation.departure_date);
    if (!Number.isNaN(arrival.getTime()) && !Number.isNaN(departure.getTime())) {
      const nights = differenceInDays(departure, arrival);
      chips.push(
        `${format(arrival, "d MMM", { locale: nl })} tot ${format(departure, "d MMM", { locale: nl })}${nights > 0 ? ` · ${nights} ${nights === 1 ? "nacht" : "nachten"}` : ""}`,
      );
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
    const facilities: string[] = [];
    for (const v of accommodation.facilities_required || []) {
      const label = FACILITIES.find((o) => o.value === v)?.label;
      if (label) facilities.push(label);
    }
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

  const declineReasons = useMemo(() => {
    const reasons = declinedQuotes.map((q) => q.partner_notes).filter((note): note is string => !!note && note.trim().length > 0);
    return [...new Set(reasons)];
  }, [declinedQuotes]);

  // Gesloten: Bureau Vlieland vond geen passend logies.
  if (accommodation?.status === "cancelled") {
    return (
      <EmptyState
        icon={<BedDouble aria-hidden="true" />}
        title="Logiesaanvraag gesloten"
        description={
          <>
            Bureau Vlieland heeft helaas geen passend logies kunnen vinden voor {dateSpan(accommodation.arrival_date, accommodation.departure_date)},{" "}
            {accommodation.number_of_guests} personen. Heeft u zelf logies gevonden, of kunnen wij anders helpen? Neem gerust contact op.
          </>
        }
      />
    );
  }

  // Nog geen aanvraag: één knop.
  if (!accommodation) {
    return (
      <EmptyState
        icon={<BedDouble aria-hidden="true" />}
        title="Nog geen logies"
        description={
          <>
            Een sterk programma begint met een goed bed. Wij vragen vrijblijvend offertes aan bij passende accommodaties en zetten
            ze hier voor u klaar, {RESPONSE_TIME.within}.
          </>
        }
        action={
          <Button asChild>
            <Link to={logiesUrl}>
              Logies laten regelen
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />
    );
  }

  // Gekozen: één kaart met de details en de acties.
  if (selectedQuote) {
    const partner = selectedQuote.partner;
    const firstImage = (partner?.gallery_images as { url: string }[] | undefined)?.[0]?.url;
    const board = getBoardDisplay(selectedQuote.board_type);
    const phone = partner?.booking_contact_phone || partner?.phone;
    const email = partner?.contact_email || partner?.email;
    const website = partner?.website_url;
    const address = partner
      ? [partner.address_street, [partner.address_postal, partner.address_city].filter(Boolean).join(" ")].filter(Boolean).join(", ")
      : "";
    const hasInfo = !!(partner || selectedQuote.description || selectedQuote.includes?.length || selectedQuote.conditions || selectedQuote.partner_notes);
    const confirmed = accommodation.status === "accepted";

    return (
      <>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  {selectedQuote.accommodation_name}
                  <Pill tone={confirmed ? "success" : "info"}>{confirmed ? "Bevestigd" : "Gekozen"}</Pill>
                </CardTitle>
                {partner?.name && partner.name !== selectedQuote.accommodation_name && (
                  <p className="text-sm text-muted-foreground">{partner.name}</p>
                )}
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  {dateSpan(accommodation.arrival_date, accommodation.departure_date)}
                  <span aria-hidden="true">·</span>
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {accommodation.number_of_guests} personen
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-semibold leading-none text-foreground">{formatPrice(selectedQuote.price_total)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedQuote.price_per_person_per_night ? `${formatPrice(selectedQuote.price_per_person_per_night)} p.p. per nacht · ` : ""}
                  {selectedQuote.price_includes_vat ? "incl. btw" : "excl. btw"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              {isBureauCentral
                ? "Bureau Vlieland regelt de reservering en de factuur. U hoeft verder niets te doen."
                : "Uw verblijf is geboekt. Hieronder staat alles wat u voor het verblijf nodig heeft."}
            </p>

            <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
              {firstImage && (
                <img
                  src={transformImageUrl(firstImage, { width: 800, quality: 78 })}
                  alt={selectedQuote.accommodation_name}
                  className="h-28 w-full rounded-lg object-cover sm:w-40"
                />
              )}
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Verzorging</dt>
                  <dd className="text-foreground">
                    {board.label}
                    {selectedQuote.board_notes && <span className="block text-muted-foreground">{selectedQuote.board_notes}</span>}
                    {!board.isKnown && <span className="block text-muted-foreground">Wilt u dit weten? Stel uw vraag hieronder.</span>}
                  </dd>
                </div>
                {(selectedQuote.room_configuration?.length ?? 0) > 0 && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Kamerindeling</dt>
                    <dd>
                      <ul className="space-y-0.5 text-foreground">
                        {selectedQuote.room_configuration.map((room, i) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span>
                              {room.count}× {ROOM_TYPES.find((t) => t.value === room.type)?.label || room.type}
                              {room.occupancy ? ` (${room.occupancy} pers.)` : ""}
                            </span>
                            {room.price_per_night ? <span className="text-muted-foreground">{formatPrice(room.price_per_night)} p.n.</span> : null}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="flex flex-wrap gap-2">
              {onEditAccommodationSetup && (
                <Button variant="outline" size="sm" onClick={onEditAccommodationSetup}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  Kamers en verzorging aanpassen
                </Button>
              )}
              {onEditAccommodation && (
                <Button variant="outline" size="sm" onClick={onEditAccommodation}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  Datum of aantal wijzigen
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const { generateStayOverviewPdf } = await import("@/lib/stayOverviewPdf");
                  await generateStayOverviewPdf(accommodation, selectedQuote, accommodation.customer_company || accommodation.customer_name);
                }}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Verblijfsoverzicht (pdf)
              </Button>
            </div>

            {hasInfo && (
              <details className="group rounded-lg border border-border" open>
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  Over de accommodatie
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
                </summary>
                <div className="space-y-4 px-4 pb-4">
                  <HotelGallery images={partner?.gallery_images || []} accommodationName={selectedQuote.accommodation_name} />
                  {selectedQuote.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{selectedQuote.description}</p>}
                  {partner?.about_text && <p className="whitespace-pre-line text-sm text-muted-foreground">{partner.about_text}</p>}
                  {partner?.highlight_features && partner.highlight_features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {partner.highlight_features.map((f, i) => (
                        <Pill key={i} tone="neutral">{f}</Pill>
                      ))}
                    </div>
                  )}
                  {selectedQuote.includes && selectedQuote.includes.length > 0 && (
                    <div>
                      <Label>Inbegrepen</Label>
                      <ul className="space-y-1 text-sm">
                        {selectedQuote.includes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(address || phone || email || website || partner?.location_description) && (
                    <div className="grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-2">
                      {address && (
                        <div>
                          <Label>Adres</Label>
                          <p>{address}</p>
                        </div>
                      )}
                      {(phone || email || website) && (
                        <div>
                          <Label>Contact met de accommodatie</Label>
                          <div className="flex flex-wrap gap-2">
                            {phone && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={`tel:${phone.replace(/\s/g, "")}`}>
                                  <Phone className="mr-2 h-4 w-4" aria-hidden="true" />
                                  {phone}
                                </a>
                              </Button>
                            )}
                            {email && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={`mailto:${email}`}>
                                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                                  E-mail
                                </a>
                              </Button>
                            )}
                            {website && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={website} target="_blank" rel="noreferrer">
                                  <Globe className="mr-2 h-4 w-4" aria-hidden="true" />
                                  Website
                                </a>
                              </Button>
                            )}
                          </div>
                          {partner?.booking_contact_name && <p className="mt-1.5 text-xs text-muted-foreground">t.a.v. {partner.booking_contact_name}</p>}
                        </div>
                      )}
                      {partner?.location_description && (
                        <div className="sm:col-span-2">
                          <Label>Ligging</Label>
                          <p className="whitespace-pre-line text-muted-foreground">{partner.location_description}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {partner?.location_lat && partner?.location_lng && (
                    <div className="border-t border-border pt-3">
                      <Label>Kaart en route</Label>
                      <HotelLocationMap lat={Number(partner.location_lat)} lng={Number(partner.location_lng)} label={selectedQuote.accommodation_name} address={address} />
                    </div>
                  )}
                  {selectedQuote.partner_notes && (
                    <div className="border-t border-border pt-3">
                      <Label>Toelichting van de accommodatie</Label>
                      <p className="whitespace-pre-line text-sm text-muted-foreground">{selectedQuote.partner_notes}</p>
                    </div>
                  )}
                  {selectedQuote.conditions && (
                    <div className="border-t border-border pt-3">
                      <Label>Voorwaarden</Label>
                      <p className="whitespace-pre-line text-sm text-muted-foreground">{selectedQuote.conditions}</p>
                    </div>
                  )}
                </div>
              </details>
            )}
          </CardContent>
        </Card>

        {customerToken && (
          <AccommodationMessageThread
            customerToken={customerToken}
            quoteId={selectedQuote.id}
            accommodationName={selectedQuote.accommodation_name}
            isBureauCentral={isBureauCentral}
          />
        )}
      </>
    );
  }

  // Offertes: kiezen.
  if (submittedQuotes.length > 0) {
    const requested = accommodation.quotes_requested_count;
    const received = submittedQuotes.length;
    const declined = accommodation.quotes_declined_count || 0;
    const waiting = Math.max(0, requested - received - declined);
    const showMapToggle = submittedQuotes.length > 1 && submittedQuotes.some((q) => presentQuotePartner(q).coordinates);

    return (
      <>
        <div className="space-y-3">
          <Notice tone="warning" title="Kies uw logies">
            {received === 1 ? "Er staat één offerte voor u klaar. Bekijk hem en kies als hij bij u past." : `Er staan ${received} offertes voor u klaar. Vergelijk ze en kies waar u slaapt.`}
            {requested > 0 && (declined > 0 || waiting > 0) && (
              <>
                {" "}
                {declined > 0 && `${declined} ${declined === 1 ? "accommodatie heeft" : "accommodaties hebben"} de aanvraag afgewezen.`}
                {declined > 0 && waiting > 0 && " "}
                {waiting > 0 && `Wij wachten nog op ${waiting} ${waiting === 1 ? "accommodatie" : "accommodaties"}.`}
              </>
            )}
          </Notice>

          {wishChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-accent-soft px-3 py-2.5">
              <span className="mr-1 text-xs font-semibold text-primary">Uw wensen</span>
              {wishChips.map((chip, i) => (
                <Pill key={i} tone="neutral" className="bg-background">
                  {chip}
                </Pill>
              ))}
              {onEditAccommodationSetup && (
                <Button variant="link" size="sm" className="ml-auto h-auto p-0 text-xs" onClick={onEditAccommodationSetup}>
                  Wensen aanpassen
                </Button>
              )}
            </div>
          )}

          {showMapToggle && (
            <div className="flex w-fit items-center gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Weergave">
              <Button variant={quoteView === "list" ? "secondary" : "ghost"} size="sm" role="tab" aria-selected={quoteView === "list"} onClick={() => setQuoteView("list")}>
                <List className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Lijst
              </Button>
              <Button variant={quoteView === "map" ? "secondary" : "ghost"} size="sm" role="tab" aria-selected={quoteView === "map"} onClick={() => setQuoteView("map")}>
                <MapIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Kaart
              </Button>
            </div>
          )}

          {quoteView === "map" && <AccommodationQuotesMap quotes={submittedQuotes} formatPrice={formatPrice} />}

          {submittedQuotes.map((quote) => {
            const validUntil = new Date(quote.valid_until);
            return (
              <div key={quote.id} id={`quote-${quote.id}`} className="scroll-mt-24">
                <AccommodationQuoteCard
                  quote={quote}
                  isExpired={isPast(validUntil)}
                  validUntil={validUntil}
                  onSelect={() => setSelectedQuoteForConfirm(quote)}
                  onContact={
                    customerToken
                      ? () => {
                          setContactQuote(quote);
                          setContactDialogOpen(true);
                        }
                      : undefined
                  }
                  formatPrice={formatPrice}
                  extrasOverride={extrasByQuoteId ? (extrasByQuoteId[quote.id] ?? []) : undefined}
                  numberOfGuests={accommodation.number_of_guests}
                  numberOfNights={numberOfNights}
                  facilitiesRequired={accommodation?.facilities_required ?? null}
                />
              </div>
            );
          })}
        </div>

        <SelectQuoteDialog
          quote={selectedQuoteForConfirm}
          open={!!selectedQuoteForConfirm}
          onOpenChange={(open) => !open && setSelectedQuoteForConfirm(null)}
          onConfirm={handleSelectQuote}
          isSelecting={isSelecting}
        />

        {customerToken && contactQuote && (
          <ContactAccommodationDialog
            open={contactDialogOpen}
            onOpenChange={(open) => {
              setContactDialogOpen(open);
              if (!open) setContactQuote(null);
            }}
            accommodationName={contactQuote.accommodation_name}
            quoteId={contactQuote.id}
            customerToken={customerToken}
            isBureauCentral={isBureauCentral}
          />
        )}
      </>
    );
  }

  // Alleen verlopen offertes.
  if (expiredQuotes.length > 0) {
    return (
      <Notice tone="warning" title="Logiesofferte verlopen">
        De offerte van <strong>{expiredQuotes[0].accommodation_name}</strong> was geldig tot en met{" "}
        {format(new Date(expiredQuotes[0].valid_until), "EEEE d MMMM yyyy", { locale: nl })} en is verlopen. Neem contact op met Bureau Vlieland
        voor een nieuwe offerte.
      </Notice>
    );
  }

  // Aangevraagd: wachten op offertes.
  const accommodationType = ACCOMMODATION_TYPES.find((t) => t.value === accommodation.accommodation_type);
  const TypeIcon = accommodationTypeIcon(accommodation.accommodation_type);
  const requested = accommodation.quotes_requested_count || 0;
  const declined = accommodation.quotes_declined_count || 0;
  const allDeclined = requested > 0 && declined >= requested;
  const waiting = Math.max(0, requested - declined);

  const occupancyLabel = ROOM_OCCUPANCY_OPTIONS.find((o) => o.value === accommodation.room_occupancy)?.label;
  const roomTypeLabels = (accommodation.room_types || []).map((v) => ROOM_TYPES.find((r) => r.value === v)?.label).filter(Boolean) as string[];
  const locationLabels = (accommodation.location_preference || [])
    .map((v) => LOCATION_PREFERENCES.find((l) => l.value === v))
    .filter((v): v is (typeof LOCATION_PREFERENCES)[number] => !!v);
  const facilityLabels = (accommodation.facilities_required || []).map((v) => FACILITIES.find((f) => f.value === v)?.label).filter(Boolean) as string[];
  const budgetLabel = BUDGET_RANGES.find((b) => b.value === accommodation.budget_range)?.label;
  const wishCount = [occupancyLabel, roomTypeLabels.length > 0, locationLabels.length > 0, facilityLabels.length > 0, budgetLabel, accommodation.special_requests].filter(Boolean).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            Uw logiesaanvraag
            <Pill tone={allDeclined ? "danger" : "info"}>{allDeclined ? "Geen beschikbaarheid" : "Aangevraagd"}</Pill>
          </CardTitle>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {dateSpan(accommodation.arrival_date, accommodation.departure_date)}
          <span aria-hidden="true">·</span>
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {accommodation.number_of_guests} personen
          {accommodationType && (
            <>
              <span aria-hidden="true">·</span>
              <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {accommodationType.label}
            </>
          )}
          {accommodation.room_count ? (
            <>
              <span aria-hidden="true">·</span>
              {accommodation.room_count} {accommodation.room_count > 1 ? "kamers" : "kamer"}
            </>
          ) : null}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {allDeclined ? (
          <Notice tone="danger" title={`Alle ${requested} benaderde ${requested === 1 ? "accommodatie heeft" : "accommodaties hebben"} afgewezen`}>
            Bureau Vlieland zoekt naar alternatieven en neemt contact met u op.
          </Notice>
        ) : (
          <Notice tone="info" title="Wij verzamelen offertes voor u">
            {requested > 0 && `Bureau Vlieland heeft ${requested} ${requested === 1 ? "accommodatie" : "accommodaties"} benaderd. `}
            {declined > 0 && `${declined} ${declined === 1 ? "heeft" : "hebben"} afgewezen. `}
            {waiting > 0 ? `Wij wachten nog op ${waiting}. ` : ""}
            U krijgt een e-mail zodra er offertes binnen zijn.
          </Notice>
        )}

        {declineReasons.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium">Opgegeven redenen</p>
            <ul className="list-inside list-disc space-y-0.5">
              {declineReasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Kamers</dt>
            <dd>{summarizeRooms(accommodation) || "nog niet opgegeven"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Verzorging</dt>
            <dd>{summarizeBoard(accommodation) || "nog niet opgegeven"}</dd>
          </div>
        </dl>

        {wishCount > 0 && (
          <details className="group rounded-lg border border-border" open={wishCount <= 2}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
              Uw wensen ({wishCount})
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
            </summary>
            <div className="space-y-3 px-3 pb-3 pt-1 text-sm">
              {occupancyLabel && (
                <div>
                  <Label>Kamerbezetting</Label>
                  <p>{occupancyLabel}</p>
                </div>
              )}
              {roomTypeLabels.length > 0 && (
                <div>
                  <Label>Gewenste kamertypes</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {roomTypeLabels.map((label, i) => (
                      <Pill key={i} tone="neutral">{label}</Pill>
                    ))}
                  </div>
                </div>
              )}
              {locationLabels.length > 0 && (
                <div>
                  <Label>Locatievoorkeur</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {locationLabels.map((loc, i) => {
                      const Icon = locationIcon(loc.value);
                      return (
                        <Pill key={i} tone="neutral">
                          <Icon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          {loc.label}
                        </Pill>
                      );
                    })}
                  </div>
                </div>
              )}
              {facilityLabels.length > 0 && (
                <div>
                  <Label>Gewenste faciliteiten</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {facilityLabels.map((label, i) => (
                      <Pill key={i} tone="neutral">{label}</Pill>
                    ))}
                  </div>
                </div>
              )}
              {budgetLabel && (
                <div>
                  <Label>Budget</Label>
                  <p>{budgetLabel}</p>
                </div>
              )}
              {accommodation.special_requests && (
                <div>
                  <Label>Bijzondere wensen</Label>
                  <p className="whitespace-pre-line text-muted-foreground">{accommodation.special_requests}</p>
                </div>
              )}
            </div>
          </details>
        )}

        <div className="flex flex-wrap gap-2">
          {onEditAccommodationSetup && (
            <Button variant="outline" size="sm" onClick={onEditAccommodationSetup}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Kamers en verzorging aanpassen
            </Button>
          )}
          {onEditAccommodation && (
            <Button variant="outline" size="sm" onClick={onEditAccommodation}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Datum of aantal wijzigen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
