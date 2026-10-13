import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/system";
import { PartnerAuthShell } from "@/components/partner-portal/PartnerAuthShell";

/**
 * De oude toegang met een token in de link. Partners loggen sinds de
 * beveiligde login in met e-mailadres en wachtwoord; deze pagina legt dat
 * uit en wijst de weg, zonder automatische doorverwijzing.
 */
const PartnerPortal = () => (
  <PartnerAuthShell title="Toegang gewijzigd" heading="Toegang gewijzigd" intro="Het partnerportaal werkt met een beveiligde login." footer="Nog geen inloggegevens ontvangen? Neem contact op met Bureau Vlieland.">
    <div className="space-y-4">
      <Notice tone="info" title="Inloggen met e-mailadres en wachtwoord">
        <p>Voor uw veiligheid werkt de oude link met een code niet meer. Log in met het e-mailadres en het wachtwoord dat u van Bureau Vlieland heeft gekregen.</p>
      </Notice>
      <Button asChild className="w-full">
        <Link to="/partner/login">
          Naar inloggen
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  </PartnerAuthShell>
);

export default PartnerPortal;
