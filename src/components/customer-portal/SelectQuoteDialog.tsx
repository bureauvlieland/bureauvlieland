import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, PenLine } from "lucide-react";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, Notice, ResponsiveSheetContent } from "@/components/system";
import { supabase } from "@/integrations/supabase/client";
import type { AccommodationQuote } from "@/types/accommodation";

interface SelectQuoteDialogProps {
  quote: AccommodationQuote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (signatureName: string, acceptedTerms: boolean) => Promise<void>;
  isSelecting?: boolean;
}

const BUREAU_TERMS_URL = "/algemene-voorwaarden";
const DEFAULT_PARTNER_TERMS_URL = "/partner-voorwaarden";
const UVH_TERMS_URL = "https://assets.khn.nl/uploads/downloads/UVH_Nederlands_vanaf_2024_2024-10-18-082210_zkdv.pdf";

const formatPrice = (price: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(price);

const TermsLink = ({ href, label = "Bekijken" }: { href: string; label?: string }) => (
  <Button variant="link" size="sm" className="h-auto p-0" asChild>
    <a href={href} target="_blank" rel="noopener noreferrer">
      <FileText className="mr-1 h-3 w-3" aria-hidden="true" />
      {label}
      <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
    </a>
  </Button>
);

/**
 * Logies kiezen (logiesportaal op het ontwerpsysteem): dezelfde sheet als
 * de andere klantformulieren, met de voorwaarden die gaan gelden, één
 * akkoordvinkje en de naam als handtekening in een `FormField`. De sheet
 * sluit pas als het kiezen is gelukt; de pagina toont daarna de gekozen
 * offerte.
 */
export const SelectQuoteDialog = ({ quote, open, onOpenChange, onConfirm, isSelecting }: SelectQuoteDialogProps) => {
  const [accepted, setAccepted] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signatureTouched, setSignatureTouched] = useState(false);
  const [partner, setPartner] = useState<{ name: string | null; terms_pdf_path: string | null; uses_default_terms: boolean | null } | null>(null);

  useEffect(() => {
    if (!open) {
      setAccepted(false);
      setSignatureName("");
      setSignatureTouched(false);
      setPartner(null);
      return;
    }
    if (!quote?.partner_id) return;
    void (async () => {
      const { data } = await supabase.from("partners_public").select("name, terms_pdf_path, uses_default_terms").eq("id", quote.partner_id).maybeSingle();
      if (data) setPartner(data);
    })();
  }, [open, quote?.partner_id]);

  if (!quote) return null;

  const usesCustomTerms = !!partner?.terms_pdf_path && partner?.uses_default_terms === false;
  const partnerTermsUrl =
    usesCustomTerms && partner?.terms_pdf_path ? supabase.storage.from("partner-terms").getPublicUrl(partner.terms_pdf_path).data.publicUrl : DEFAULT_PARTNER_TERMS_URL;
  const partnerTermsLabel = usesCustomTerms ? `Voorwaarden ${partner?.name || quote.accommodation_name}` : "Standaardvoorwaarden partneraanbod Bureau Vlieland";

  const signatureValid = signatureName.trim().length >= 2;
  const canSubmit = accepted && signatureValid && !isSelecting;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignatureTouched(true);
    if (!canSubmit) return;
    void onConfirm(signatureName.trim(), accepted);
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isSelecting && onOpenChange(false)}>
      <ResponsiveSheetContent className="flex flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetHeader className="text-left">
            <SheetTitle>Logies kiezen</SheetTitle>
            <SheetDescription>U kiest {quote.accommodation_name} voor uw verblijf. Met uw handtekening wordt de keuze definitief.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-muted/50 p-4">
              <p className="font-medium text-foreground">{quote.accommodation_name}</p>
              <p className="text-right">
                <span className="font-display text-xl font-semibold text-foreground">{formatPrice(quote.price_total)}</span>
                <span className="block text-xs text-muted-foreground">{quote.price_includes_vat ? "incl. btw" : "excl. btw"}</span>
              </p>
            </div>

            <Notice tone="warning" title="Vanaf nu gelden de annuleringsvoorwaarden van het logies">
              Andere offertes voor dit verblijf wijzen wij automatisch af.
            </Notice>

            <div className="rounded-md bg-muted/50 p-4">
              <p className="mb-2 text-sm font-medium text-foreground">Op deze keuze gelden deze voorwaarden</p>
              <ul className="space-y-2 text-sm">
                <li className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium">Bemiddelingsvoorwaarden Bureau Vlieland</span>
                  <TermsLink href={BUREAU_TERMS_URL} />
                </li>
                <li className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium">{partnerTermsLabel}</span>
                  <TermsLink href={partnerTermsUrl} />
                </li>
                {!usesCustomTerms && (
                  <li className="flex flex-wrap items-center gap-x-2">
                    <span className="font-medium">Uniforme Voorwaarden Horeca 2024</span>
                    <TermsLink href={UVH_TERMS_URL} label="Pdf" />
                  </li>
                )}
              </ul>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="accept-quote-terms" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} disabled={isSelecting} className="mt-0.5" />
              <Label htmlFor="accept-quote-terms" className="cursor-pointer text-sm leading-relaxed">
                Ik ga akkoord met de voorwaarden hierboven en begrijp dat de annuleringsvoorwaarden van het logies vanaf nu gelden.
              </Label>
            </div>

            <FormField
              label="Uw volledige naam, als handtekening"
              htmlFor="signature-name"
              required
              leading={<PenLine aria-hidden="true" />}
              help="Hiermee wordt de reservering definitief."
              error={signatureTouched && !signatureValid ? "Typ uw volledige naam" : undefined}
            >
              <Input
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                onBlur={() => setSignatureTouched(true)}
                placeholder="Voor- en achternaam"
                autoComplete="name"
                disabled={!accepted || isSelecting}
              />
            </FormField>
          </div>

          <SheetFooter className="gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSelecting}>
              Annuleren
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSelecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <PenLine className="mr-2 h-4 w-4" aria-hidden="true" />}
              {isSelecting ? "Bezig met kiezen" : "Ondertekenen en kiezen"}
            </Button>
          </SheetFooter>
        </form>
      </ResponsiveSheetContent>
    </Sheet>
  );
};
