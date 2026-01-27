import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Check, Clock, Building2, FileText } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AccommodationQuote, RoomConfiguration } from '@/types/accommodation';

interface AccommodationQuoteDetailSheetProps {
  quote: AccommodationQuote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: () => void;
  isSelecting?: boolean;
  hasSelectedQuote: boolean;
  numberOfGuests: number;
  numberOfNights: number;
}

export function AccommodationQuoteDetailSheet({
  quote,
  open,
  onOpenChange,
  onSelect,
  isSelecting,
  hasSelectedQuote,
  numberOfGuests,
  numberOfNights,
}: AccommodationQuoteDetailSheetProps) {
  if (!quote) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const validUntil = new Date(quote.valid_until);
  const isSelected = quote.status === 'selected';
  const roomConfig = quote.room_configuration || [];
  const includes = quote.includes || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <SheetTitle>{quote.accommodation_name}</SheetTitle>
          </div>
          {quote.partner?.name && (
            <SheetDescription>{quote.partner.name}</SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          {isSelected && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-200">
                Je hebt deze offerte gekozen
              </span>
            </div>
          )}

          {/* Pricing */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Prijs per persoon per nacht</span>
              <span className="font-semibold">
                {quote.price_per_person_per_night
                  ? formatPrice(quote.price_per_person_per_night)
                  : 'n.v.t.'}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">
                {numberOfGuests} gasten × {numberOfNights} nachten
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-baseline">
              <span className="font-medium">Totaalprijs</span>
              <div className="text-right">
                <span className="text-xl font-bold text-primary">
                  {formatPrice(quote.price_total)}
                </span>
                <p className="text-xs text-muted-foreground">
                  {quote.price_includes_vat ? 'incl.' : 'excl.'} {quote.vat_rate}% BTW
                </p>
              </div>
            </div>
          </div>

          {/* Validity */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Offerte geldig tot {format(validUntil, 'd MMMM yyyy', { locale: nl })}
            </span>
          </div>

          {/* Room configuration */}
          {roomConfig.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Kamerconfiguratie</h4>
              <div className="space-y-2">
                {roomConfig.map((room: RoomConfiguration, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{room.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {room.count}× voor {room.occupancy} {room.occupancy === 1 ? 'persoon' : 'personen'}
                      </p>
                    </div>
                    <span className="font-medium">
                      {formatPrice(room.price_per_night)} /nacht
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What's included */}
          {includes.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Inbegrepen</h4>
              <div className="flex flex-wrap gap-2">
                {includes.map((item, index) => (
                  <Badge key={index} variant="secondary">
                    <Check className="h-3 w-3 mr-1 text-green-600" />
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {quote.description && (
            <div>
              <h4 className="font-medium mb-2">Beschrijving</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {quote.description}
              </p>
            </div>
          )}

          {/* Conditions */}
          {quote.conditions && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Voorwaarden
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {quote.conditions}
              </p>
            </div>
          )}

          {/* Partner notes */}
          {quote.partner_notes && (
            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-amber-800 dark:text-amber-200">
                Opmerking van de accommodatie
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {quote.partner_notes}
              </p>
            </div>
          )}

          {/* Action button */}
          {!hasSelectedQuote && (
            <div className="pt-4">
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  onSelect();
                  onOpenChange(false);
                }}
                disabled={isSelecting}
              >
                {isSelecting ? (
                  'Bezig met verwerken...'
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Kies deze offerte
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
