import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, Download, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export interface AcceptedTermsEntry {
  id: string;
  partner_id: string;
  partner_name: string;
  terms_type: "partner_custom" | "partner_default" | "bureau_vlieland" | "uvh_2024";
  terms_version: string;
  terms_pdf_path: string | null;
  accepted_at: string;
}

interface AcceptedTermsCardProps {
  termsAcceptedAt: string;
  signatureName: string | null;
  signatureId: string | null;
  acceptedTerms: AcceptedTermsEntry[];
}

const DEFAULT_TERMS_URL = "/partner-voorwaarden";
const BUREAU_TERMS_URL = "/algemene-voorwaarden";
const UVH_TERMS_URL = "https://assets.khn.nl/uploads/downloads/UVH_Nederlands_vanaf_2024_2024-10-18-082210_zkdv.pdf";

export const AcceptedTermsCard = ({
  termsAcceptedAt,
  signatureName,
  signatureId,
  acceptedTerms,
}: AcceptedTermsCardProps) => {
  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("partner-terms").getPublicUrl(path);
    return data.publicUrl;
  };

  // Group terms by type for bundled display
  const groupedTerms = useMemo(() => {
    const bureauEntry = acceptedTerms.find(e => e.terms_type === "bureau_vlieland");
    const uvhEntry = acceptedTerms.find(e => e.terms_type === "uvh_2024");
    const defaultEntries = acceptedTerms.filter(e => e.terms_type === "partner_default");
    const customEntries = acceptedTerms.filter(e => e.terms_type === "partner_custom");
    
    return { bureauEntry, uvhEntry, defaultEntries, customEntries };
  }, [acceptedTerms]);

  return (
    <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-lg">Boeking definitief bevestigd</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Acceptance details */}
        <div className="bg-background rounded-lg p-4 border space-y-2">
          <h4 className="font-medium text-sm">Geaccepteerde voorwaarden</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Geaccepteerd op:</span>
            </div>
            <div className="font-medium">
              {format(parseISO(termsAcceptedAt), "EEE d MMMM yyyy 'om' HH:mm", { locale: nl })}
            </div>
            {signatureName && (
              <>
                <div>
                  <span className="text-muted-foreground">Door:</span>
                </div>
                <div className="font-medium">{signatureName}</div>
              </>
            )}
            {signatureId && (
              <>
                <div>
                  <span className="text-muted-foreground">Ondertekening ID:</span>
                </div>
                <div className="font-mono text-xs font-medium">{signatureId}</div>
              </>
            )}
          </div>
        </div>

        {/* Terms list - bundled display */}
        <div className="space-y-2">
          <p className="text-sm font-medium">De volgende voorwaarden zijn van toepassing:</p>
          <ul className="space-y-2">
            {/* Bureau Vlieland terms - always first */}
            {groupedTerms.bureauEntry && (
              <li className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Bemiddelingsvoorwaarden Bureau Vlieland</p>
                  <p className="text-xs text-muted-foreground">Versie {groupedTerms.bureauEntry.terms_version}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-8 text-xs"
                  onClick={() => window.open(BUREAU_TERMS_URL, "_blank")}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Bekijken
                </Button>
              </li>
            )}

            {/* Bundled default terms - consolidated into one entry */}
            {groupedTerms.defaultEntries.length > 0 && (
              <li className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Standaardvoorwaarden Partneraanbod Bureau Vlieland</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Van toepassing op:
                  </p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {groupedTerms.defaultEntries.map((entry) => (
                      <li key={entry.id}>• {entry.partner_name}</li>
                    ))}
                  </ul>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-8 text-xs"
                  asChild
                >
                  <a href={DEFAULT_TERMS_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Bekijken
                  </a>
                </Button>
              </li>
            )}

            {/* Custom partner terms - each shown separately */}
            {groupedTerms.customEntries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Voorwaarden {entry.partner_name}</p>
                  <p className="text-xs text-muted-foreground">Versie {entry.terms_version}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-8 text-xs"
                  onClick={() => window.open(entry.terms_pdf_path ? getPublicUrl(entry.terms_pdf_path) : DEFAULT_TERMS_URL, "_blank")}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download PDF
                </Button>
              </li>
            ))}

            {/* UVH 2024 terms - if applicable */}
            {groupedTerms.uvhEntry && (
              <li className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Uniforme Voorwaarden Horeca 2024</p>
                  <p className="text-xs text-muted-foreground">Koninklijke Horeca Nederland</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-8 text-xs"
                  onClick={() => window.open(UVH_TERMS_URL, "_blank")}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download PDF
                </Button>
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
