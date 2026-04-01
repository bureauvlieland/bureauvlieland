
import { AlertTriangle, Check } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AccommodationQuote } from '@/types/accommodation';

interface SelectQuoteDialogProps {
  quote: AccommodationQuote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isSelecting?: boolean;
}

export function SelectQuoteDialog({
  quote,
  open,
  onOpenChange,
  onConfirm,
  isSelecting,
}: SelectQuoteDialogProps) {
  if (!quote) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Offerte bevestigen
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              U staat op het punt om de volgende offerte te kiezen:
            </p>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="font-semibold text-foreground">{quote.accommodation_name}</p>
              <p className="text-lg font-bold text-primary">
                {formatPrice(quote.price_total)}
              </p>
              <p className="text-sm">
                {quote.price_includes_vat ? 'Inclusief' : 'Exclusief'} BTW
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Let op:</strong> Deze keuze is definitief. Bureau Vlieland neemt contact 
                met u op over de verdere afhandeling. Eventuele andere offertes 
                worden automatisch afgewezen.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSelecting}>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isSelecting}
            className="bg-primary"
          >
            {isSelecting ? (
              'Bezig met verwerken...'
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Bevestigen
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
