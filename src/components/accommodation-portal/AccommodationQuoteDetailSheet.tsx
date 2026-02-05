import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Check, Clock, Building2, FileText, ExternalLink } from 'lucide-react';
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
import { useQuoteExtras } from '@/hooks/useQuoteExtras';
import { 
  calculateExtraTotal, 
  calculateExtrasTotal, 
  EXTRA_CATEGORY_ICONS 
} from '@/types/accommodationExtras';

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
  
  const { data: extras = [] } = useQuoteExtras(quote.id);
  const extrasTotal = calculateExtrasTotal(extras);
  const grandTotal = quote.price_total + extrasTotal;

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
                U hebt deze offerte gekozen
              </span>
            </div>
          )}

          {/* Pricing */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Verblijf ({numberOfGuests} gasten × {numberOfNights} nachten)</span>
              <span className="font-semibold">
                {formatPrice(quote.price_total)}
              </span>
            </div>
            
            {/* Extras breakdown */}
            {extras.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <span className="text-sm font-medium">Extra's inbegrepen:</span>
                  {extras.map((extra) => (
                    <div key={extra.id} className="flex justify-between items-start text-sm">
                      <div className="flex items-start gap-2">
                        <span>{EXTRA_CATEGORY_ICONS[extra.category as keyof typeof EXTRA_CATEGORY_ICONS] || '📦'}</span>
                        <div>
                          <span>{extra.name}</span>
                          {extra.pricing_type === 'per_person' && (
                            <span className="text-muted-foreground"> ({extra.quantity}×)</span>
                          )}
                          {extra.description && (
                            <p className="text-xs text-muted-foreground">{extra.description}</p>
                          )}
                        </div>
                      </div>
                      <span className="font-medium">{formatPrice(calculateExtraTotal(extra))}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <Separator />
            <div className="flex justify-between items-baseline">
              <span className="font-medium">Totaalprijs</span>
              <div className="text-right">
                <span className="text-xl font-bold text-primary">
                  {formatPrice(grandTotal)}
                </span>
                <p className="text-xs text-muted-foreground">
                  {quote.price_includes_vat ? 'incl.' : 'excl.'} BTW
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

          {/* External quote link */}
          {quote.quote_external_url && (
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Offerte document
              </h4>
              <a 
                href={quote.quote_external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 underline hover:no-underline"
              >
                Bekijk de volledige offerte →
              </a>
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
