import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle, ExternalLink, Loader2, AlertCircle, FileText, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { ProgramRequestItem } from "@/types/programRequest";

interface PartnerTermsInfo {
  id: string;
  name: string;
  terms_pdf_path: string | null;
}

interface AcceptTermsCardProps {
  onAccept: (signatureName: string) => Promise<boolean>;
  isBillingComplete: boolean;
  onOpenBilling: () => void;
  items: ProgramRequestItem[];
}

export const AcceptTermsCard = ({
  onAccept,
  isBillingComplete,
  onOpenBilling,
  items,
}: AcceptTermsCardProps) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [partnerTerms, setPartnerTerms] = useState<PartnerTermsInfo[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);

  // Get unique partner IDs from items (excluding self_arranged and bureau types)
  useEffect(() => {
    const fetchPartnerTerms = async () => {
      const uniquePartnerIds = [...new Set(
        items
          .filter(item => item.block_type === "partner" && item.status !== "cancelled")
          .map(item => item.provider_id)
      )];

      if (uniquePartnerIds.length === 0) {
        setIsLoadingPartners(false);
        return;
      }

      const { data, error } = await supabase
        .from("partners")
        .select("id, name, terms_pdf_path")
        .in("id", uniquePartnerIds);

      if (!error && data) {
        setPartnerTerms(data);
      }
      setIsLoadingPartners(false);
    };

    fetchPartnerTerms();
  }, [items]);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("partner-terms").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAccept = async () => {
    if (!isChecked || !isBillingComplete || !signatureName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAccept(signatureName.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = isChecked && isBillingComplete && signatureName.trim().length >= 2;

  return (
    <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Alle activiteiten zijn bevestigd!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                De aanbieders hebben alle activiteiten in je programma bevestigd. 
                Voordat de definitieve boeking ingaat, vragen we je akkoord op de voorwaarden.
              </p>
            </div>

            {!isBillingComplete && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Facturatiegegevens vereist</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    Vul eerst je facturatiegegevens in voordat je kunt bevestigen.
                  </p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-amber-800 dark:text-amber-200 underline"
                    onClick={onOpenBilling}
                  >
                    Facturatiegegevens invullen →
                  </Button>
                </div>
              </div>
            )}

            {/* Partner Terms Section */}
            {!isLoadingPartners && partnerTerms.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">
                  Let op: voor de activiteiten in je programma zijn ook de voorwaarden van de volgende aanbieders van toepassing:
                </p>
                <ul className="space-y-2">
                  {partnerTerms.map((partner) => (
                    <li key={partner.id} className="flex items-center gap-2 text-sm">
                      <span>•</span>
                      <span className="font-medium">{partner.name}</span>
                      {partner.terms_pdf_path ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-primary"
                          onClick={() => window.open(getPublicUrl(partner.terms_pdf_path!), "_blank")}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Bekijken
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          (geen voorwaarden beschikbaar)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms-checkbox"
                  checked={isChecked}
                  onCheckedChange={(checked) => setIsChecked(checked === true)}
                  disabled={!isBillingComplete}
                  className={cn(!isBillingComplete && "opacity-50")}
                />
                <Label
                  htmlFor="terms-checkbox"
                  className={cn(
                    "text-sm cursor-pointer leading-relaxed",
                    !isBillingComplete && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Ik ga akkoord met de{" "}
                  <a
                    href="https://bureauvlieland.nl/algemene-voorwaarden"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    algemene voorwaarden van Bureau Vlieland
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {partnerTerms.length > 0 && " en de voorwaarden van bovenstaande aanbieders"}
                </Label>
              </div>

            </div>

            {/* Digital Signature Section */}
            <div className={cn(
              "border rounded-lg p-4 space-y-3",
              !isChecked ? "opacity-50 bg-muted/30" : "bg-background"
            )}>
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Digitale ondertekening</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature-name" className="text-sm">
                  Volledige naam
                </Label>
                <Input
                  id="signature-name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Typ hier je volledige naam"
                  disabled={!isChecked || !isBillingComplete}
                  className={cn(!isChecked && "opacity-50")}
                />
              </div>

              <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                <li>• Je bent bevoegd namens de organisatie</li>
                <li>• Je hebt de voorwaarden gelezen en gaat akkoord</li>
                <li>• Reserveringen worden definitief bevestigd</li>
                <li>• Annuleringsvoorwaarden zijn van toepassing</li>
              </ul>
            </div>

            <Button
              onClick={handleAccept}
              disabled={!canSubmit || isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <PenLine className="h-4 w-4 mr-2" />
              Ondertekenen & Definitief boeken
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
