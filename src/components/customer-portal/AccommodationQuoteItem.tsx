import { useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  BedDouble,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useQuoteExtras } from "@/hooks/useQuoteExtras";
import { calculateExtraTotal, calculateExtrasTotal, EXTRA_CATEGORY_LABELS } from "@/types/accommodationExtras";
import type { AccommodationQuote } from "@/types/accommodation";

interface AccommodationQuoteItemProps {
  quote: AccommodationQuote;
  isExpired: boolean;
  validUntil: Date;
  onSelect: () => void;
  formatPrice: (price: number) => string;
}

export const AccommodationQuoteItem = ({
  quote,
  isExpired,
  validUntil,
  onSelect,
  formatPrice,
}: AccommodationQuoteItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: extras = [] } = useQuoteExtras(isOpen ? quote.id : undefined);

  const extrasTotal = calculateExtrasTotal(extras);
  const grandTotal = quote.price_total + extrasTotal;
  const includes = Array.isArray(quote.includes) ? (quote.includes as string[]) : [];

  return (
    <div className={cn(
      "transition-all rounded-lg border bg-card p-4",
      isExpired && "opacity-60"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Partner image or icon */}
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {(quote.partner as any)?.image_url ? (
              <img
                src={(quote.partner as any).image_url}
                alt={quote.accommodation_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <BedDouble className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium">{quote.accommodation_name}</h4>
              {isExpired ? (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  Verlopen
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  Geldig t/m {format(validUntil, "d MMM", { locale: nl })}
                </Badge>
              )}
            </div>
            {quote.partner?.name && (
              <p className="text-sm text-muted-foreground mt-0.5">{quote.partner.name}</p>
            )}
          </div>

          {/* Price */}
          <div className="text-right shrink-0">
            <p className="font-semibold">{formatPrice(extrasTotal > 0 ? grandTotal : quote.price_total)}</p>
            {quote.price_per_person_per_night && (
              <p className="text-xs text-muted-foreground">
                {formatPrice(quote.price_per_person_per_night)} p.p.p.n.
              </p>
            )}
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="shrink-0">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
          <span>{quote.price_includes_vat ? "Incl." : "Excl."} BTW</span>
        </div>

        {/* Action row - always visible */}
        <div className="mt-3 flex flex-wrap gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? "Sluiten" : "Bekijk details"}
          </Button>
          {!isExpired && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={onSelect}
            >
              <Check className="h-4 w-4 mr-1.5" />
              Kies deze accommodatie
            </Button>
          )}
        </div>

        {/* Expanded content - full quote details */}
        <CollapsibleContent className="mt-4 pt-4 border-t space-y-4">
          {/* Description */}
          {quote.description && (
            <div>
              <p className="text-sm font-medium mb-1">Beschrijving</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{quote.description}</p>
            </div>
          )}

          {/* Room configuration */}
          {quote.room_configuration && Array.isArray(quote.room_configuration) && (quote.room_configuration as any[]).length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Kamerverdeling</p>
              <div className="space-y-1">
                {(quote.room_configuration as any[]).map((room: any, idx: number) => (
                  <p key={idx} className="text-sm text-muted-foreground">
                    {room.count}× {room.type || room.name}
                    {room.price_per_night ? ` — ${formatPrice(room.price_per_night)}/nacht` : ""}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Includes */}
          {includes.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Inbegrepen</p>
              <div className="flex flex-wrap gap-1.5">
                {includes.map((item, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {String(item)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Extras */}
          {extras.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Extra's</p>
              <div className="space-y-1">
                {extras.map((extra) => (
                  <div key={extra.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {extra.category && EXTRA_CATEGORY_LABELS[extra.category as keyof typeof EXTRA_CATEGORY_LABELS]
                        ? `${EXTRA_CATEGORY_LABELS[extra.category as keyof typeof EXTRA_CATEGORY_LABELS]} · `
                        : ""}
                      {extra.name}
                      {extra.pricing_type === "per_person" && extra.quantity > 1 ? ` (${extra.quantity}×)` : ""}
                    </span>
                    <span className="font-medium">{formatPrice(calculateExtraTotal(extra))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price breakdown */}
          {extras.length > 0 && (
            <div className="pt-2 border-t space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Verblijf</span>
                <span>{formatPrice(quote.price_total)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Extra's</span>
                <span>{formatPrice(extrasTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                <span>Totaal</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
            </div>
          )}

          {/* Conditions */}
          {quote.conditions && (
            <div>
              <p className="text-sm font-medium mb-1">Voorwaarden</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{quote.conditions}</p>
            </div>
          )}

          {/* External quote link */}
          {quote.quote_external_url && (
            <div>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={quote.quote_external_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Bekijk de volledige offerte
                </a>
              </Button>
            </div>
          )}

          {/* Partner notes */}
          {quote.partner_notes && (
            <div>
              <p className="text-sm font-medium mb-1">Opmerkingen accommodatie</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{quote.partner_notes}</p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
