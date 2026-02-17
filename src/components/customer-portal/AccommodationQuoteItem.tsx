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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { AccommodationQuote } from "@/types/accommodation";

interface AccommodationQuoteItemProps {
  quote: AccommodationQuote;
  isExpired: boolean;
  validUntil: Date;
  onViewDetails: () => void;
  onSelect: () => void;
  formatPrice: (price: number) => string;
}

export const AccommodationQuoteItem = ({
  quote,
  isExpired,
  validUntil,
  onViewDetails,
  onSelect,
  formatPrice,
}: AccommodationQuoteItemProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn(
      "transition-all rounded-lg border bg-card p-4",
      isExpired && "opacity-60"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <BedDouble className="h-5 w-5 text-primary" />
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
            <p className="font-semibold">{formatPrice(quote.price_total)}</p>
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
            onClick={onViewDetails}
          >
            Bekijk details
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

        {/* Expanded content */}
        <CollapsibleContent className="mt-4 pt-4 border-t space-y-3">
          {quote.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">{quote.description}</p>
          )}
          {quote.conditions && (
            <div>
              <p className="text-sm font-medium mb-1">Voorwaarden</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{quote.conditions}</p>
            </div>
          )}
          {quote.partner_notes && (
            <div>
              <p className="text-sm font-medium mb-1">Opmerkingen accommodatie</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{quote.partner_notes}</p>
            </div>
          )}
          {quote.room_configuration && Array.isArray(quote.room_configuration) && (
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
