import { Clock, CheckCircle2, Mail, AlertTriangle, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import type { AccommodationRequest, AccommodationQuote } from '@/types/accommodation';
import { useMemo } from 'react';

interface AccommodationStatusBannerProps {
  request: AccommodationRequest;
  quotesSummary: {
    total: number;
    received: number;
    selected: number;
  };
  quotes?: AccommodationQuote[];
}

export function AccommodationStatusBanner({ request, quotesSummary, quotes = [] }: AccommodationStatusBannerProps) {
  const { received, selected } = quotesSummary;
  const requested = request.quotes_requested_count;
  const declined = request.quotes_declined_count || 0;
  const waiting = Math.max(0, requested - received - declined - (selected > 0 ? 1 : 0));
  const allDeclined = requested > 0 && declined >= requested && received === 0 && selected === 0;

  // Deduplicated decline reasons (anonymized)
  const declineReasons = useMemo(() => {
    const declinedQuotes = quotes.filter((q) => q.status === 'declined' || q.status === 'rejected');
    const reasons = declinedQuotes
      .map((q) => q.partner_notes)
      .filter((note): note is string => !!note && note.trim().length > 0);
    return [...new Set(reasons)];
  }, [quotes]);

  // Detect re-request: quotes exist with submitted_at but are now pending again
  const isReRequest = useMemo(() => {
    return quotes.some(q => q.status === 'pending' && q.submitted_at);
  }, [quotes]);

  // Determine the status display
  if (selected > 0) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                U hebt een keuze gemaakt!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                De accommodatie neemt binnenkort contact met u op om de reservering definitief te maken.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (received > 0) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-2">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">
                {received === 1 ? '1 offerte ontvangen' : `${received} offertes ontvangen`}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {requested > 0 && (
                  <span className="block text-xs text-muted-foreground/80 mb-1">
                    {requested} logiespartner{requested !== 1 ? 's' : ''} benaderd
                    {received > 0 && ` · ${received} offerte${received !== 1 ? 's' : ''} ontvangen`}
                    {declined > 0 && ` · ${declined} afgewezen`}
                    {waiting > 0 ? ` · ${waiting} wachtend` : ''}
                  </span>
                )}
                Bekijk en vergelijk de offertes hieronder. Kies de optie die het beste bij u past.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // All declined - no quotes coming
  if (allDeclined) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 dark:border-destructive/50 dark:bg-destructive/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-destructive/10 p-2 dark:bg-destructive/20">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">
                Alle benaderde partners hebben afgewezen
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Helaas hebben alle {requested} benaderde partner{requested !== 1 ? 's' : ''} de aanvraag afgewezen.
                Bureau Vlieland zoekt naar alternatieven en neemt contact met u op.
              </p>
              {declineReasons.length > 0 && (
                <div className="flex items-start gap-2 mt-3 p-2 rounded bg-muted/50">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Opgegeven redenen:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {declineReasons.map((reason, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Waiting for quotes — re-request or new
  if (isReRequest) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                Het aantal gasten is gewijzigd
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Bureau Vlieland heeft de accommodatie gevraagd om een aangepaste offerte in te dienen.
                U ontvangt bericht zodra deze binnen is.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                Wij verzamelen offertes voor u
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {(() => {
                  const parts: string[] = [];
                  if (requested > 0) {
                    parts.push(`Bureau Vlieland heeft ${requested} logiespartner${requested !== 1 ? 's' : ''} benaderd.`);
                  }
                  if (declined > 0) {
                    parts.push(`${declined} partner${declined !== 1 ? 's' : ''} ${declined !== 1 ? 'hebben' : 'heeft'} helaas afgewezen.`);
                  }
                  const stillWaiting = Math.max(0, requested - declined);
                  if (stillWaiting > 0) {
                    parts.push(`Wij wachten nog op ${stillWaiting} partner${stillWaiting !== 1 ? 's' : ''}.`);
                  } else {
                    parts.push('U ontvangt een email zodra er offertes binnenkomen.');
                  }
                  return parts.join(' ');
                })()}
              </p>
            {request.status === 'processing' && (
              <div className="mt-4">
                <Progress value={30} className="h-2" />
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Aanvraag in behandeling...
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}