import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileCheck, AlertCircle } from "lucide-react";
import {
  completionStatusLabels,
  completionStatusColors,
  type CompletionStatus,
} from "@/types/bureauInvoice";

interface ProgramRequestItem {
  id: string;
  status: string;
  block_type: string;
}

interface RequestCompletionStatusProps {
  status: string;
  completionStatus: CompletionStatus | null;
  termsAcceptedAt: string | null;
  items: ProgramRequestItem[];
  outstandingAmount: number;
}

export const RequestCompletionStatus = ({
  status,
  completionStatus,
  termsAcceptedAt,
  items,
  outstandingAmount,
}: RequestCompletionStatusProps) => {
  // Calculate item confirmation stats
  const nonCancelledItems = items.filter((item) => item.status !== "cancelled");
  const confirmedItems = nonCancelledItems.filter((item) => item.status === "confirmed");
  const allItemsConfirmed = nonCancelledItems.length > 0 && confirmedItems.length === nonCancelledItems.length;
  const termsAccepted = !!termsAcceptedAt;

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
        {/* Items confirmation */}
        <div className="flex items-center gap-2 text-sm">
          {allItemsConfirmed ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Clock className="h-4 w-4 text-amber-600" />
          )}
          <span className={allItemsConfirmed ? "text-green-700" : "text-amber-700"}>
            Partners bevestigd ({confirmedItems.length}/{nonCancelledItems.length})
          </span>
        </div>

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
