import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";
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

const TermsLink = ({ href, label = "Bekijken" }: { href: string; label?: string }) => (
  <Button variant="link" size="sm" className="h-auto shrink-0 p-0" asChild>
    <a href={href} target="_blank" rel="noopener noreferrer">
      <ExternalLink className="mr-1 h-3 w-3" aria-hidden="true" />
      {label}
    </a>
  </Button>
);

/**
 * De ondertekening en de voorwaarden die erbij horen (klantportaal fase 3a):
 * een gewone kaart, want de bevestiging zelf staat erboven als `SuccessScreen`.
 */
export const AcceptedTermsCard = ({ termsAcceptedAt, signatureName, signatureId, acceptedTerms }: AcceptedTermsCardProps) => {
  const getPublicUrl = (path: string) => supabase.storage.from("partner-terms").getPublicUrl(path).data.publicUrl;

  const grouped = useMemo(
    () => ({
      bureauEntry: acceptedTerms.find((e) => e.terms_type === "bureau_vlieland"),
      uvhEntry: acceptedTerms.find((e) => e.terms_type === "uvh_2024"),
      defaultEntries: acceptedTerms.filter((e) => e.terms_type === "partner_default"),
      customEntries: acceptedTerms.filter((e) => e.terms_type === "partner_custom"),
    }),
    [acceptedTerms],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Uw ondertekening</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Ondertekend op</dt>
          <dd className="font-medium text-foreground">
            {format(parseISO(termsAcceptedAt), "EEEE d MMMM yyyy 'om' HH:mm", { locale: nl })}
          </dd>
          {signatureName && (
            <>
              <dt className="text-muted-foreground">Door</dt>
              <dd className="font-medium text-foreground">{signatureName}</dd>
            </>
          )}
          {signatureId && (
            <>
              <dt className="text-muted-foreground">Kenmerk</dt>
              <dd className="font-mono text-xs text-foreground">{signatureId}</dd>
            </>
          )}
        </dl>

        <div>
          <p className="mb-2 font-medium text-foreground">De voorwaarden die gelden</p>
          <ul className="divide-y divide-border rounded-md border border-border">
            {grouped.bureauEntry && (
              <li className="flex items-start gap-3 p-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">Bemiddelingsvoorwaarden Bureau Vlieland</p>
                  <p className="text-xs text-muted-foreground">Versie {grouped.bureauEntry.terms_version}</p>
                </div>
                <TermsLink href={BUREAU_TERMS_URL} />
              </li>
            )}
            {grouped.defaultEntries.length > 0 && (
              <li className="flex items-start gap-3 p-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">Standaardvoorwaarden partneraanbod Bureau Vlieland</p>
                  <p className="text-xs text-muted-foreground">
                    Voor {grouped.defaultEntries.map((entry) => entry.partner_name).join(", ")}
                  </p>
                </div>
                <TermsLink href={DEFAULT_TERMS_URL} />
              </li>
            )}
            {grouped.customEntries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 p-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">Voorwaarden {entry.partner_name}</p>
                  <p className="text-xs text-muted-foreground">Versie {entry.terms_version}</p>
                </div>
                <TermsLink href={entry.terms_pdf_path ? getPublicUrl(entry.terms_pdf_path) : DEFAULT_TERMS_URL} label="Pdf" />
              </li>
            ))}
            {grouped.uvhEntry && (
              <li className="flex items-start gap-3 p-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">Uniforme Voorwaarden Horeca 2024</p>
                  <p className="text-xs text-muted-foreground">Koninklijke Horeca Nederland</p>
                </div>
                <TermsLink href={UVH_TERMS_URL} label="Pdf" />
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
