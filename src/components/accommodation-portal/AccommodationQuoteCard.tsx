import { format, isPast } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Check, Clock, AlertTriangle, Eye } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AccommodationQuote } from '@/types/accommodation';
import { useQuoteExtras } from '@/hooks/useQuoteExtras';
import { calculateExtrasTotal, EXTRA_CATEGORY_ICONS } from '@/types/accommodationExtras';

interface AccommodationQuoteCardProps {
  quote: AccommodationQuote;
  numberOfGuests: number;
  numberOfNights: number;
  onSelect: () => void;
  onViewDetails: () => void;
  isSelecting?: boolean;
  hasSelectedQuote: boolean;
}

export function AccommodationQuoteCard({
  quote,
  numberOfGuests,
  numberOfNights,
  onSelect,
  onViewDetails,
  isSelecting,
  hasSelectedQuote,
}: AccommodationQuoteCardProps) {
  const isSelected = quote.status === 'selected';
  const validUntil = new Date(quote.valid_until);
  const isExpired = isPast(validUntil);
  const includes = quote.includes || [];
  
  const { data: extras = [] } = useQuoteExtras(quote.id);
  const extrasTotal = calculateExtrasTotal(extras);
  const grandTotal = quote.price_total + extrasTotal;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  return (
    <Card className={`relative transition-all ${isSelected ? 'ring-2 ring-green-500 border-green-500' : ''}`}>
      {isSelected && (
        <div className="absolute -top-3 left-4">
          <Badge className="bg-green-500 text-white">
            <Check className="h-3 w-3 mr-1" />
            Gekozen
          </Badge>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{quote.accommodation_name}</h3>
            {quote.partner?.name && (
              <p className="text-sm text-muted-foreground">{quote.partner.name}</p>
            )}
          </div>
          {isExpired && !isSelected ? (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Verlopen
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Geldig t/m {format(validUntil, 'd MMM', { locale: nl })}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pricing */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-sm text-muted-foreground">Verblijf</span>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatPrice(quote.price_total)}</p>
            </div>
          </div>
          
          {/* Show extras if any */}
          {extras.length > 0 && (
            <>
              <div className="text-sm space-y-1">
                {extras.slice(0, 3).map((extra) => (
                  <div key={extra.id} className="flex justify-between text-muted-foreground">
                    <span>
                      {EXTRA_CATEGORY_ICONS[extra.category as keyof typeof EXTRA_CATEGORY_ICONS] || '📦'} {extra.name}
                    </span>
                    <span>
                      {formatPrice(extra.pricing_type === 'fixed' ? extra.unit_price : extra.unit_price * extra.quantity)}
                    </span>
                  </div>
                ))}
                {extras.length > 3 && (
                  <p className="text-xs text-muted-foreground">+ {extras.length - 3} meer extra's</p>
                )}
              </div>
              <div className="border-t pt-2 flex justify-between items-baseline">
                <span className="font-medium">Totaal</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{formatPrice(grandTotal)}</p>
                  <p className="text-xs text-muted-foreground">
                    {quote.price_includes_vat ? 'incl.' : 'excl.'} BTW
                  </p>
                </div>
              </div>
            </>
          )}
          
          {extras.length === 0 && (
            <div className="flex justify-between items-baseline border-t pt-2">
              <span className="font-medium">Totaal</span>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{formatPrice(quote.price_total)}</p>
                <p className="text-xs text-muted-foreground">
                  {quote.price_includes_vat ? 'incl.' : 'excl.'} BTW
                </p>
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            {numberOfGuests} gasten × {numberOfNights} nachten
          </p>
        </div>

        {/* Includes */}
        {includes.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Inbegrepen:</p>
            <div className="flex flex-wrap gap-1.5">
              {includes.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  <Check className="h-3 w-3 mr-1 text-green-600" />
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Description preview */}
        {quote.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {quote.description}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-4 border-t">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onViewDetails}
        >
          <Eye className="h-4 w-4 mr-2" />
          Details
        </Button>
        {!hasSelectedQuote && !isExpired && (
          <Button
            className="flex-1"
            onClick={onSelect}
            disabled={isSelecting}
          >
            {isSelecting ? (
              'Bezig...'
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Kies deze
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
