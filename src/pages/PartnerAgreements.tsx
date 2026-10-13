import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronDown, ChevronUp, Loader2, ScrollText } from "lucide-react";
import { PartnerLayout } from "@/components/partner-portal/PartnerLayout";
import { PartnerPage } from "@/components/partner-portal/PartnerPage";
import { MarkdownText } from "@/components/shared/MarkdownText";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EmptyState, Notice, Pill, type PillTone } from "@/components/system";
import { useAcceptPartnerAgreement, useCurrentPartner, usePartnerPortalAgreements } from "@/hooks/usePartnerAgreements";
import { AGREEMENT_STATE_LABEL, agreementsForPartner, type AgreementState } from "@/lib/partnerAgreements";
import { cn } from "@/lib/utils";

/**
 * Afspraken (docs/plan-bruiloftsdoorverwijzingen.md, partnerafspraken; op
 * het ontwerpsysteem in partnerportaal fase 4): de afspraken met Bureau
 * Vlieland die voor deze partner gelden, met de status als `Pill`, het
 * akkoord als `Notice` en akkoord geven met één knop. Het akkoord wordt
 * vastgelegd met wie, wanneer, welke versie en de tekst op dat moment.
 */
const kort = (iso: string) => format(parseISO(iso), "d MMMM yyyy", { locale: nl });
const stateTone = (s: AgreementState): PillTone => (s === "accepted" ? "success" : "warning");

function PartnerAgreementsContent() {
  const { partner, isImpersonating, isLoading: partnerLaadt } = useCurrentPartner();
  const { agreements, acceptances, isLoading } = usePartnerPortalAgreements(partner?.id ?? null);
  const accepteer = useAcceptPartnerAgreement();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [gelezen, setGelezen] = useState<Record<string, boolean>>({});

  const stand = useMemo(() => (partner ? agreementsForPartner(agreements, acceptances, partner) : []), [agreements, acceptances, partner]);
  const eerdere = useMemo(() => acceptances.filter((c) => !stand.some((s) => s.acceptance?.id === c.id)), [acceptances, stand]);
  const openCount = stand.filter((s) => s.state !== "accepted").length;

  return (
    <PartnerPage
      title="Afspraken"
      icon={<ScrollText />}
      size="content"
      description={`De afspraken tussen Bureau Vlieland en ${partner?.name ?? "uw bedrijf"}. Lees de tekst en geef akkoord; wij leggen vast wie akkoord gaf, wanneer en op welke versie.`}
      status={openCount > 0 ? { label: openCount === 1 ? "1 afspraak wacht op uw akkoord" : `${openCount} afspraken wachten op uw akkoord`, tone: "warning" } : null}
      loading={partnerLaadt || isLoading}
    >
      {stand.length === 0 && <EmptyState icon={<ScrollText />} title="Geen afspraken" description="Er zijn op dit moment geen afspraken die voor u gelden." />}

      {stand.map((s) => {
        const isOpen = open[s.agreement.id] ?? s.state !== "accepted";
        return (
          <article key={s.agreement.id} className={cn("rounded-lg border bg-card p-4", s.state !== "accepted" && "border-warning/40")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-medium">
                  {s.agreement.title} <span className="text-sm font-normal text-muted-foreground">versie {s.agreement.version}</span>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Geldt vanaf {kort(s.agreement.effective_from)}.{s.agreement.summary ? ` ${s.agreement.summary}` : ""}
                  {s.state === "outdated" && s.previous ? ` U ging op ${kort(s.previous.accepted_at.slice(0, 10))} akkoord met versie ${s.previous.version}; er is een nieuwe versie.` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Pill tone={stateTone(s.state)}>{AGREEMENT_STATE_LABEL[s.state]}</Pill>
                <Button variant="ghost" size="sm" onClick={() => setOpen((o) => ({ ...o, [s.agreement.id]: !isOpen }))} aria-expanded={isOpen}>
                  {isOpen ? "Inklappen" : "Lezen"}
                  {isOpen ? <ChevronUp className="ml-1 h-4 w-4" aria-hidden="true" /> : <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />}
                </Button>
              </div>
            </div>
            {isOpen && (
              <div className="mt-4 space-y-4">
                <div className="rounded-md border bg-muted/20 p-4">
                  <MarkdownText>{s.agreement.body_markdown}</MarkdownText>
                </div>
                {s.state === "accepted" && s.acceptance ? (
                  <Notice tone="success" title="Akkoord gegeven">
                    <p>
                      Op {format(parseISO(s.acceptance.accepted_at), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
                      {s.acceptance.accepted_by_email ? ` door ${s.acceptance.accepted_by_email}` : ""}.
                    </p>
                  </Notice>
                ) : isImpersonating ? (
                  <Notice tone="info">
                    <p>U kijkt mee als beheerder; alleen de partner zelf kan akkoord geven.</p>
                  </Notice>
                ) : (
                  <div className="space-y-3 rounded-md border p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox id={`gelezen-${s.agreement.id}`} checked={gelezen[s.agreement.id] ?? false} onCheckedChange={(v) => setGelezen((g) => ({ ...g, [s.agreement.id]: v === true }))} />
                      <Label htmlFor={`gelezen-${s.agreement.id}`} className="text-sm font-normal leading-snug">
                        Ik heb deze afspraak gelezen en ga namens {partner?.name} akkoord met versie {s.agreement.version}.
                      </Label>
                    </div>
                    <Button onClick={() => partner && accepteer.mutate({ agreementId: s.agreement.id, partnerId: partner.id })} disabled={!gelezen[s.agreement.id] || accepteer.isPending || !partner}>
                      {accepteer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                      Akkoord
                    </Button>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}

      {eerdere.length > 0 && (
        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-medium">Eerdere akkoorden</h2>
          <p className="mt-1 text-sm text-muted-foreground">Versies waar u eerder akkoord op gaf. De tekst van dat moment blijft bewaard.</p>
          <ul className="mt-3 divide-y text-sm">
            {eerdere.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span>
                  {c.title_snapshot} <span className="text-muted-foreground">versie {c.version}</span>
                </span>
                <span className="text-muted-foreground">{format(parseISO(c.accepted_at), "d MMM yyyy HH:mm", { locale: nl })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PartnerPage>
  );
}

const PartnerAgreements = () => (
  <PartnerLayout>
    <PartnerAgreementsContent />
  </PartnerLayout>
);

export default PartnerAgreements;
