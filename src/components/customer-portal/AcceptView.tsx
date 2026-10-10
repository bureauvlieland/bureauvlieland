import { useMemo, useState } from "react";
import { Notice, SuccessScreen } from "@/components/system";
import { AcceptTermsCard } from "./AcceptTermsCard";
import { AcceptedTermsCard, type AcceptedTermsEntry } from "./AcceptedTermsCard";
import { PaymentStatusCard } from "./PaymentStatusCard";
import { PendingConfirmationExplainer } from "./PendingConfirmationExplainer";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";
import { getUnconfirmedItemsForTerms } from "@/lib/customerPortalStatus";

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
}

/**
 * Het tabblad Akkoord (klantportaal fase 3a): vóór ondertekenen één melding
 * met de stand en de kaart om te ondertekenen; erna een `SuccessScreen` in
 * de pagina, de ondertekening met de voorwaarden, en waar de facturen staan.
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
}: AcceptViewProps) => {
  const [showUnderReservation, setShowUnderReservation] = useState(false);

  const unconfirmedItems = useMemo(() => getUnconfirmedItemsForTerms(items), [items]);
  const hasPending = !allConfirmed && unconfirmedItems.length > 0;
  // Onder voorbehoud ondertekenen mag alleen als de klant zelf niets meer moet
  // doen (voorstel al goedgekeurd) en er enkel aanbieder-bevestigingen open staan.
  const maySignUnderReservation = hasPending && canAcceptUnderReservation;
  const signingUnderReservation = maySignUnderReservation && showUnderReservation;
  const pendingNames = unconfirmedItems.map((item) => item.block_name).join(", ");

  if (termsAccepted && termsAcceptedAt) {
    return (
      <div className="space-y-6">
        <SuccessScreen
          title={hasPending ? "Ondertekend onder voorbehoud" : "Uw boeking is definitief"}
          intro={
            hasPending
              ? `${unconfirmedItems.length === 1 ? "Dit onderdeel wacht" : "Deze onderdelen wachten"} nog op de aanbieder: ${pendingNames}. Wij houden het voor u in de gaten en laten weten zodra het rond is.`
              : "Alle onderdelen zijn bevestigd en de voorwaarden zijn ondertekend. Tot ziens op Vlieland."
          }
          className="py-4"
        />
        {acceptedTerms && acceptedTerms.length > 0 && (
          <AcceptedTermsCard
            termsAcceptedAt={termsAcceptedAt}
            signatureName={signatureName ?? null}
            signatureId={signatureId ?? null}
            acceptedTerms={acceptedTerms}
          />
        )}
        <PaymentStatusCard items={items} termsAcceptedAt={termsAcceptedAt} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {allConfirmed ? (
        <Notice tone={billingComplete ? "warning" : "info"} title="U bent aan zet">
          {billingComplete
            ? "Alles is bevestigd. Onderteken de voorwaarden om de boeking definitief te maken."
            : "Alles is bevestigd. Vul eerst uw facturatiegegevens in, daarna kunt u ondertekenen."}
        </Notice>
      ) : hasPending ? (
        <PendingConfirmationExplainer
          items={unconfirmedItems}
          selectedDates={selectedDates}
          canAcceptUnderReservation={maySignUnderReservation && !showUnderReservation}
          customerApproved={canAcceptUnderReservation}
          onSignUnderReservation={() => setShowUnderReservation(true)}
        />
      ) : (
        <Notice tone="info" title="Nog niet aan de orde">
          Geef eerst uw akkoord op het voorstel in uw programma. Daarna kunt u hier de voorwaarden ondertekenen.
        </Notice>
      )}

      {(allConfirmed || signingUnderReservation) && (
        <div id="terms-section" className="scroll-mt-20">
          <AcceptTermsCard
            onAccept={onAcceptTerms}
            isBillingComplete={billingComplete}
            onOpenBilling={onOpenBilling}
            items={items}
            accommodationQuotes={accommodationQuotes}
            selectedDates={selectedDates}
            unconfirmedItems={allConfirmed ? [] : unconfirmedItems}
          />
        </div>
      )}
    </div>
  );
};
