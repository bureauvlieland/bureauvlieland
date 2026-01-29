import { Bell, CheckCircle, ChevronRight, ArrowLeftRight, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PartnerActionBannerProps {
  pendingCount: number;
  counterProposedCount: number;
  toInvoiceCount: number;
  onNavigate: (target: "action" | "invoice") => void;
}

export const PartnerActionBanner = ({
  pendingCount,
  counterProposedCount,
  toInvoiceCount,
  onNavigate,
}: PartnerActionBannerProps) => {
  const hasActions = pendingCount > 0 || counterProposedCount > 0 || toInvoiceCount > 0;

  if (!hasActions) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="font-medium text-green-800 dark:text-green-300">Alles up-to-date</p>
          <p className="text-sm text-green-700 dark:text-green-400">Geen openstaande acties</p>
        </div>
      </div>
    );
  }

  const messages: string[] = [];
  if (pendingCount > 0) {
    messages.push(`${pendingCount} nieuwe aanvra${pendingCount === 1 ? "ag" : "gen"}`);
  }
  if (counterProposedCount > 0) {
    messages.push(`${counterProposedCount} tegenvoorstel${counterProposedCount === 1 ? "" : "len"}`);
  }
  if (toInvoiceCount > 0) {
    messages.push(`${toInvoiceCount} te factureren`);
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-amber-900 dark:text-amber-200">Actie nodig</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 truncate">
              {messages.join(" • ")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {(pendingCount > 0 || counterProposedCount > 0) && (
            <Button
              size="sm"
              variant="outline"
              className="bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200"
              onClick={() => onNavigate("action")}
            >
              <ArrowLeftRight className="h-4 w-4 mr-1.5" />
              Bekijk aanvragen
            </Button>
          )}
          {toInvoiceCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-200"
              onClick={() => onNavigate("invoice")}
            >
              <Receipt className="h-4 w-4 mr-1.5" />
              Te factureren
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
