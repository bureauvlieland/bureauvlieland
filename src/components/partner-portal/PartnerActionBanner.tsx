import { Bell, ArrowLeftRight, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PartnerActionBannerProps {
  /** Items requiring an explicit response: counter proposals, open admin price changes */
  urgentCount: number;
  /** Items that have been accepted by the customer and can be invoiced */
  toInvoiceCount: number;
  onNavigate: (target: "action" | "invoice") => void;
}

/**
 * Compacte alert die alléén verschijnt voor échte acties met urgentie:
 * tegenvoorstellen / openstaande prijswijzigingen / klaar om te factureren.
 * Reguliere "nieuwe aanvragen" worden door PartnerCompactStats gecommuniceerd
 * — daar bewust geen dubbele rij meer.
 */
export const PartnerActionBanner = ({
  urgentCount,
  toInvoiceCount,
  onNavigate,
}: PartnerActionBannerProps) => {
  if (urgentCount === 0 && toInvoiceCount === 0) {
    return null;
  }

  const messages: string[] = [];
  if (urgentCount > 0) {
    messages.push(`${urgentCount} item${urgentCount === 1 ? "" : "s"} vraagt uw reactie`);
  }
  if (toInvoiceCount > 0) {
    messages.push(`${toInvoiceCount} klaar om te factureren`);
  }

  return (
    <div className="bg-warning-soft border border-warning/30 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground">Actie nodig</p>
            <p className="text-sm text-muted-foreground truncate">
              {messages.join(" • ")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {urgentCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate("action")}
            >
              <ArrowLeftRight className="h-4 w-4 mr-1.5" />
              Reageer op aanvragen
            </Button>
          )}
          {toInvoiceCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate("invoice")}
            >
              <Receipt className="h-4 w-4 mr-1.5" />
              Naar facturatie
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
