import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgreementPartners, usePartnerAgreementAcceptances, usePartnerAgreements } from "@/hooks/usePartnerAgreements";
import { AGREEMENT_STATE_LABEL, agreementsForPartner, type AgreementState } from "@/lib/partnerAgreements";

/** Op de partnerpagina in de admin: welke afspraken gelden voor deze partner en of hij akkoord is. */
export function PartnerAgreementsCard({ partnerId }: { partnerId: string }) {
  const { data: agreements = [] } = usePartnerAgreements();
  const { data: acceptances = [] } = usePartnerAgreementAcceptances(partnerId);
  const { data: partners = [] } = useAgreementPartners();
  const partner = partners.find((p) => p.id === partnerId);
  const stand = partner ? agreementsForPartner(agreements, acceptances, partner) : [];
  const variant = (s: AgreementState): "default" | "secondary" | "destructive" => (s === "accepted" ? "default" : s === "outdated" ? "secondary" : "destructive");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-5 w-5" aria-hidden="true" />
          Afspraken
        </CardTitle>
        <CardDescription>
          Akkoord van de partner in het portaal. Beheer onder{" "}
          <Link to="/admin/partnerafspraken" className="underline underline-offset-2">
            Systeem → Partnerafspraken
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stand.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen gepubliceerde afspraak die voor deze partner geldt.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {stand.map((s) => (
              <li key={s.agreement.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {s.agreement.title} <span className="text-muted-foreground">versie {s.agreement.version}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={variant(s.state)}>{AGREEMENT_STATE_LABEL[s.state]}</Badge>
                  {s.acceptance && <span className="text-xs text-muted-foreground">{format(parseISO(s.acceptance.accepted_at), "d MMM yyyy", { locale: nl })}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
