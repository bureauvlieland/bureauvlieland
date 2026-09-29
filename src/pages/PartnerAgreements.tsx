import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { CheckCircle, ChevronDown, ChevronUp, Loader2, ScrollText } from "lucide-react";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { MarkdownText } from "@/components/shared/MarkdownText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAcceptPartnerAgreement, useCurrentPartner, usePartnerPortalAgreements } from "@/hooks/usePartnerAgreements";
import { AGREEMENT_STATE_LABEL, agreementsForPartner, type AgreementState } from "@/lib/partnerAgreements";

/**
 * Partnerportaal → Afspraken (docs/plan-bruiloftsdoorverwijzingen.md →
 * Partnerafspraken): de afspraken met Bureau Vlieland die voor deze partner
 * gelden, met de mogelijkheid om akkoord te geven. Het akkoord wordt vastgelegd
 * met wie, wanneer, welke versie en de tekst op dat moment.
 */
const kort = (iso: string) => format(parseISO(iso), "d MMMM yyyy", { locale: nl });
const stateVariant = (s: AgreementState): "default" | "secondary" | "destructive" => (s === "accepted" ? "default" : s === "outdated" ? "secondary" : "destructive");

function PartnerAgreementsContent() {
  const { partner, isImpersonating, isLoading: partnerLaadt } = useCurrentPartner();
  const { agreements, acceptances, isLoading } = usePartnerPortalAgreements(partner?.id ?? null);
  const accepteer = useAcceptPartnerAgreement();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [gelezen, setGelezen] = useState<Record<string, boolean>>({});

  const stand = useMemo(() => (partner ? agreementsForPartner(agreements, acceptances, partner) : []), [agreements, acceptances, partner]);
  const eerdere = useMemo(() => acceptances.filter((c) => !stand.some((s) => s.acceptance?.id === c.id)), [acceptances, stand]);

  if (partnerLaadt || isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Laden…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Afspraken</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          De afspraken tussen Bureau Vlieland en {partner?.name ?? "uw bedrijf"}. Lees de tekst en geef akkoord; wij leggen vast wie akkoord gaf, wanneer, en op
          welke versie.
        </p>
      </div>

      {stand.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Er zijn op dit moment geen afspraken die voor u gelden.</p>}

      {stand.map((s) => {
        const isOpen = open[s.agreement.id] ?? s.state !== "accepted";
        return (
          <Card key={s.agreement.id} className={s.state !== "accepted" ? "border-accent/60" : undefined}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div className="min-w-0 space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ScrollText className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {s.agreement.title}
                  <span className="text-sm font-normal text-muted-foreground">versie {s.agreement.version}</span>
                </CardTitle>
                <CardDescription>
                  Geldt vanaf {kort(s.agreement.effective_from)}.{s.agreement.summary ? ` ${s.agreement.summary}` : ""}
                  {s.state === "outdated" && s.previous ? ` U ging op ${kort(s.previous.accepted_at.slice(0, 10))} akkoord met versie ${s.previous.version}; er is een nieuwe versie.` : ""}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={stateVariant(s.state)}>{AGREEMENT_STATE_LABEL[s.state]}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setOpen((o) => ({ ...o, [s.agreement.id]: !isOpen }))} aria-expanded={isOpen}>
                  {isOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                  <span className="ml-1">{isOpen ? "Inklappen" : "Lezen"}</span>
                </Button>
              </div>
            </CardHeader>
            {isOpen && (
              <CardContent className="space-y-4">
                <div className="rounded-md border bg-muted/20 p-4">
                  <MarkdownText>{s.agreement.body_markdown}</MarkdownText>
                </div>
                {s.state === "accepted" && s.acceptance ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                    Akkoord gegeven op {format(parseISO(s.acceptance.accepted_at), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
                    {s.acceptance.accepted_by_email ? ` door ${s.acceptance.accepted_by_email}` : ""}.
                  </p>
                ) : isImpersonating ? (
                  <p className="text-sm text-muted-foreground">U kijkt mee als beheerder; alleen de partner zelf kan akkoord geven.</p>
                ) : (
                  <div className="space-y-3 rounded-md border p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox id={`gelezen-${s.agreement.id}`} checked={gelezen[s.agreement.id] ?? false} onCheckedChange={(v) => setGelezen((g) => ({ ...g, [s.agreement.id]: v === true }))} />
                      <Label htmlFor={`gelezen-${s.agreement.id}`} className="text-sm font-normal leading-snug">
                        Ik heb deze afspraak gelezen en ga namens {partner?.name} akkoord met versie {s.agreement.version}.
                      </Label>
                    </div>
                    <Button
                      onClick={() => partner && accepteer.mutate({ agreementId: s.agreement.id, partnerId: partner.id })}
                      disabled={!gelezen[s.agreement.id] || accepteer.isPending || !partner}
                    >
                      {accepteer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                      Akkoord
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {eerdere.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eerdere akkoorden</CardTitle>
            <CardDescription>Versies waar u eerder akkoord op gaf. De tekst van dat moment blijft bewaard.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {eerdere.map((c) => (
                <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2 last:border-0">
                  <span>
                    {c.title_snapshot} <span className="text-muted-foreground">versie {c.version}</span>
                  </span>
                  <span className="text-muted-foreground">{format(parseISO(c.accepted_at), "d MMM yyyy HH:mm", { locale: nl })}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const PartnerAgreements = () => (
  <PartnerLayout>
    <Helmet>
      <title>Afspraken – Partnerportaal</title>
    </Helmet>
    <PartnerAgreementsContent />
  </PartnerLayout>
);

export default PartnerAgreements;
