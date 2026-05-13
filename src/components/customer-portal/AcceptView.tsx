import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptTermsCard } from "./AcceptTermsCard";
import { AcceptedTermsCard, type AcceptedTermsEntry } from "./AcceptedTermsCard";
import { PaymentStatusCard } from "./PaymentStatusCard";
import { CompactBillingSection } from "./CompactBillingSection";
import { FileText, Info, CheckCircle2 } from "lucide-react";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";

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
  onAcceptTerms: (signatureName: string) => Promise<boolean>;
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
  return (
    <div className="space-y-6">
      {/* Intro strip */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 dark:text-blue-100">
          <p className="font-medium">Wat kunt u hier doen?</p>
          <p className="text-blue-800/90 dark:text-blue-100/90 mt-1">
            {termsAccepted
              ? "Hier ziet u uw ondertekende akkoord en de status van betalingen. Het programma is definitief bevestigd."
              : allConfirmed
              ? "Controleer uw facturatiegegevens en geef akkoord op de voorwaarden. Daarmee bevestigt u uw boeking definitief."
              : "Zodra alle programmaonderdelen bevestigd zijn, kunt u hier akkoord geven op de voorwaarden en uw boeking definitief maken."}
          </p>
        </div>
      </div>

      {/* Facturatiegegevens-check */}
      <CompactBillingSection
        program={program}
        items={items}
        numberOfPeople={numberOfPeople}
        numberOfDays={selectedDates.length || 1}
        termsAccepted={termsAccepted}
        selectedAccommodationQuote={accommodationQuotes.find((q) => q.status === "selected")}
        onEditBilling={onOpenBilling}
        invoicingMode={invoicingMode}
      />

      {/* Akkoord */}
      {!termsAccepted ? (
        <div id="terms-section" className="scroll-mt-20">
          {allConfirmed ? (
            <AcceptTermsCard
              onAccept={onAcceptTerms}
              isBillingComplete={billingComplete}
              onOpenBilling={onOpenBilling}
              items={items}
              accommodationQuotes={accommodationQuotes}
              selectedDates={selectedDates}
            />
          ) : (
            <Card className="border-dashed bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Voorwaarden
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Zodra alle activiteiten in uw programma bevestigd zijn,
                  verschijnen hier de voorwaarden ter ondertekening.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        acceptedTerms && acceptedTerms.length > 0 && termsAcceptedAt && (
          <AcceptedTermsCard
            termsAcceptedAt={termsAcceptedAt}
            signatureName={signatureName ?? null}
            signatureId={signatureId ?? null}
            acceptedTerms={acceptedTerms}
          />
        )
      )}

      {/* Betaalstatus */}
      {termsAccepted && termsAcceptedAt && (
        <PaymentStatusCard items={items} termsAcceptedAt={termsAcceptedAt} />
      )}

      {termsAccepted && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Uw boeking is definitief bevestigd.
        </div>
      )}
    </div>
  );
};
