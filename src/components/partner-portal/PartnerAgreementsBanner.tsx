import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/system";
import { useCurrentPartner, usePartnerPortalAgreements } from "@/hooks/usePartnerAgreements";
import { openAgreementsForPartner } from "@/lib/partnerAgreements";

/**
 * Melding op de werkbank zolang een afspraak wacht op akkoord
 * (docs/plan-bruiloftsdoorverwijzingen.md, Partnerafspraken). Niet blokkerend.
 */
export function PartnerAgreementsBanner() {
  const [searchParams] = useSearchParams();
  const impersonate = searchParams.get("impersonate");
  const { partner } = useCurrentPartner();
  const { agreements, acceptances } = usePartnerPortalAgreements(partner?.id ?? null);
  if (!partner) return null;
  const open = openAgreementsForPartner(agreements, acceptances, partner);
  if (open.length === 0) return null;
  const suffix = impersonate ? `?impersonate=${impersonate}` : "";
  return (
    <Notice tone="warning" title={open.length === 1 ? "Een afspraak wacht op uw akkoord" : `${open.length} afspraken wachten op uw akkoord`}>
      <p>{open.map((s) => `${s.agreement.title} (versie ${s.agreement.version})`).join(", ")}. Lees de tekst en geef akkoord; het kost een minuut.</p>
      <Button asChild size="sm" variant="outline" className="mt-2">
        <Link to={`/partner/afspraken${suffix}`}>Naar de afspraken</Link>
      </Button>
    </Notice>
  );
}
