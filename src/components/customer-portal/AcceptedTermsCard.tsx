import { useMemo, type ReactNode } from "react";
import { FileText } from "lucide-react";
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

const TermLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    {children}
  </a>
);

/** Het ondertekende akkoord: wanneer, door wie, en welke voorwaarden gelden. */
export const AcceptedTermsCard = ({ termsAcceptedAt, signatureName, signatureId, acceptedTerms }: AcceptedTermsCardProps) => {
  const getPublicUrl = (path: string) => supabase.storage.from("partner-terms").getPublicUrl(path).data.publicUrl;

  const grouped = useMemo(
    () => ({
      bureau: acceptedTerms.find((e) => e.terms_type === "bureau_vlieland"),
      uvh: acceptedTerms.find((e) => e.terms_type === "uvh_2024"),
      defaults: acceptedTerms.filter((e) => e.terms_type === "partner_default"),
      customs: acceptedTerms.filter((e) => e.terms_type === "partner_custom"),
    }),
    [acceptedTerms],
  );

  return (
    <section className="rounded-lg border bg-card p-4 sm:p-6" aria-labelledby="akkoord-kop">
      <h2 id="akkoord-kop" className="font-display text-2xl font-medium leading-tight">
        Uw akkoord
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ondertekend op {format(parseISO(termsAcceptedAt), "EEEE d MMMM yyyy 'om' HH:mm", { locale: nl })}
        {signatureName ? ` door ${signatureName}` : ""}.
      </p>
      {signatureId && (
        <p className="mt-1 text-xs text-muted-foreground">
          Ondertekening <span className="font-mono">{signatureId}</span>
        </p>
      )}

      <h3 className="mt-5 text-eyebrow font-medium uppercase text-muted-foreground">Geaccepteerde voorwaarden</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {grouped.bureau && (
          <li>
            <TermLink href={BUREAU_TERMS_URL}>Bemiddelingsvoorwaarden Bureau Vlieland</TermLink>
            <p className="text-xs text-muted-foreground">Versie {grouped.bureau.terms_version}</p>
          </li>
        )}
        {grouped.defaults.length > 0 && (
          <li>
            <TermLink href={DEFAULT_TERMS_URL}>Standaardvoorwaarden Partneraanbod Bureau Vlieland</TermLink>
            <p className="text-xs text-muted-foreground">Van toepassing op {grouped.defaults.map((e) => e.partner_name).join(", ")}</p>
          </li>
        )}
        {grouped.customs.map((entry) => (
          <li key={entry.id}>
            <TermLink href={entry.terms_pdf_path ? getPublicUrl(entry.terms_pdf_path) : DEFAULT_TERMS_URL}>Voorwaarden {entry.partner_name}</TermLink>
            <p className="text-xs text-muted-foreground">Versie {entry.terms_version}</p>
          </li>
        ))}
        {grouped.uvh && (
          <li>
            <TermLink href={UVH_TERMS_URL}>Uniforme Voorwaarden Horeca 2024 (pdf)</TermLink>
            <p className="text-xs text-muted-foreground">Koninklijke Horeca Nederland</p>
          </li>
        )}
      </ul>
    </section>
  );
};
