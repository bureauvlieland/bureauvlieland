import { StatusSummary } from "./StatusSummary";
import { PriceSummaryCard } from "./PriceSummaryCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Ban } from "lucide-react";
import { ExternalLink, UtensilsCrossed, Coffee } from "lucide-react";
import outdoorDining from "@/assets/outdoor-dining.jpg";
import outdoorDrinks from "@/assets/outdoor-drinks.jpg";
import { cn } from "@/lib/utils";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote, AccommodationRequest } from "@/types/accommodation";

interface ProgramSidebarProps {
  statusSummary: {
    total: number;
    confirmed: number;
    pending: number;
    alternative: number;
    progress: number;
    counter_proposed?: number;
  };
  termsAccepted: boolean;
  billingComplete: boolean;
  onOpenBilling: () => void;
  onRefresh: () => void;
  onCancel: () => void;
  items: ProgramRequestItem[];
  numberOfPeople: number;
  selectedAccommodationQuote?: AccommodationQuote | null;
  accommodation?: AccommodationRequest | null;
  isMultiDay?: boolean;
  isPreApproval?: boolean;
  totalCost?: number;
  allConfirmed?: boolean;
  onScrollToTerms?: () => void;
  className?: string;
}

export const ProgramSidebar = ({
  statusSummary,
  termsAccepted,
  billingComplete,
  onOpenBilling,
  onRefresh,
  onCancel,
  items,
  numberOfPeople,
  selectedAccommodationQuote,
  accommodation,
  isMultiDay = false,
  isPreApproval = false,
  totalCost = 0,
  allConfirmed = false,
  onScrollToTerms,
  className,
}: ProgramSidebarProps) => {
  // Determine accommodation status
  const hasAccommodation = !!selectedAccommodationQuote;
  const accommodationStatus: "none" | "requested" | "selected" = selectedAccommodationQuote ? "selected" : accommodation ? "requested" : "none";

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };


  return (
    <aside
      className={cn(
        "sticky top-20 h-fit space-y-4 hidden lg:block",
        className
      )}
    >
      {/* Status summary - checklist variant */}
      <StatusSummary
        total={statusSummary.total}
        confirmed={statusSummary.confirmed}
        pending={statusSummary.pending}
        alternative={statusSummary.alternative}
        progress={statusSummary.progress}
        variant="checklist"
        billingComplete={billingComplete}
        hasAccommodation={hasAccommodation}
        accommodationStatus={accommodationStatus}
        termsAccepted={termsAccepted}
        isMultiDay={isMultiDay}
        isPreApproval={isPreApproval}
      />


      {/* Total cost display */}
      {totalCost > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Totaal (incl. BTW)</span>
            <span className="text-lg font-semibold">{formatCurrency(totalCost)}</span>
          </div>
        </div>
      )}

      {/* Price summary - compact (only if no totalCost provided) */}
      {totalCost === 0 && (
        <PriceSummaryCard
          items={items}
          numberOfPeople={numberOfPeople}
          variant="compact"
          termsAccepted={termsAccepted}
          selectedAccommodationQuote={selectedAccommodationQuote}
        />
      )}


      {/* Fietsverhuur & Boottickets */}
      <div className="space-y-3">
        <FietsverhuurBanner variant="sidebar" />
        <BootticketBanner variant="sidebar" />
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Vernieuwen
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onCancel}
        >
          <Ban className="h-4 w-4 mr-2" />
          Annuleren
        </Button>
      </div>
    </aside>
  );
};
