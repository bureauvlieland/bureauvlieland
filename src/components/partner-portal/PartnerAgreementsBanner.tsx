import { Link, useSearchParams } from "react-router-dom";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentPartner, usePartnerPortalAgreements } from "@/hooks/usePartnerAgreements";
import { openAgreementsForPartner } from "@/lib/partnerAgreements";

/**
 * Melding op de werkbank van de partner zolang er een afspraak wacht op akkoord
 * (docs/plan-bruiloftsdoorverwijzingen.md → Partnerafspraken). Niet blokkerend.
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
    <div role="status" className="flex flex-col gap-3 rounded-lg border-2 border-accent/40 bg-accent/5 p-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-start gap-3">
        <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold">
            {open.length === 1 ? "Een afspraak wacht op uw akkoord" : `${open.length} afspraken wachten op uw akkoord`}
          </p>
          <p className="text-sm text-foreground/80">
            {open.map((s) => `${s.agreement.title} (versie ${s.agreement.version})`).join(", ")}. Lees de tekst en geef akkoord; het kost een minuut.
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link to={`/partner/afspraken${suffix}`}>Naar de afspraken</Link>
      </Button>
    </div>
  );
}
