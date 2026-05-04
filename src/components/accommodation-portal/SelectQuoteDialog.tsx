import { useEffect, useState } from 'react';
import { AlertTriangle, Check, FileText, PenLine } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { AccommodationQuote } from '@/types/accommodation';

interface SelectQuoteDialogProps {
  quote: AccommodationQuote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (signatureName: string, acceptedTerms: boolean) => Promise<void>;
  isSelecting?: boolean;
}

const BUREAU_TERMS_URL = '/algemene-voorwaarden';
const DEFAULT_PARTNER_TERMS_URL = '/partner-voorwaarden';
const UVH_TERMS_URL = 'https://assets.khn.nl/uploads/downloads/UVH_Nederlands_vanaf_2024_2024-10-18-082210_zkdv.pdf';

export function SelectQuoteDialog({
  quote,
  open,
  onOpenChange,
  onConfirm,
  isSelecting,
}: SelectQuoteDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [partner, setPartner] = useState<{
    name: string | null;
    terms_pdf_path: string | null;
    uses_default_terms: boolean | null;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setAccepted(false);
      setSignatureName('');
      setPartner(null);
      return;
    }
    if (!quote?.partner_id) return;
    (async () => {
      const { data } = await supabase
        .from('partners')
        .select('name, terms_pdf_path, uses_default_terms')
        .eq('id', quote.partner_id)
        .maybeSingle();
      if (data) setPartner(data);
    })();
  }, [open, quote?.partner_id]);

  if (!quote) return null;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(price);

  const usesCustomTerms = !!partner?.terms_pdf_path && partner?.uses_default_terms === false;
  const partnerTermsUrl = usesCustomTerms && partner?.terms_pdf_path
    ? supabase.storage.from('partner-terms').getPublicUrl(partner.terms_pdf_path).data.publicUrl
    : DEFAULT_PARTNER_TERMS_URL;
  const partnerTermsLabel = usesCustomTerms
    ? `Voorwaarden ${partner?.name || quote.accommodation_name}`
    : 'Standaardvoorwaarden Partneraanbod Bureau Vlieland';

  const canSubmit = accepted && signatureName.trim().length >= 2 && !isSelecting;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Logies kiezen en voorwaarden bevestigen
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>U staat op het punt om de volgende offerte definitief te kiezen:</p>

              <div className="bg-muted p-4 rounded-lg space-y-1">
                <p className="font-semibold text-foreground">{quote.accommodation_name}</p>
                <p className="text-lg font-bold text-primary">{formatPrice(quote.price_total)}</p>
                <p className="text-sm">{quote.price_includes_vat ? 'Inclusief' : 'Exclusief'} BTW</p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Let op:</strong> vanaf het moment van bevestigen gelden de annuleringsvoorwaarden van de logies. Andere offertes voor dit verblijf worden automatisch afgewezen.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Op deze keuze zijn de volgende voorwaarden van toepassing:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    <span className="font-medium text-foreground">Bemiddelingsvoorwaarden Bureau Vlieland</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary"
                      asChild
                    >
                      <a href={BUREAU_TERMS_URL} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3 w-3 mr-1" />
                        Bekijken
                      </a>
                    </Button>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>•</span>
                    <span className="font-medium text-foreground">{partnerTermsLabel}</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary"
                      asChild
                    >
                      <a href={partnerTermsUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-3 w-3 mr-1" />
                        Bekijken
                      </a>
                    </Button>
                  </li>
                  {!usesCustomTerms && (
                    <li className="flex items-center gap-2">
                      <span>•</span>
                      <span className="font-medium text-foreground">Uniforme Voorwaarden Horeca 2024</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-primary"
                        asChild
                      >
                        <a href={UVH_TERMS_URL} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-3 w-3 mr-1" />
                          Download PDF
                        </a>
                      </Button>
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="accept-quote-terms"
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(v === true)}
                />
                <Label htmlFor="accept-quote-terms" className="text-sm cursor-pointer leading-relaxed text-foreground">
                  Ik ga akkoord met bovenstaande voorwaarden voor dit verblijf en begrijp dat de annuleringsvoorwaarden van de logies vanaf nu van toepassing zijn.
                </Label>
              </div>

              <div className="border rounded-lg p-3 space-y-2 bg-background">
                <div className="flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Digitale ondertekening</span>
                </div>
                <Label htmlFor="signature-name" className="text-sm">Volledige naam</Label>
                <Input
                  id="signature-name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Typ hier uw volledige naam"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSelecting}>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (!canSubmit) return;
              onConfirm(signatureName.trim(), accepted);
            }}
            disabled={!canSubmit}
            className="bg-primary"
          >
            {isSelecting ? (
              'Bezig met verwerken...'
            ) : (
              <>
                <PenLine className="h-4 w-4 mr-2" />
                Ondertekenen & bevestigen
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
