import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Clock, ExternalLink, FileText, Globe, Mail, MapPin, Check, Navigation, X, LogIn, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HotelGallery } from "./HotelGallery";
import { HotelLocationMap } from "./HotelLocationMap";
import { getBoardDisplay } from "@/types/accommodation";
import type { AccommodationQuote, RoomConfiguration } from "@/types/accommodation";
import { calculateExtraTotal, calculateExtrasTotal, EXTRA_CATEGORY_LABELS, type AccommodationQuoteExtra } from "@/types/accommodationExtras";
import { presentQuotePartner, presentRoom, formatExtraMoment, describeDistances, matchFacilities } from "@/lib/accommodationQuotePresentation";
import { transformImageUrl } from "@/lib/supabaseImage";

interface AccommodationQuoteDetailSheetProps {
  quote: AccommodationQuote | null;
  extras: AccommodationQuoteExtra[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: () => void;
  onContact?: () => void;
  formatPrice: (price: number) => string;
  isExpired?: boolean;
  numberOfGuests?: number | null;
  numberOfNights?: number | null;
  facilitiesRequired?: string[] | null;
}

/**
 * Alle informatie over één logiesofferte: foto's, tekst en ligging van de
 * accommodatie, plus kamers, verzorging, extra's en voorwaarden van de offerte.
 * Wordt geopend vanaf de keuzekaart ("Alle details").
 */
export const AccommodationQuoteDetailSheet = ({
  quote, extras, open, onOpenChange, onSelect, onContact, formatPrice, isExpired, numberOfGuests, numberOfNights, facilitiesRequired,
}: AccommodationQuoteDetailSheetProps) => {
  if (!quote) return null;
  const partner = presentQuotePartner(quote);
  const rooms = ((Array.isArray(quote.room_configuration) ? quote.room_configuration : []) as RoomConfiguration[]).map(presentRoom);
  const distances = describeDistances(partner.coordinates);
  const facilityMatch = matchFacilities(facilitiesRequired, partner.facilities);
  const hasTimes = !!(partner.checkInTime || partner.checkOutTime);
  const includes = Array.isArray(quote.includes) ? (quote.includes as string[]) : [];
  const board = getBoardDisplay(quote.board_type);
  const extrasTotal = calculateExtrasTotal(extras);
  const validUntil = new Date(quote.valid_until);
  const context = [
    numberOfGuests ? `${numberOfGuests} personen` : null,
    numberOfNights ? `${numberOfNights} ${numberOfNights === 1 ? "nacht" : "nachten"}` : null,
    quote.price_includes_vat ? "incl. btw" : "excl. btw",
  ].filter(Boolean).join(" · ");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-3 border-b text-left">
          <SheetDescription className="text-xs uppercase tracking-wider">Logiesofferte</SheetDescription>
          <SheetTitle className="font-display text-2xl font-medium">{quote.accommodation_name}</SheetTitle>
          {quote.partner?.name && quote.partner.name !== quote.accommodation_name && (
            <p className="text-sm text-muted-foreground">{quote.partner.name}</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <HotelGallery images={partner.images} accommodationName={quote.accommodation_name} />

          {partner.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {partner.highlights.map((f, i) => (
                <Badge key={i} variant="secondary" className="font-normal">{f}</Badge>
              ))}
            </div>
          )}

          {(partner.aboutText || quote.description) && (
            <div className="space-y-3">
              {partner.aboutText && (
                <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">{partner.aboutText}</p>
              )}
              {quote.description && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Over deze offerte</p>
                  <p className="text-sm whitespace-pre-line">{quote.description}</p>
                </div>
              )}
            </div>
          )}

          {(partner.coordinates || partner.addressLine || partner.locationDescription) && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ligging</p>
              {partner.coordinates && (
                <HotelLocationMap
                  lat={partner.coordinates.lat}
                  lng={partner.coordinates.lng}
                  label={quote.accommodation_name}
                  address={partner.addressLine ?? ""}
                />
              )}
              <div className="text-sm text-muted-foreground space-y-1">
                {distances && (
                  <p className="flex items-center gap-1.5 text-foreground"><Navigation className="h-3.5 w-3.5" />{distances.summary}</p>
                )}
                {partner.locationDescription && <p>{partner.locationDescription}</p>}
                {partner.addressLine && (
                  <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{partner.addressLine}</p>
                )}
                {partner.websiteUrl && (
                  <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <Globe className="h-3.5 w-3.5" />Website van de accommodatie
                  </a>
                )}
              </div>
            </div>
          )}

          {(!facilityMatch.unknown || hasTimes) && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Faciliteiten &amp; tijden</p>
              {!facilityMatch.unknown && (
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {facilityMatch.matched.map((label) => (
                    <span key={label} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5" title="Gevraagd en aanwezig"><Check className="h-3 w-3" />{label}</span>
                  ))}
                  {facilityMatch.missing.map((label) => (
                    <span key={label} className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5" title="Gevraagd, niet opgegeven door de accommodatie"><X className="h-3 w-3" />{label}</span>
                  ))}
                  {facilityMatch.extra.map((label) => (
                    <Badge key={label} variant="outline" className="font-normal text-xs">{label}</Badge>
                  ))}
                </div>
              )}
              {facilityMatch.missing.length > 0 && (
                <p className="text-xs text-muted-foreground">Doorgestreepte wensen zijn niet opgegeven door de accommodatie; vraag het gerust na.</p>
              )}
              {hasTimes && (
                <p className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                  {partner.checkInTime && <span className="inline-flex items-center gap-1.5"><LogIn className="h-3.5 w-3.5" />Inchecken vanaf {partner.checkInTime}</span>}
                  {partner.checkOutTime && <span className="inline-flex items-center gap-1.5"><LogOut className="h-3.5 w-3.5" />Uitchecken tot {partner.checkOutTime}</span>}
                </p>
              )}
            </div>
          )}

          {rooms.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Kamers in deze offerte</p>
              <div className="rounded-lg border divide-y">
                {rooms.map((room, idx) => (
                  <div key={idx} className="px-3 py-3 text-sm space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span><strong>{room.count}×</strong> {room.name}{room.occupancy ? ` · ${room.occupancy} pers.` : ""}</span>
                      {room.pricePerNight ? <span className="text-muted-foreground whitespace-nowrap">{formatPrice(room.pricePerNight)} / nacht</span> : null}
                    </div>
                    {(room.bedLabel || room.sizeSqm) && (
                      <p className="text-xs text-muted-foreground">{[room.bedLabel, room.sizeSqm ? `${room.sizeSqm} m²` : null].filter(Boolean).join(" · ")}</p>
                    )}
                    {room.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{room.description}</p>}
                    {room.images.length > 0 && (
                      <div className="flex gap-1.5 overflow-x-auto">
                        {room.images.slice(0, 6).map((img, i) => (
                          <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                            <img src={transformImageUrl(img.url, { width: 320 })} alt={img.alt || room.name} className="h-20 w-28 rounded object-cover" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    )}
                    {room.facilityLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {room.facilityLabels.map((label) => (
                          <Badge key={label} variant="outline" className="font-normal text-xs">{label}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Verzorging &amp; inbegrepen</p>
              <div className="text-sm"><Badge variant={board.isKnown ? "secondary" : "outline"}>{board.label}</Badge></div>
              {quote.board_notes && <p className="text-sm text-muted-foreground whitespace-pre-line">{quote.board_notes}</p>}
              {includes.length > 0 && (
                <ul className="text-sm space-y-1">
                  {includes.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{String(item)}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Extra's (optioneel)</p>
              {extras.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen extra's aangeboden.</p>
              ) : (
                <ul className="text-sm space-y-1.5">
                  {extras.map((extra) => {
                    const moment = formatExtraMoment(extra.service_date, extra.service_time);
                    return (
                      <li key={extra.id} className="flex justify-between gap-3">
                        <span>
                          {extra.name}
                          {moment && <span className="text-muted-foreground"> · {moment}</span>}
                          {extra.category && EXTRA_CATEGORY_LABELS[extra.category as keyof typeof EXTRA_CATEGORY_LABELS] && (
                            <span className="block text-xs text-muted-foreground">{EXTRA_CATEGORY_LABELS[extra.category as keyof typeof EXTRA_CATEGORY_LABELS]}</span>
                          )}
                        </span>
                        <span className="font-medium whitespace-nowrap">
                          {formatPrice(extra.pricing_type === "per_person" ? extra.unit_price : calculateExtraTotal(extra))}
                          {extra.pricing_type === "per_person" ? " p.p." : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {(quote.conditions || quote.quote_attachment_url || quote.quote_external_url) && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Voorwaarden &amp; documenten</p>
              {quote.conditions && <p className="text-sm text-muted-foreground whitespace-pre-line">{quote.conditions}</p>}
              <div className="flex flex-wrap gap-2">
                {quote.quote_attachment_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={quote.quote_attachment_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-1.5" />{quote.quote_attachment_filename || "Offerte van de accommodatie"}
                    </a>
                  </Button>
                )}
                {quote.quote_external_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={quote.quote_external_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1.5" />Volledige offerte online
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {quote.partner_notes && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Toelichting van de accommodatie</p>
              <p className="text-sm whitespace-pre-line">{quote.partner_notes}</p>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-background">
          <div>
            <div className="font-display text-2xl font-semibold leading-none">{formatPrice(quote.price_total)}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              {context}
              {extrasTotal > 0 && <span>· extra's tot {formatPrice(extrasTotal)}</span>}
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />geldig t/m {format(validUntil, "d MMM", { locale: nl })}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {onContact && (
              <Button variant="outline" onClick={onContact}><Mail className="h-4 w-4 mr-1.5" />Vraag stellen</Button>
            )}
            {onSelect && (
              <Button onClick={onSelect} disabled={isExpired}>{isExpired ? "Verlopen" : "Kies dit logies"}</Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
