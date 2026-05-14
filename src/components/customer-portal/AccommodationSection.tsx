import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { differenceInDays, format, isPast } from "date-fns";
import { nl } from "date-fns/locale";
import {
  BedDouble,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  ChevronRight,
  Pencil,
  AlertTriangle,
  Info,
  Phone,
  Mail,
  Globe,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SelectQuoteDialog } from "@/components/accommodation-portal/SelectQuoteDialog";
import type { AccommodationRequest, AccommodationQuote } from "@/types/accommodation";
import { ACCOMMODATION_TYPES } from "@/types/accommodation";
import { AccommodationQuoteItem } from "./AccommodationQuoteItem";
import { ContactAccommodationDialog } from "./ContactAccommodationDialog";
import { AccommodationMessageThread } from "./AccommodationMessageThread";
import { HotelLocationMap } from "./HotelLocationMap";
import { HotelGallery } from "./HotelGallery";

interface AccommodationSectionProps {
  accommodation: AccommodationRequest | null;
  quotes: AccommodationQuote[];
  onSelectQuote: (quoteId: string) => Promise<boolean>;
  selectedDates: Date[];
  onEditAccommodation?: () => void;
  customerToken?: string;
  numberOfPeople?: number;
  invoicingMode?: string | null;
}

export const AccommodationSection = ({
  accommodation,
  quotes,
  onSelectQuote,
  selectedDates,
  onEditAccommodation,
  customerToken,
  numberOfPeople,
  invoicingMode,
}: AccommodationSectionProps) => {
  const isBureauCentral = invoicingMode === "bureau_central";
  const [selectedQuoteForConfirm, setSelectedQuoteForConfirm] = useState<AccommodationQuote | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactQuote, setContactQuote] = useState<AccommodationQuote | null>(null);

  // Build URL with all parameters for seamless handoff
  const logiesUrl = useMemo(() => {
    const params = new URLSearchParams();
    
    // Add dates if multi-day
    if (selectedDates.length > 1) {
      const sorted = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      params.set("arrival", format(sorted[0], "yyyy-MM-dd"));
      params.set("departure", format(sorted[sorted.length - 1], "yyyy-MM-dd"));
    }
    
    // Add guests
    if (numberOfPeople) {
      params.set("guests", numberOfPeople.toString());
    }
    
    // Add program token for linking
    if (customerToken) {
      params.set("programToken", customerToken);
    }
    
    const paramString = params.toString();
    return paramString ? `/logies-aanvragen?${paramString}` : "/logies-aanvragen";
  }, [selectedDates, numberOfPeople, customerToken]);

  const handleSelectQuote = async () => {
    if (!selectedQuoteForConfirm) return;
    setIsSelecting(true);
    const success = await onSelectQuote(selectedQuoteForConfirm.id);
    setIsSelecting(false);
    if (success) {
      setSelectedQuoteForConfirm(null);
    }
  };

  const numberOfNights = accommodation
    ? differenceInDays(new Date(accommodation.departure_date), new Date(accommodation.arrival_date))
    : selectedDates.length > 1
    ? selectedDates.length - 1
    : 1;

  const hasSelectedQuote = quotes.some((q) => q.status === "selected");
  const selectedQuote = quotes.find((q) => q.status === "selected");
  const submittedQuotes = quotes.filter((q) => q.status === "submitted");
  const expiredQuotes = quotes.filter((q) => q.status === "expired");
  const declinedQuotes = quotes.filter((q) => q.status === "declined" || q.status === "rejected");

  // Deduplicated decline reasons (anonymized - no partner names)
  const declineReasons = useMemo(() => {
    const reasons = declinedQuotes
      .map((q) => q.partner_notes)
      .filter((note): note is string => !!note && note.trim().length > 0);
    return [...new Set(reasons)];
  }, [declinedQuotes]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(price);

  // State 0: Cancelled - show closure message
  if (accommodation?.status === "cancelled") {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
              <BedDouble className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-muted-foreground">Logiesaanvraag gesloten</h3>
              <p className="text-sm text-muted-foreground">
                Bureau Vlieland heeft helaas geen passende logies kunnen vinden voor uw aanvraag.
                Neem gerust contact met ons op als u zelf alternatieve logies heeft gevonden of als wij u op een andere manier kunnen helpen.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(accommodation.arrival_date), "EEE d MMM", { locale: nl })} –{" "}
                  {format(new Date(accommodation.departure_date), "EEE d MMM yyyy", { locale: nl })}
                </span>
                <span>·</span>
                <Users className="h-3 w-3" />
                <span>{accommodation.number_of_guests} gasten</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 1: No accommodation linked - show CTA with partner-oriented tone
  if (!accommodation) {
    return (
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <BedDouble className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Meerdaags verblijf? Wij helpen graag met passende logies.</h3>
                <p className="text-sm text-muted-foreground">
                  Een sterk programma begint met comfortabele en beschikbare accommodatie.
                  Wij vragen vrijblijvend offertes aan bij geschikte locaties en voegen deze toe aan uw programma.
                </p>
                <p className="text-xs text-muted-foreground/80 italic">
                  Vrijblijvend. U ontvangt binnen 2 werkdagen passende voorstellen.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0">
              <Link to={logiesUrl}>
                Logies laten regelen
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 2: Accommodation with selected quote - show confirmation
  if (hasSelectedQuote && selectedQuote) {
    return (
      <>
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-green-600" />
              Uw Logies
            </CardTitle>
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Gekozen
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Partner gallery thumbnail */}
            {selectedQuote.partner?.gallery_images && (selectedQuote.partner.gallery_images as any[]).length > 0 && (
              <img
                src={(selectedQuote.partner.gallery_images as any[])[0].url}
                alt={selectedQuote.accommodation_name}
                className="w-full md:w-32 h-24 md:h-24 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{selectedQuote.accommodation_name}</h3>
              {selectedQuote.partner?.name && (
                <p className="text-sm text-muted-foreground">{selectedQuote.partner.name}</p>
              )}
              
              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(accommodation.arrival_date), "EEE d MMM", { locale: nl })} -{" "}
                    {format(new Date(accommodation.departure_date), "EEE d MMM", { locale: nl })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{accommodation.number_of_guests} gasten</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{formatPrice(selectedQuote.price_total)}</p>
              <p className="text-xs text-muted-foreground">
                {selectedQuote.price_includes_vat ? "incl." : "excl."} BTW
              </p>
              {selectedQuote.price_per_person_per_night && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formatPrice(selectedQuote.price_per_person_per_night)} p.p.p.n.
                </p>
              )}
            </div>
          </div>

          {/* Reservation status */}
          <div className="rounded-lg border border-green-200 bg-green-100/60 dark:border-green-900 dark:bg-green-900/20 p-3 text-sm text-green-800 dark:text-green-200 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Reservering bevestigd</p>
              <p className="text-green-700 dark:text-green-300 mt-0.5">
                {isBureauCentral
                  ? "Bureau Vlieland regelt de reservering en facturatie. U hoeft verder niets te doen — hieronder vindt u alle informatie over uw verblijf."
                  : "Uw verblijf is geboekt. Hieronder vindt u alle praktische informatie."}
              </p>
            </div>
          </div>

          {/* Hotel / accommodation information */}
          {(selectedQuote.partner || selectedQuote.description || selectedQuote.includes?.length || selectedQuote.conditions || selectedQuote.partner_notes) && (
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Informatie over uw verblijf
              </h4>

              <HotelGallery
                images={selectedQuote.partner?.gallery_images || []}
                accommodationName={selectedQuote.accommodation_name}
              />

              {selectedQuote.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedQuote.description}</p>
              )}

              {selectedQuote.partner?.about_text && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedQuote.partner.about_text}</p>
              )}

              {selectedQuote.partner?.highlight_features && selectedQuote.partner.highlight_features.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedQuote.partner.highlight_features.map((f, i) => (
                    <Badge key={i} variant="secondary" className="font-normal">{f}</Badge>
                  ))}
                </div>
              )}

              {selectedQuote.includes && selectedQuote.includes.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Inbegrepen</p>
                  <ul className="text-sm space-y-1">
                    {selectedQuote.includes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-600 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedQuote.partner && (selectedQuote.partner.address_street || selectedQuote.partner.phone || selectedQuote.partner.booking_contact_phone || selectedQuote.partner.contact_email || selectedQuote.partner.email || selectedQuote.partner.website_url || selectedQuote.partner.location_description) && (
                <div className="grid sm:grid-cols-2 gap-3 text-sm pt-2 border-t">
                  {(selectedQuote.partner.address_street || selectedQuote.partner.address_city) && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Adres</p>
                      <p>
                        {selectedQuote.partner.address_street}
                        {selectedQuote.partner.address_postal || selectedQuote.partner.address_city ? (
                          <>
                            <br />
                            {[selectedQuote.partner.address_postal, selectedQuote.partner.address_city].filter(Boolean).join(" ")}
                          </>
                        ) : null}
                      </p>
                    </div>
                  )}
                  {(() => {
                    const phone = selectedQuote.partner.booking_contact_phone || selectedQuote.partner.phone;
                    const email = selectedQuote.partner.contact_email || selectedQuote.partner.email;
                    const website = selectedQuote.partner.website_url;
                    if (!phone && !email && !website) return null;
                    return (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Contact accommodatie</p>
                        <div className="flex flex-wrap gap-2">
                          {phone && (
                            <a href={`tel:${phone.replace(/\s/g, "")}`}>
                              <Button size="sm" variant="default">
                                <Phone className="h-4 w-4 mr-2" />
                                Bel {phone}
                              </Button>
                            </a>
                          )}
                          {email && (
                            <a href={`mailto:${email}`}>
                              <Button size="sm" variant="outline">
                                <Mail className="h-4 w-4 mr-2" />
                                E-mail
                              </Button>
                            </a>
                          )}
                          {website && (
                            <a href={website} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline">
                                <Globe className="h-4 w-4 mr-2" />
                                Website
                              </Button>
                            </a>
                          )}
                        </div>
                        {selectedQuote.partner.booking_contact_name && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            t.a.v. {selectedQuote.partner.booking_contact_name}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  {selectedQuote.partner.location_description && (
                    <div className="sm:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Locatie</p>
                      <p className="text-muted-foreground whitespace-pre-line">{selectedQuote.partner.location_description}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedQuote.partner?.location_lat && selectedQuote.partner?.location_lng && (
                <div className="pt-2 border-t">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Kaart & route</p>
                  <HotelLocationMap
                    lat={Number(selectedQuote.partner.location_lat)}
                    lng={Number(selectedQuote.partner.location_lng)}
                    label={selectedQuote.accommodation_name}
                    address={[
                      selectedQuote.partner.address_street,
                      [selectedQuote.partner.address_postal, selectedQuote.partner.address_city].filter(Boolean).join(" "),
                    ].filter(Boolean).join(", ")}
                  />
                </div>
              )}

              {selectedQuote.partner_notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Toelichting van de accommodatie</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedQuote.partner_notes}</p>
                </div>
              )}

              {selectedQuote.conditions && (
                <div className="pt-2 border-t">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Voorwaarden</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedQuote.conditions}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { generateStayOverviewPdf } = await import("@/lib/stayOverviewPdf");
                await generateStayOverviewPdf(accommodation, selectedQuote, accommodation.customer_company || accommodation.customer_name);
              }}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Download verblijfsoverzicht (PDF)
            </Button>
            {onEditAccommodation && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEditAccommodation}
                className="w-full sm:w-auto"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Datum, aantal personen of doel wijzigen
              </Button>
            )}
          </div>
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

  // State 3: Quotes available - show as collapsible items like program items
  if (submittedQuotes.length > 0) {
    return (
      <>
        <div className="space-y-3">
          {accommodation.quotes_requested_count > 0 && (() => {
            const requested = accommodation.quotes_requested_count;
            const received = submittedQuotes.length;
            const declined = accommodation.quotes_declined_count || 0;
            const waiting = Math.max(0, requested - received - declined);
            return (
              <p className="text-xs text-muted-foreground/80 mb-1">
                {requested} logiespartner{requested !== 1 ? 's' : ''} benaderd
                {received > 0 && `. Van ${received} partner${received !== 1 ? 's' : ''} hebben wij een offerte ontvangen`}
                {declined > 0 && `. ${declined} partner${declined !== 1 ? 's' : ''} ${declined !== 1 ? 'hebben' : 'heeft'} de aanvraag helaas afgewezen`}
                {waiting > 0 && `. Wij wachten nog op een reactie van ${waiting} partner${waiting !== 1 ? 's' : ''}`}
                .
              </p>
            );
          })()}
          <p className="text-sm text-muted-foreground">
            Bekijk en vergelijk de offertes. Kies de optie die het beste bij u past.
          </p>

          {submittedQuotes.map((quote) => {
            const validUntil = new Date(quote.valid_until);
            const isExpired = isPast(validUntil);

            return (
              <AccommodationQuoteItem
                key={quote.id}
                quote={quote}
                isExpired={isExpired}
                validUntil={validUntil}
                onSelect={() => setSelectedQuoteForConfirm(quote)}
                onContact={customerToken ? () => {
                  setContactQuote(quote);
                  setContactDialogOpen(true);
                } : undefined}
                formatPrice={formatPrice}
              />
            );
          })}
        </div>

        {/* Confirmation dialog */}
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

  // State 3b: Only expired quotes, no submitted ones
  if (expiredQuotes.length > 0 && submittedQuotes.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Logiesofferte verlopen</h3>
                <p className="text-sm text-muted-foreground">
                  De ontvangen offerte van{" "}
                  <strong>{expiredQuotes[0].accommodation_name}</strong> is helaas verlopen.
                  Neem contact op met Bureau Vlieland om een nieuwe offerte aan te vragen.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                  <Clock className="h-3 w-3" />
                  <span>
                    Geldig t/m {format(new Date(expiredQuotes[0].valid_until), "EEE d MMMM yyyy", { locale: nl })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 4: Waiting for quotes
  const accommodationType = ACCOMMODATION_TYPES.find((t) => t.value === accommodation.accommodation_type);
  const requested = accommodation.quotes_requested_count || 0;
  const declined = accommodation.quotes_declined_count || 0;
  const allDeclined = requested > 0 && declined >= requested;

  return (
    <Card className={allDeclined
      ? "border-destructive/30 bg-destructive/5 dark:border-destructive/50 dark:bg-destructive/10"
      : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
    }>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BedDouble className={`h-5 w-5 ${allDeclined ? "text-destructive" : "text-amber-600"}`} />
            Uw Logiesaanvraag
          </CardTitle>
          <Badge variant="outline" className={allDeclined
            ? "border-destructive text-destructive"
            : "border-amber-500 text-amber-700"
          }>
            {allDeclined ? (
              <><AlertTriangle className="h-3 w-3 mr-1" /> Geen beschikbaarheid</>
            ) : (
              <><Clock className="h-3 w-3 mr-1" /> In behandeling</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Request summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(accommodation.arrival_date), "EEE d MMM", { locale: nl })} -{" "}
              {format(new Date(accommodation.departure_date), "EEE d MMM", { locale: nl })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{accommodation.number_of_guests} gasten</span>
          </div>
          {accommodationType && (
            <div className="flex items-center gap-2">
              <span>{accommodationType.icon}</span>
              <span>{accommodationType.label}</span>
            </div>
          )}
          {accommodation.room_count && (
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-muted-foreground" />
              <span>{accommodation.room_count} kamer{accommodation.room_count > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Status message */}
        {allDeclined ? (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 dark:bg-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                Helaas hebben alle {requested} benaderde partner{requested !== 1 ? 's' : ''} de aanvraag afgewezen.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Bureau Vlieland zoekt naar alternatieven en neemt contact met u op.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {(() => {
                  const waiting = Math.max(0, requested - declined);
                  const parts: string[] = [];
                  if (requested > 0) {
                    parts.push(`Bureau Vlieland heeft ${requested} logiespartner${requested !== 1 ? 's' : ''} benaderd.`);
                  }
                  if (declined > 0) {
                    parts.push(`${declined} partner${declined !== 1 ? 's' : ''} ${declined !== 1 ? 'hebben' : 'heeft'} helaas afgewezen.`);
                  }
                  if (waiting > 0) {
                    parts.push(`Wij wachten nog op ${waiting} partner${waiting !== 1 ? 's' : ''}.`);
                  } else {
                    parts.push('U ontvangt een email zodra er offertes binnenkomen.');
                  }
                  return parts.join(' ');
                })()}
              </p>
              <Progress value={30} className="h-1.5 mt-2 bg-amber-200" />
            </div>
          </div>
        )}

        {/* Decline reasons (anonymized) */}
        {declineReasons.length > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">Opgegeven redenen van afwijzing:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {declineReasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Edit button */}
        {onEditAccommodation && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEditAccommodation}
            className="w-full sm:w-auto"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Gegevens wijzigen
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
