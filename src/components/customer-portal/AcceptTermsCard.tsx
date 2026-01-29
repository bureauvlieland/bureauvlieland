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
  uses_default_terms: boolean;
}

interface AcceptTermsCardProps {
  onAccept: (signatureName: string) => Promise<boolean>;
  isBillingComplete: boolean;
  onOpenBilling: () => void;
  items: ProgramRequestItem[];
}

const DEFAULT_TERMS_URL = "/partner-voorwaarden";
const BUREAU_TERMS_URL = "/algemene-voorwaarden";

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
        .select("id, name, terms_pdf_path, uses_default_terms")
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

  // Helper to get the appropriate terms link/label for a partner
  const getPartnerTermsInfo = (partner: PartnerTermsInfo) => {
    if (partner.terms_pdf_path && !partner.uses_default_terms) {
      return {
        label: "Bekijken",
        url: getPublicUrl(partner.terms_pdf_path),
        type: "custom" as const,
      };
    }
    // Partner uses default terms or has no terms uploaded
    return {
      label: "Standaardvoorwaarden",
      url: DEFAULT_TERMS_URL,
      type: "default" as const,
    };
  };

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

            {/* Terms Section - rewritten per briefing with bundled default terms */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">
                Voor dit programma gelden de volgende voorwaarden:
              </p>
              <ul className="space-y-2">
                {/* Bureau Vlieland terms - always shown first */}
                <li className="flex items-center gap-2 text-sm">
                  <span>•</span>
                  <span className="font-medium">Bemiddelingsvoorwaarden Bureau Vlieland</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    onClick={() => window.open(BUREAU_TERMS_URL, "_blank")}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Bekijken
                  </Button>
                </li>

                {/* Bundled default terms */}
                {!isLoadingPartners && (() => {
                  const defaultPartners = partnerTerms.filter(p => !p.terms_pdf_path || p.uses_default_terms);
                  const customPartners = partnerTerms.filter(p => p.terms_pdf_path && !p.uses_default_terms);
                  
                  return (
                    <>
                      {/* Bundled standard terms - one entry for all default partners */}
                      {defaultPartners.length > 0 && (
                        <li className="text-sm">
                          <div className="flex items-center gap-2">
                            <span>•</span>
                            <span className="font-medium">Standaardvoorwaarden Partneraanbod Bureau Vlieland</span>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-primary"
                              asChild
                            >
                              <a href={DEFAULT_TERMS_URL} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-3 w-3 mr-1" />
                                Bekijken
                              </a>
                            </Button>
                          </div>
                          <p className="ml-4 text-xs text-muted-foreground mt-1">
                            Van toepassing op: {defaultPartners.map(p => p.name).join(", ")}
                          </p>
                        </li>
                      )}

                      {/* Custom partner terms - each shown separately */}
                      {customPartners.map((partner) => (
                        <li key={partner.id} className="flex items-center gap-2 text-sm">
                          <span>•</span>
                          <span className="font-medium">Voorwaarden {partner.name}</span>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-primary"
                            onClick={() => window.open(getPublicUrl(partner.terms_pdf_path!), "_blank")}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Bekijken
                          </Button>
                        </li>
                      ))}
                    </>
                  );
                })()}
              </ul>
            </div>

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
                  Ik ga akkoord met:
                  <br />
                  – de bemiddelingsvoorwaarden van Bureau Vlieland
                  {partnerTerms.length > 0 && (
                    <>
                      <br />
                      – de voorwaarden van de hierboven genoemde aanbieders
                    </>
                  )}
                </Label>
              </div>
            </div>

            {/* Digital Signature Section - simplified per briefing */}
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
