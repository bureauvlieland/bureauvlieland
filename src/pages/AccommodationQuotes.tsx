import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { differenceInDays } from "date-fns";
import { ArrowRight, BedDouble, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container, EmptyState, LoadingState, Notice } from "@/components/system";
import { TabHeader } from "@/components/customer-portal/TabHeader";
import { buildTabHeader } from "@/components/customer-portal/tabHeaderConfig";
import { AccommodationSection } from "@/components/customer-portal/AccommodationSection";
import { ProjectDocumentsPanel } from "@/components/shared/ProjectDocumentsPanel";
import { useAccommodationQuotes } from "@/hooks/useAccommodationQuotes";
import { useToast } from "@/hooks/use-toast";
import { reportError } from "@/lib/errorReporting";
import type { AccommodationQuote, AccommodationRequest } from "@/types/accommodation";
import type { AccommodationQuoteExtra } from "@/types/accommodationExtras";
import logoImage from "@/assets/logo.png";

/**
 * De losse logiesaanvraag (`/mijn-logies/<token>`, logiesportaal op het
 * ontwerpsysteem): een aanvraag zonder programma, uit de mails van Bureau
 * Vlieland. Dezelfde schil, kop en logiessectie als het tabblad Logies in
 * het klantportaal, zodat de klant op beide plekken hetzelfde ziet. Hoort
 * de aanvraag bij een programma, dan stuurt de pagina door naar dat
 * programma.
 */
const Schil = ({ children, onRefresh }: { children: React.ReactNode; onRefresh?: () => void }) => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Uw logies | Bureau Vlieland</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container size="full" className="flex items-center justify-between gap-2 py-3 sm:py-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={logoImage} alt="Bureau Vlieland" className="h-7 sm:h-8" />
        </Link>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} aria-label="Vernieuwen">
            <RefreshCw className="h-4 w-4 sm:mr-1" aria-hidden="true" />
            <span className="hidden sm:inline">Vernieuwen</span>
          </Button>
        )}
      </Container>
    </header>
    <Container as="main" id="main-content" size="full" className="pt-8 pb-12">
      {children}
    </Container>
  </div>
);

interface AccommodationQuotesViewProps {
  request: AccommodationRequest;
  quotes: AccommodationQuote[];
  extrasByQuoteId: Record<string, AccommodationQuoteExtra[]>;
  onSelectQuote: (quoteId: string, signatureName: string, acceptedTerms: boolean) => Promise<boolean>;
  onRefresh?: () => void;
  /** De klantcode voor de documenten; zonder code (de referentiepagina) geen documentenkaart. */
  token?: string;
}

/** De inhoud van de pagina, los van het ophalen; de referentiepagina gebruikt hem met verzonnen data. */
export const AccommodationQuotesView = ({ request, quotes, extrasByQuoteId, onSelectQuote, onRefresh, token }: AccommodationQuotesViewProps) => {
  const arrival = new Date(request.arrival_date);
  const departure = new Date(request.departure_date);
  const selectedDates = [arrival, departure].filter((d) => !Number.isNaN(d.getTime()));
  const hasSelectedQuote = quotes.some((q) => q.status === "selected");
  const head = buildTabHeader({
    section: "accommodation",
    statusSummary: { total: 0, confirmed: 0, pending: 0, alternative: 0 },
    accommodationQuotes: quotes,
    hasAccommodationRequest: true,
    billingComplete: false,
    termsAccepted: false,
    customerApprovedCount: 0,
    customerApprovableCount: 0,
    customerActionsCount: 0,
  });

  return (
    <Schil onRefresh={onRefresh}>
      <div className="mx-auto max-w-3xl space-y-6">
        <TabHeader {...head} selectedDates={selectedDates} numberOfPeople={request.number_of_guests} referenceNumber={request.reference_number} />

        <AccommodationSection
          accommodation={request}
          quotes={quotes}
          extrasByQuoteId={extrasByQuoteId}
          onSelectQuote={onSelectQuote}
          selectedDates={selectedDates}
          numberOfPeople={request.number_of_guests}
        />

        {token && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                Documenten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectDocumentsPanel
                accommodationRequestId={request.id}
                customerToken={token}
                viewer="customer"
                canUpload={true}
                title=""
                emptyHint="Nog geen documenten. U kunt hier bijvoorbeeld een gastenlijst of kamerindeling uploaden."
              />
            </CardContent>
          </Card>
        )}

        {(request.wants_activities || !hasSelectedQuote) && (
          <Notice tone="info" title={request.wants_activities ? "Wilt u ook activiteiten toevoegen?" : "Alvast activiteiten bekijken?"}>
            <p>Maak uw verblijf compleet met activiteiten, excursies en catering. Bureau Vlieland zet het programma voor u klaar.</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/programma-samenstellen">
                Programma samenstellen
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </Notice>
        )}
      </div>
    </Schil>
  );
};

export default function AccommodationQuotes() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(true);
  const { request, quotes, extrasByQuoteId, isLoading, error, refetch, selectQuote } = useAccommodationQuotes(token);

  // Hoort de aanvraag bij een programma, dan is het klantportaal de plek.
  useEffect(() => {
    const check = async () => {
      if (!token) {
        setIsRedirecting(false);
        return;
      }
      const { data: payload, error: invokeError } = await supabase.functions.invoke("get-accommodation-portal", { body: { token } });
      if (invokeError || !payload || payload.error) {
        reportError(invokeError || payload?.error, { where: "AccommodationQuotes: Error checking accommodation redirect" });
        setIsRedirecting(false);
        return;
      }
      const linkedProgramToken = payload.request?.linked_program?.customer_token;
      if (linkedProgramToken) {
        navigate(`/mijn-programma/${linkedProgramToken}`, { replace: true });
        return;
      }
      setIsRedirecting(false);
    };
    void check();
  }, [token, navigate]);

  const handleSelectQuote = async (quoteId: string, signatureName: string, acceptedTerms: boolean) => {
    const success = await selectQuote(quoteId, signatureName, acceptedTerms);
    if (success) {
      toast({ title: "Logies gekozen", description: "De accommodatie neemt contact met u op over de reservering." });
    } else {
      toast({ title: "Kiezen mislukt", description: "Er ging iets mis. Probeer het opnieuw of neem contact op met Bureau Vlieland.", variant: "destructive" });
    }
    return success;
  };

  if (isLoading || isRedirecting) {
    return (
      <Schil>
        <LoadingState label="Aanvraag laden" />
      </Schil>
    );
  }

  if (error || !request) {
    return (
      <Schil>
        <EmptyState
          icon={<BedDouble aria-hidden="true" />}
          title="Aanvraag niet gevonden"
          description={error || "Deze link is niet geldig of de aanvraag is verlopen."}
          action={
            <Button asChild>
              <Link to="/">Naar de homepage</Link>
            </Button>
          }
          className="mx-auto max-w-md"
        />
      </Schil>
    );
  }

  return (
    <AccommodationQuotesView
      request={request}
      quotes={quotes}
      extrasByQuoteId={extrasByQuoteId}
      onSelectQuote={handleSelectQuote}
      onRefresh={() => void refetch()}
      token={token}
    />
  );
}
