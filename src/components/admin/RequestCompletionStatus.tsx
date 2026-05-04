import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileCheck, AlertCircle, Info } from "lucide-react";
import {
  completionStatusLabels,
  completionStatusColors,
  type CompletionStatus,
} from "@/types/bureauInvoice";

interface ProgramRequestItem {
  id: string;
  status: string;
  block_type: string;
  provider_id?: string | null;
  skip_partner_notification?: boolean | null;
  day_index?: number | null;
}

interface RequestCompletionStatusProps {
  status: string;
  completionStatus: CompletionStatus | null;
  termsAcceptedAt: string | null;
  items: ProgramRequestItem[];
  outstandingAmount: number;
  quoteStatus?: string | null;
}

export const RequestCompletionStatus = ({
  status,
  completionStatus,
  termsAcceptedAt,
  items,
  outstandingAmount,
  quoteStatus,
}: RequestCompletionStatusProps) => {
  const termsAccepted = !!termsAcceptedAt;

  // Quote nog niet door klant geaccepteerd → wachten op klant, niet op partners
  const isAwaitingCustomerQuote =
    !termsAccepted &&
    (quoteStatus === "concept" ||
      quoteStatus === "in_afstemming" ||
      quoteStatus === "offerte_verstuurd");

  // Filter items voor partner-telling:
  // - Geen geannuleerde
  // - Geen interne bureau-extras (day_index = -1)
  // - Geen items waarvoor geen partneractie nodig is (skip_partner_notification of provider_id = bureau)
  //   ZOLANG de klant nog niet getekend heeft. Pas na klant-akkoord tellen we bureau-items mee als "geregeld".
  const partnerActionableItems = items.filter((item) => {
    if (item.status === "cancelled") return false;
    if (item.day_index === -1) return false;
    const isBureauOnly =
      item.provider_id === "bureau" || item.skip_partner_notification === true;
    if (isBureauOnly && !termsAccepted) return false;
    return true;
  });

  const confirmedItems = partnerActionableItems.filter(
    (item) =>
      item.status === "confirmed" ||
      item.status === "executed" ||
      // Bureau-items na klant-akkoord tellen automatisch als geregeld
      ((item.provider_id === "bureau" || item.skip_partner_notification === true) &&
        termsAccepted),
  );

  const allItemsConfirmed =
    partnerActionableItems.length > 0 &&
    confirmedItems.length === partnerActionableItems.length;

  // Determine effective completion status
  const effectiveStatus: CompletionStatus = (() => {
    if (completionStatus === "fully_invoiced" || completionStatus === "partially_invoiced") {
      return completionStatus;
    }
    if (allItemsConfirmed && termsAccepted) {
      return "ready_for_invoice";
    }
    return "in_progress";
  })();

  const statusInfo = completionStatusColors[effectiveStatus];
  const statusLabel = completionStatusLabels[effectiveStatus];

  // Status icon
  const StatusIcon = (() => {
    switch (effectiveStatus) {
      case "fully_invoiced":
        return CheckCircle2;
      case "partially_invoiced":
        return FileCheck;
      case "ready_for_invoice":
        return AlertCircle;
      default:
        return Clock;
    }
  })();

  if (status === "cancelled") {
    return null;
  }

  // Bij fully_invoiced is alles klaar — toon partner-rij in groen
  const isFullyInvoiced = effectiveStatus === "fully_invoiced";
  const partnerRowGreen = allItemsConfirmed || isFullyInvoiced;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            Voltooiingsstatus
          </span>
          <Badge className={`${statusInfo.bg} ${statusInfo.text}`}>
            {statusLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Wacht op klant-akkoord → toon dat expliciet i.p.v. misleidende partner-teller */}
        {isAwaitingCustomerQuote ? (
          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700">
              Wacht op klant-akkoord op offerte
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            {partnerRowGreen ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Clock className="h-4 w-4 text-amber-600" />
            )}
            <span className={partnerRowGreen ? "text-green-700" : "text-amber-700"}>
              {partnerActionableItems.length === 0
                ? "Geen partner-onderdelen"
                : `Partners bevestigd (${confirmedItems.length}/${partnerActionableItems.length})`}
            </span>
          </div>
        )}

        {/* Terms acceptance */}
        <div className="flex items-center gap-2 text-sm">
          {termsAccepted ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Clock className="h-4 w-4 text-amber-600" />
          )}
          <span className={termsAccepted ? "text-green-700" : "text-amber-700"}>
            {termsAccepted ? "Voorwaarden geaccepteerd" : "Voorwaarden nog niet geaccepteerd"}
          </span>
        </div>

        {/* Outstanding amount */}
        {effectiveStatus !== "in_progress" && (
          <div className="flex items-center gap-2 text-sm">
            {outstandingAmount <= 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            <span className={outstandingAmount <= 0 ? "text-green-700" : "text-amber-700"}>
              {outstandingAmount <= 0
                ? "Volledig gefactureerd"
                : `Nog te factureren: €${outstandingAmount.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
