import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { RefreshCw, ArrowRight, Home, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccommodationQuotes } from '@/hooks/useAccommodationQuotes';
import { AccommodationRequestSummary } from '@/components/accommodation-portal/AccommodationRequestSummary';
import { AccommodationStatusBanner } from '@/components/accommodation-portal/AccommodationStatusBanner';
import { AccommodationQuoteCard } from '@/components/accommodation-portal/AccommodationQuoteCard';
import { AccommodationQuoteDetailSheet } from '@/components/accommodation-portal/AccommodationQuoteDetailSheet';
import { SelectQuoteDialog } from '@/components/accommodation-portal/SelectQuoteDialog';
import type { AccommodationQuote } from '@/types/accommodation';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

export default function AccommodationQuotes() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const {
    request,
    quotes,
    isLoading,
    error,
    refetch,
    selectQuote,
    quotesSummary,
  } = useAccommodationQuotes(token);

  const [selectedQuoteForDetails, setSelectedQuoteForDetails] = useState<AccommodationQuote | null>(null);
  const [selectedQuoteForConfirm, setSelectedQuoteForConfirm] = useState<AccommodationQuote | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleSelectQuote = async () => {
    if (!selectedQuoteForConfirm) return;

    setIsSelecting(true);
    const success = await selectQuote(selectedQuoteForConfirm.id);
    setIsSelecting(false);

    if (success) {
      toast({
        title: 'Offerte gekozen!',
        description: 'De accommodatie neemt contact met je op.',
      });
      setSelectedQuoteForConfirm(null);
    } else {
      toast({
        title: 'Fout',
        description: 'Er ging iets mis. Probeer het opnieuw.',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Aanvraag laden...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <Home className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Aanvraag niet gevonden</h1>
          <p className="text-muted-foreground">
            {error || 'Deze link is niet geldig of de aanvraag is verlopen.'}
          </p>
          <Button asChild>
            <Link to="/">Naar homepage</Link>
          </Button>
        </div>
      </div>
    );
  }

  const numberOfNights = differenceInDays(
    new Date(request.departure_date),
    new Date(request.arrival_date)
  );
  const hasSelectedQuote = quotesSummary.selected > 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={logo} alt="Bureau Vlieland" className="h-10" />
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Vernieuwen
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Jouw Logies Aanvraag</h1>
          {request.customer_company && (
            <p className="text-muted-foreground">
              {request.customer_company} • {request.number_of_guests} gasten • {numberOfNights} nachten
            </p>
          )}
        </div>

        {/* Request summary */}
        <div className="mb-6">
          <AccommodationRequestSummary request={request} />
        </div>

        {/* Status banner */}
        <div className="mb-8">
          <AccommodationStatusBanner request={request} quotesSummary={quotesSummary} />
        </div>

        {/* Quotes section */}
        {quotes.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">
              {hasSelectedQuote ? 'Je gekozen offerte' : 'Beschikbare offertes'}
            </h2>
            <div className="grid gap-4">
              {quotes.map((quote) => (
                <AccommodationQuoteCard
                  key={quote.id}
                  quote={quote}
                  numberOfGuests={request.number_of_guests}
                  numberOfNights={numberOfNights}
                  onSelect={() => setSelectedQuoteForConfirm(quote)}
                  onViewDetails={() => setSelectedQuoteForDetails(quote)}
                  isSelecting={isSelecting && selectedQuoteForConfirm?.id === quote.id}
                  hasSelectedQuote={hasSelectedQuote}
                />
              ))}
            </div>
          </section>
        )}

        {/* CTA for activities */}
        {request.wants_activities && (
          <section className="bg-primary/5 border border-primary/20 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Wil je ook activiteiten toevoegen?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Maak je verblijf compleet met leuke activiteiten, excursies en catering.
            </p>
            <Button asChild>
              <Link to="/programma-samenstellen">
                Naar programma samenstellen
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </section>
        )}

        {/* No activities but still show CTA if no quotes yet */}
        {!request.wants_activities && quotes.length === 0 && (
          <section className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Wil je in de tussentijd alvast activiteiten bekijken?
            </p>
            <Button variant="outline" asChild>
              <Link to="/programma-samenstellen">
                Bekijk activiteiten
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </section>
        )}
      </main>

      {/* Detail sheet */}
      <AccommodationQuoteDetailSheet
        quote={selectedQuoteForDetails}
        open={!!selectedQuoteForDetails}
        onOpenChange={(open) => !open && setSelectedQuoteForDetails(null)}
        onSelect={() => {
          if (selectedQuoteForDetails) {
            setSelectedQuoteForConfirm(selectedQuoteForDetails);
          }
        }}
        isSelecting={isSelecting}
        hasSelectedQuote={hasSelectedQuote}
        numberOfGuests={request.number_of_guests}
        numberOfNights={numberOfNights}
      />

      {/* Confirmation dialog */}
      <SelectQuoteDialog
        quote={selectedQuoteForConfirm}
        open={!!selectedQuoteForConfirm}
        onOpenChange={(open) => !open && setSelectedQuoteForConfirm(null)}
        onConfirm={handleSelectQuote}
        isSelecting={isSelecting}
      />
    </div>
  );
}
