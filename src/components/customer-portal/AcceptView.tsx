import { useMemo } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Notice, SuccessScreen } from "@/components/system";
import { AcceptTermsCard } from "./AcceptTermsCard";
import { AcceptedTermsCard, type AcceptedTermsEntry } from "./AcceptedTermsCard";
import { PaymentStatusCard } from "./PaymentStatusCard";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";
import type { BillingDetails } from "@/lib/billingDetails";
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
  /** De klant kan nu tekenen: vanaf het verstuurde voorstel, of na akkoord zodra niets meer op de klant wacht. */
  canSignNow?: boolean;
  /** Tekenen omvat het akkoord op het voorstel (voorstelfase). */
  signingIncludesProposal?: boolean;
  proposalExpired?: boolean;
  quoteValidUntil?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  /** Al bekende factuurgegevens, om in de tekenkaart voor te vullen. */
  billingDefaults?: Partial<BillingDetails>;
  accommodationQuotes: AccommodationQuote[];
  invoicingMode?: string;
  acceptedTerms?: AcceptedTermsEntry[];
  termsAcceptedAt?: string;
  signatureName?: string | null;
  signatureId?: string | null;
  onAcceptTerms: (signatureName: string, underReservation?: boolean, billing?: BillingDetails) => Promise<boolean>;
  onOpenBilling: () => void;
}

/**
 * Het tabblad Akkoord (klantportaal fase 3a; plan klantreis en ondertekening,
 * fase 4): vanaf het verstuurde voorstel staat hier de ene kaart "Akkoord en
 * ondertekenen", met de factuurgegevens erin als die nog ontbreken. Wachten
 * op aanbieders blokkeert niets meer: wie tekent terwijl nog iets open staat,
 * tekent onder voorbehoud. Erna een `SuccessScreen` in de pagina, de
 * ondertekening met de voorwaarden, en waar de facturen staan.
 */
export const AcceptView = ({
  items,
  selectedDates,
  termsAccepted,
  billingComplete,
  allConfirmed,
  canSignNow = false,
  signingIncludesProposal = false,
  proposalExpired = false,
  quoteValidUntil,
  customerName,
  customerEmail,
  billingDefaults,
  accommodationQuotes,
  acceptedTerms,
  termsAcceptedAt,
  signatureName,
  signatureId,
  onAcceptTerms,
  onOpenBilling,
}: AcceptViewProps) => {
  const unconfirmedItems = useMemo(() => getUnconfirmedItemsForTerms(items), [items]);
  const hasPending = !allConfirmed && unconfirmedItems.length > 0;
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

  // Na het evenement zonder handtekening: de kaart blijft beschikbaar.
  const showCard = canSignNow || allConfirmed;

  let notice: React.ReactNode;
  if (proposalExpired) {
    const until = quoteValidUntil ? format(new Date(quoteValidUntil), "d MMMM yyyy", { locale: nl }) : null;
    notice = (
      <Notice tone="warning" title="Uw voorstel is verlopen">
        Dit voorstel was geldig tot {until ?? "voor kort"}. Neem contact op met Bureau Vlieland voor een nieuw voorstel; daarna kunt u hier akkoord geven en ondertekenen.
      </Notice>
    );
  } else if (signingIncludesProposal) {
    notice = (
      <Notice tone="warning" title="Uw voorstel staat klaar">
        Bekijk het programma op het tabblad Programma. Met uw akkoord en handtekening hieronder leggen wij alles vast bij de
        aanbieders. De prijzen zijn indicatief tot de aanbieder bevestigt; lukt een onderdeel niet, dan zoeken wij een
        alternatief of vervalt het zonder kosten.
      </Notice>
    );
  } else if (canSignNow && hasPending) {
    notice = (
      <Notice tone="warning" title="U kunt nu ondertekenen">
        {unconfirmedItems.length === 1 ? "Eén onderdeel wacht" : `${unconfirmedItems.length} onderdelen wachten`} nog op de
        aanbieder: {pendingNames}. Daar hoeft u niet op te wachten. U tekent onder voorbehoud van die bevestiging; wij houden het
        voor u in de gaten.
      </Notice>
    );
  } else if (allConfirmed) {
    notice = (
      <Notice tone="warning" title="U bent aan zet">
        Alles is bevestigd. Onderteken de voorwaarden om de boeking definitief te maken.
      </Notice>
    );
  } else if (hasPending) {
    notice = (
      <Notice tone="info" title="Eerst het programma beoordelen">
        Er staan nog onderdelen open die uw reactie vragen. Beoordeel ze op het tabblad Programma; daarna kunt u hier ondertekenen.
      </Notice>
    );
  } else {
    notice = (
      <Notice tone="info" title="Nog niet aan de orde">
        Bureau Vlieland stelt uw voorstel samen. Zodra het klaarstaat, geeft u hier akkoord en ondertekent u de voorwaarden.
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      {notice}

      {showCard && !proposalExpired && (
        <div id="terms-section" className="scroll-mt-20">
          <AcceptTermsCard
            mode={signingIncludesProposal ? "akkoord" : "onderteken"}
            onAccept={onAcceptTerms}
            isBillingComplete={billingComplete}
            onOpenBilling={onOpenBilling}
            items={items}
            accommodationQuotes={accommodationQuotes}
            selectedDates={selectedDates}
            unconfirmedItems={allConfirmed ? [] : unconfirmedItems}
            customerName={customerName}
            customerEmail={customerEmail}
            billingDefaults={billingDefaults}
          />
        </div>
      )}
    </div>
  );
};
