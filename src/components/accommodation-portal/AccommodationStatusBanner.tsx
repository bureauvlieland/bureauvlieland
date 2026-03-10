import { Clock, CheckCircle2, Mail } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import type { AccommodationRequest } from '@/types/accommodation';

interface AccommodationStatusBannerProps {
  request: AccommodationRequest;
  quotesSummary: {
    total: number;
    received: number;
    selected: number;
  };
}

export function AccommodationStatusBanner({ request, quotesSummary }: AccommodationStatusBannerProps) {
  const { received, selected } = quotesSummary;
  const requested = request.quotes_requested_count;
  const waiting = Math.max(0, requested - received - (selected > 0 ? 1 : 0));

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
                    {requested} partners benaderd · {received} offerte{received !== 1 ? 's' : ''} ontvangen{waiting > 0 ? ` · ${waiting} wachtend` : ''}
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

  // Waiting for quotes
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
                Wij hebben uw aanvraag doorgestuurd naar geschikte accommodaties. 
                U ontvangt een email zodra er offertes binnenkomen.
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
