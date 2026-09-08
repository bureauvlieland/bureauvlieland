import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { BedDouble, Clock, AlertTriangle, ExternalLink, FileText, ImageIcon, Mail, MapPin, Check, Navigation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { transformImageUrl } from "@/lib/supabaseImage";
import { useQuoteExtras } from "@/hooks/useQuoteExtras";
import { getBoardDisplay } from "@/types/accommodation";
import type { AccommodationQuote, RoomConfiguration } from "@/types/accommodation";
import { calculateExtraTotal, type AccommodationQuoteExtra } from "@/types/accommodationExtras";
import { presentQuotePartner, presentRoom, shortText, formatExtraMoment, describeDistances, matchFacilities } from "@/lib/accommodationQuotePresentation";
import { AccommodationQuoteDetailSheet } from "./AccommodationQuoteDetailSheet";

interface AccommodationQuoteCardProps {
  quote: AccommodationQuote;
  isExpired: boolean;
  validUntil: Date;
  onSelect: () => void;
  onContact?: () => void;
  formatPrice: (price: number) => string;
  extrasOverride?: AccommodationQuoteExtra[];
  numberOfGuests?: number | null;
  numberOfNights?: number | null;
  /** Gewenste faciliteiten uit de aanvraag (waarden uit FACILITIES). */
  facilitiesRequired?: string[] | null;
}

/**
 * Keuzekaart voor één logiesofferte op de klantpagina. Toont naast prijs en
 * verzorging ook wat de klant wil weten voordat hij kiest: foto's, ligging en
 * highlights van de accommodatie, de kamers, wat inbegrepen is en de extra's
 * met dag en tijd. "Alle details" opent het detailvenster.
 */
export const AccommodationQuoteCard = ({
  quote, isExpired, validUntil, onSelect, onContact, formatPrice, extrasOverride, numberOfGuests, numberOfNights, facilitiesRequired,
}: AccommodationQuoteCardProps) => {
  const [detailOpen, setDetailOpen] = useState(false);
  const { data: extrasFromHook = [] } = useQuoteExtras(extrasOverride ? undefined : quote.id);
  const extras = extrasOverride ?? extrasFromHook;
  const partner = presentQuotePartner(quote);
  const rooms = ((Array.isArray(quote.room_configuration) ? quote.room_configuration : []) as RoomConfiguration[]).map(presentRoom);
  const distances = describeDistances(partner.coordinates);
  const facilityMatch = matchFacilities(facilitiesRequired, partner.facilities);
  const includes = Array.isArray(quote.includes) ? (quote.includes as string[]) : [];
  const board = getBoardDisplay(quote.board_type);
  const summary = shortText(partner.aboutText) ?? shortText(quote.description);
  const locationLine = [partner.addressLine, partner.locationDescription].filter(Boolean).join(" · ");
  const photos = partner.images.slice(0, 3);
  const morePhotos = Math.max(0, partner.images.length - 3);
  const priceContext = [
    numberOfGuests ? `${numberOfGuests} personen` : null,
    numberOfNights ? `${numberOfNights} ${numberOfNights === 1 ? "nacht" : "nachten"}` : null,
  ].filter(Boolean).join(", ");

  return (
    <div className={cn("rounded-lg border bg-card shadow-sm overflow-hidden", isExpired && "opacity-70")}>
      {/* Foto's */}
      {photos.length > 0 ? (
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="w-full grid grid-cols-3 gap-1 h-44 sm:h-56 text-left"
          aria-label={`Foto's van ${quote.accommodation_name} bekijken`}
        >
          <img
            src={transformImageUrl(photos[0].url, { width: 900 })}
            alt={photos[0].alt || quote.accommodation_name}
            className={cn("h-full w-full object-cover", photos.length === 1 ? "col-span-3" : "col-span-2")}
            loading="lazy"
          />
          {photos.length > 1 && (
            <div className="grid grid-rows-2 gap-1 h-full min-h-0">
              <img src={transformImageUrl(photos[1].url, { width: 400 })} alt={photos[1].alt || ""} className="h-full w-full object-cover min-h-0" loading="lazy" />
              <div className="relative min-h-0">
                {photos[2] ? (
                  <img src={transformImageUrl(photos[2].url, { width: 400 })} alt={photos[2].alt || ""} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
                {morePhotos > 0 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-primary/55 text-white text-sm font-semibold">+{morePhotos} foto's</span>
                )}
              </div>
            </div>
          )}
        </button>
      ) : (
        <div className="h-24 bg-muted/60 flex items-center justify-center gap-2 text-sm text-muted-foreground px-4 text-center">
          <ImageIcon className="h-5 w-5 shrink-0" />
          Nog geen foto's van deze accommodatie.
          {partner.websiteUrl && (
            <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Bekijk de website</a>
          )}
        </div>
      )}

      <div className="p-4 sm:p-5 space-y-4">
        {/* Kop: naam, ligging, highlights en prijs */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-display text-xl font-medium leading-tight">{quote.accommodation_name}</h4>
              {isExpired ? (
                <Badge variant="destructive" className="gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Verlopen</Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs"><Clock className="h-3 w-3" />Geldig t/m {format(validUntil, "d MMM", { locale: nl })}</Badge>
              )}
            </div>
            {quote.partner?.name && quote.partner.name !== quote.accommodation_name && (
              <p className="text-sm text-muted-foreground">{quote.partner.name}</p>
            )}
            {locationLine && (
              <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" /><span>{locationLine}</span>
              </p>
            )}
            {distances && (
              <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                <Navigation className="h-4 w-4 mt-0.5 shrink-0" /><span>{distances.summary}</span>
              </p>
            )}
            {!facilityMatch.unknown && (facilityMatch.matched.length > 0 || facilityMatch.missing.length > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-0.5 text-xs">
                {facilityMatch.matched.map((label) => (
                  <span key={label} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5"><Check className="h-3 w-3" />{label}</span>
                ))}
                {facilityMatch.missing.map((label) => (
                  <span key={label} className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5"><X className="h-3 w-3" />{label}</span>
                ))}
              </div>
            )}
            {partner.highlights.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {partner.highlights.slice(0, 6).map((f, i) => (
                  <Badge key={i} variant="secondary" className="font-normal">{f}</Badge>
                ))}
              </div>
            )}
          </div>
          <div className="text-left sm:text-right shrink-0">
            {priceContext && <p className="text-xs text-muted-foreground">Totaal voor {priceContext}</p>}
            <p className="font-display text-2xl font-semibold leading-none mt-0.5">{formatPrice(quote.price_total)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {quote.price_per_person_per_night ? `${formatPrice(quote.price_per_person_per_night)} p.p. per nacht · ` : ""}
              {quote.price_includes_vat ? "incl. btw" : "excl. btw"} · {board.label.toLowerCase()}
            </p>
          </div>
        </div>

        {summary && <p className="text-sm text-foreground/85 leading-relaxed">{summary}</p>}

        {/* Kamers, verzorging, extra's */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border p-3 space-y-1.5 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Kamers</p>
            {rooms.length > 0 ? rooms.map((room, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {room.images[0] && (
                  <button type="button" onClick={() => setDetailOpen(true)} className="shrink-0" aria-label={`Foto's van ${room.name}`}>
                    <img src={transformImageUrl(room.images[0].url, { width: 160 })} alt={room.images[0].alt || room.name} className="h-9 w-12 rounded object-cover" loading="lazy" />
                  </button>
                )}
                <p className="min-w-0">
                  <strong>{room.count}×</strong> {room.name}
                  {room.occupancy ? <span className="text-muted-foreground"> · {room.occupancy} pers.</span> : null}
                  {room.hasDetails && (
                    <button type="button" onClick={() => setDetailOpen(true)} className="block text-xs text-primary hover:underline">
                      {[room.bedLabel, room.sizeSqm ? `${room.sizeSqm} m²` : null, room.facilityLabels.length > 0 ? `${room.facilityLabels.length} faciliteiten` : null].filter(Boolean).join(" · ") || "Bekijk kamer"}
                    </button>
                  )}
                </p>
              </div>
            )) : (
              <p className="text-muted-foreground flex items-center gap-1.5"><BedDouble className="h-4 w-4" />Kamerverdeling volgt in de offerte</p>
            )}
          </div>
          <div className="rounded-md border p-3 space-y-1.5 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Verzorging &amp; inbegrepen</p>
            <p><strong>{board.label}</strong></p>
            {quote.board_notes && <p className="text-xs text-muted-foreground">{quote.board_notes}</p>}
            {includes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {includes.slice(0, 5).map((item, idx) => (
                  <Badge key={idx} variant="outline" className="font-normal text-xs">{String(item)}</Badge>
                ))}
                {includes.length > 5 && <span className="text-xs text-muted-foreground">+{includes.length - 5}</span>}
              </div>
            )}
          </div>
          <div className="rounded-md border p-3 space-y-1.5 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Extra's in deze offerte</p>
            {extras.length === 0 ? (
              <p className="text-muted-foreground">Geen extra's aangeboden.</p>
            ) : (
              <>
                {extras.slice(0, 3).map((extra) => {
                  const moment = formatExtraMoment(extra.service_date, extra.service_time);
                  return (
                    <div key={extra.id} className="flex justify-between gap-2">
                      <span className="min-w-0">{extra.name}{moment && <span className="text-muted-foreground"> · {moment}</span>}</span>
                      <span className="font-medium whitespace-nowrap">
                        {formatPrice(extra.pricing_type === "per_person" ? extra.unit_price : calculateExtraTotal(extra))}{extra.pricing_type === "per_person" ? " p.p." : ""}
                      </span>
                    </div>
                  );
                })}
                {extras.length > 3 && <p className="text-xs text-muted-foreground">+{extras.length - 3} meer, zie details</p>}
                <p className="text-xs text-muted-foreground">Optioneel; u kiest ze bij het bevestigen.</p>
              </>
            )}
          </div>
        </div>

        {/* Onderbalk */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {quote.quote_attachment_url && (
              <a href={quote.quote_attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <FileText className="h-4 w-4" />Offerte-PDF
              </a>
            )}
            {quote.quote_external_url && (
              <a href={quote.quote_external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <ExternalLink className="h-4 w-4" />Volledige offerte
              </a>
            )}
            {quote.conditions && (
              <button type="button" onClick={() => setDetailOpen(true)} className="text-primary hover:underline">Voorwaarden</button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setDetailOpen(true)}>Alle details</Button>
            {onContact && (
              <Button variant="outline" size="sm" onClick={onContact}><Mail className="h-4 w-4 mr-1.5" />Vraag stellen</Button>
            )}
            <Button size="sm" onClick={onSelect} disabled={isExpired}>
              {isExpired ? "Verlopen" : (<><Check className="h-4 w-4 mr-1.5" />Kies dit logies</>)}
            </Button>
          </div>
        </div>
      </div>

      <AccommodationQuoteDetailSheet
        quote={quote}
        extras={extras}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSelect={() => { setDetailOpen(false); onSelect(); }}
        onContact={onContact}
        formatPrice={formatPrice}
        isExpired={isExpired}
        numberOfGuests={numberOfGuests}
        numberOfNights={numberOfNights}
        facilitiesRequired={facilitiesRequired}
      />
    </div>
  );
};
