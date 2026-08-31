import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptTermsCard } from "./AcceptTermsCard";
import { AcceptedTermsCard, type AcceptedTermsEntry } from "./AcceptedTermsCard";
import { PaymentStatusCard } from "./PaymentStatusCard";
import { PendingConfirmationExplainer } from "./PendingConfirmationExplainer";
import { Info, CheckCircle2, Clock } from "lucide-react";
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
  accommodationQuotes: AccommodationQuote[];
  invoicingMode?: string;
  acceptedTerms?: AcceptedTermsEntry[];
  termsAcceptedAt?: string;
  signatureName?: string | null;
  signatureId?: string | null;
  onAcceptTerms: (signatureName: string, underReservation?: boolean) => Promise<boolean>;
  onOpenBilling: () => void;
}

export const AcceptView = ({
  program,
  items,
  numberOfPeople,
  selectedDates,
  termsAccepted,
  billingComplete,
  allConfirmed,
  accommodationQuotes,
  invoicingMode,
  acceptedTerms,
  termsAcceptedAt,
  signatureName,
  signatureId,
  onAcceptTerms,
  onOpenBilling,
}: AcceptViewProps) => {
  const [showUnderReservation, setShowUnderReservation] = useState(false);

  const unconfirmedItems = useMemo(
    () => getUnconfirmedItemsForTerms(items),
    [items],
  );

  const hasPending = !allConfirmed && unconfirmedItems.length > 0;

  return (
    <div className="space-y-6">
      {/* Intro strip */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 dark:text-blue-100">
          <p className="font-medium">Wat kunt u hier doen?</p>
          <p className="text-blue-800/90 dark:text-blue-100/90 mt-1">
            {termsAccepted
              ? "Hier ziet u uw ondertekende akkoord en de status van betalingen. Het programma is bevestigd."
              : allConfirmed
              ? "Controleer uw facturatiegegevens en geef akkoord op de voorwaarden. Daarmee bevestigt u uw boeking definitief."
              : "Eén of meer onderdelen wachten nog op bevestiging van de aanbieder. U kunt wachten tot alles rond is, of nu al ondertekenen onder voorbehoud."}
          </p>
        </div>
      </div>

      {/* Uitleg openstaande bevestigingen */}
      {!termsAccepted && hasPending && (
        <PendingConfirmationExplainer
          items={unconfirmedItems}
          selectedDates={selectedDates}
          canAcceptUnderReservation={!showUnderReservation}
          onSignUnderReservation={() => setShowUnderReservation(true)}
        />
      )}

      {/* Akkoord */}
      {!termsAccepted ? (
        <div id="terms-section" className="scroll-mt-20">
          {allConfirmed || showUnderReservation ? (
            <AcceptTermsCard
              onAccept={onAcceptTerms}
              isBillingComplete={billingComplete}
              onOpenBilling={onOpenBilling}
              items={items}
              accommodationQuotes={accommodationQuotes}
              selectedDates={selectedDates}
              unconfirmedItems={allConfirmed ? [] : unconfirmedItems}
            />
          ) : null}
        </div>
      ) : (
        <>
          {hasPending && (
            <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  Ondertekend onder voorbehoud
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  {unconfirmedItems.length === 1
                    ? "Dit onderdeel wacht nog op bevestiging van de aanbieder:"
                    : "Deze onderdelen wachten nog op bevestiging van de aanbieder:"}{" "}
                  <span className="font-medium text-foreground">
                    {unconfirmedItems.map((item) => item.block_name).join(", ")}
                  </span>
                  . Wij houden dit voor u in de gaten en laten weten zodra het rond is.
                </p>
              </CardContent>
            </Card>
          )}

          {acceptedTerms && acceptedTerms.length > 0 && termsAcceptedAt && (
            <AcceptedTermsCard
              termsAcceptedAt={termsAcceptedAt}
              signatureName={signatureName ?? null}
              signatureId={signatureId ?? null}
              acceptedTerms={acceptedTerms}
            />
          )}
        </>
      )}

      {/* Betaalstatus */}
      {termsAccepted && termsAcceptedAt && (
        <PaymentStatusCard items={items} termsAcceptedAt={termsAcceptedAt} />
      )}

      {termsAccepted && !hasPending && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Uw boeking is definitief bevestigd.
        </div>
      )}
    </div>
  );
};
