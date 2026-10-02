import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Notice, SuccessScreen, type NoticeTone } from "@/components/system";
import { AcceptTermsCard } from "./AcceptTermsCard";
import { AcceptedTermsCard, type AcceptedTermsEntry } from "./AcceptedTermsCard";
import { PaymentStatusCard } from "./PaymentStatusCard";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";
import { getUnconfirmedItemsForTerms } from "@/lib/customerPortalStatus";
import { formatTimeHHmm } from "@/lib/timeUtils";

interface AcceptViewProps {
  program: any;
  items: ProgramRequestItem[];
  numberOfPeople: number;
  selectedDates: Date[];
  termsAccepted: boolean;
  billingComplete: boolean;
  allConfirmed: boolean;
  /** Mag de klant nu onder voorbehoud ondertekenen? (bepaald in customerPortalStatus) */
  canAcceptUnderReservation?: boolean;
  accommodationQuotes: AccommodationQuote[];
  invoicingMode?: string;
  acceptedTerms?: AcceptedTermsEntry[];
  termsAcceptedAt?: string;
  signatureName?: string | null;
  signatureId?: string | null;
  onAcceptTerms: (signatureName: string, underReservation?: boolean) => Promise<boolean>;
  onOpenBilling: () => void;
  /** Naar het tabblad Programma, als daar eerst nog akkoord nodig is. */
  onGoToProgram?: () => void;
}

const dayLabel = (dayIndex: number | null | undefined, selectedDates: Date[]) => {
  if (dayIndex === null || dayIndex === undefined || dayIndex < 0) return null;
  const date = selectedDates[dayIndex];
  if (!date) return `dag ${dayIndex + 1}`;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
};

/**
 * Het tabblad Akkoord (klantportaal fase 3): één melding met de stand, de
 * voorwaarden met de knop "Ondertekenen" (ook onder voorbehoud, met de open
 * onderdelen erbij), en na het ondertekenen een bevestiging in de pagina.
 */
export const AcceptView = ({
  items,
  selectedDates,
  termsAccepted,
  billingComplete,
  allConfirmed,
  canAcceptUnderReservation = false,
  accommodationQuotes,
  acceptedTerms,
  termsAcceptedAt,
  signatureName,
  signatureId,
  onAcceptTerms,
  onOpenBilling,
  onGoToProgram,
}: AcceptViewProps) => {
  const [justSigned, setJustSigned] = useState<"definitief" | "voorbehoud" | null>(null);
  const unconfirmedItems = useMemo(() => getUnconfirmedItemsForTerms(items), [items]);
  const hasPending = !allConfirmed && unconfirmedItems.length > 0;
  // Onder voorbehoud ondertekenen mag alleen als de klant zelf niets meer moet
  // doen (voorstel al goedgekeurd) en er enkel aanbieder-bevestigingen open staan.
  const maySignUnderReservation = hasPending && canAcceptUnderReservation;
  const canSign = allConfirmed || maySignUnderReservation;
  const count = unconfirmedItems.length;
  const names = unconfirmedItems.map((item) => item.block_name).join(", ");

  const handleAccept = async (name: string, underReservation?: boolean) => {
    const ok = await onAcceptTerms(name, underReservation);
    if (ok) setJustSigned(underReservation ? "voorbehoud" : "definitief");
    return ok;
  };

  if (justSigned && termsAccepted) {
    return (
      <div className="space-y-6">
        <SuccessScreen
          as="h2"
          title={justSigned === "voorbehoud" ? "Ondertekend onder voorbehoud" : "Ondertekend"}
          intro={
            justSigned === "voorbehoud"
              ? "Uw programma en de voorwaarden zijn vastgelegd. Zodra de aanbieder de laatste onderdelen bevestigt, hoort u dat van ons."
              : "Uw boeking is definitief. U ontvangt een bevestiging per e-mail; de aanbieders zijn op de hoogte."
          }
          primary={onGoToProgram ? { label: "Naar het programma", onClick: onGoToProgram } : undefined}
          secondary={{ label: "Facturatiegegevens bekijken", onClick: onOpenBilling }}
        >
          {signatureId && (
            <p className="text-xs text-muted-foreground">
              Ondertekening <span className="font-mono">{signatureId}</span>
            </p>
          )}
          {justSigned === "voorbehoud" && count > 0 && (
            <p className="text-sm text-muted-foreground">
              Nog onder voorbehoud: <strong className="font-medium text-foreground">{names}</strong>.
            </p>
          )}
        </SuccessScreen>
        {termsAcceptedAt && <PaymentStatusCard items={items} termsAcceptedAt={termsAcceptedAt} />}
      </div>
    );
  }

  const notice: { tone: NoticeTone; title: string; body: ReactNode } = termsAccepted
    ? hasPending
      ? {
          tone: "info",
          title: "Ondertekend onder voorbehoud",
          body: (
            <p>
              {count === 1 ? "Dit onderdeel wacht" : "Deze onderdelen wachten"} nog op bevestiging van de aanbieder:{" "}
              <strong className="font-medium">{names}</strong>. Wij houden dit in de gaten en laten weten zodra het rond is.
            </p>
          ),
        }
      : {
          tone: "success",
          title: "Uw boeking is definitief",
          body: <p>U heeft de voorwaarden ondertekend. Hieronder staat wat u heeft geaccepteerd en de stand van de betalingen.</p>,
        }
    : allConfirmed
      ? {
          tone: "warning",
          title: "Klaar voor ondertekening",
          body: <p>Alle onderdelen zijn bevestigd. Controleer uw facturatiegegevens en onderteken de voorwaarden; daarmee is uw boeking definitief.</p>,
        }
      : maySignUnderReservation
        ? {
            tone: "info",
            title: count === 1 ? "Nog één onderdeel wacht op bevestiging van de aanbieder" : `Nog ${count} onderdelen wachten op bevestiging van de aanbieder`,
            body: (
              <>
                <p>
                  U heeft uw programma goedgekeurd; wij hebben de aanbieder gevraagd de afspraak definitief vast te leggen. U kunt wachten tot alles rond
                  is, of nu al ondertekenen onder voorbehoud. Lukt een onderdeel niet, dan zoeken wij een alternatief of vervalt het zonder kosten.
                </p>
                <ul className="mt-2 list-disc pl-5">
                  {unconfirmedItems.map((item) => {
                    const when = [dayLabel(item.day_index, selectedDates), formatTimeHHmm(item.preferred_time)].filter(Boolean).join(", ");
                    return (
                      <li key={item.id}>
                        <span className="font-medium">{item.block_name}</span>
                        {item.provider_name && ` · ${item.provider_name}`}
                        {when && ` · ${when}`}
                      </li>
                    );
                  })}
                </ul>
              </>
            ),
          }
        : {
            tone: "info",
            title: "Eerst uw akkoord op het voorstel",
            body: <p>Geef eerst uw akkoord op de onderdelen in uw programma. Daarna kunt u hier de voorwaarden ondertekenen.</p>,
          };

  return (
    <div id="terms-section" className="scroll-mt-20 space-y-6">
      <Notice tone={notice.tone} title={notice.title}>
        {notice.body}
        {!termsAccepted && !canSign && onGoToProgram && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onGoToProgram}>
            Naar het programma
          </Button>
        )}
      </Notice>

      {!termsAccepted && canSign && (
        <AcceptTermsCard
          onAccept={handleAccept}
          isBillingComplete={billingComplete}
          onOpenBilling={onOpenBilling}
          items={items}
          accommodationQuotes={accommodationQuotes}
          selectedDates={selectedDates}
          unconfirmedItems={allConfirmed ? [] : unconfirmedItems}
        />
      )}

      {termsAccepted && acceptedTerms && acceptedTerms.length > 0 && termsAcceptedAt && (
        <AcceptedTermsCard termsAcceptedAt={termsAcceptedAt} signatureName={signatureName ?? null} signatureId={signatureId ?? null} acceptedTerms={acceptedTerms} />
      )}

      {termsAccepted && termsAcceptedAt && <PaymentStatusCard items={items} termsAcceptedAt={termsAcceptedAt} />}
    </div>
  );
};
