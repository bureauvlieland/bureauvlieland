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
  Mail,
  AlertTriangle,
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
}: AccommodationSectionProps) => {
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

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(price);

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
                    {format(new Date(accommodation.arrival_date), "d MMM", { locale: nl })} -{" "}
                    {format(new Date(accommodation.departure_date), "d MMM", { locale: nl })}
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

          <p className="text-sm text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-lg p-3">
            De accommodatie neemt contact met u op om de reservering definitief te maken.
          </p>

          <div className="flex flex-wrap gap-2">
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
            {customerToken && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setContactDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                <Mail className="h-4 w-4 mr-2" />
                Neem contact op met {selectedQuote.accommodation_name}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {customerToken && (
        <ContactAccommodationDialog
          open={contactDialogOpen}
          onOpenChange={setContactDialogOpen}
          accommodationName={selectedQuote.accommodation_name}
          quoteId={selectedQuote.id}
          customerToken={customerToken}
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
                    Geldig t/m {format(new Date(expiredQuotes[0].valid_until), "d MMMM yyyy", { locale: nl })}
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

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-amber-600" />
            Uw Logiesaanvraag
          </CardTitle>
          <Badge variant="outline" className="border-amber-500 text-amber-700">
            <Clock className="h-3 w-3 mr-1" />
            In behandeling
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Request summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(accommodation.arrival_date), "d MMM", { locale: nl })} -{" "}
              {format(new Date(accommodation.departure_date), "d MMM", { locale: nl })}
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
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Wij verzamelen offertes voor u. U ontvangt een email zodra accommodaties reageren.
            </p>
            <Progress value={30} className="h-1.5 mt-2 bg-amber-200" />
          </div>
        </div>

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
