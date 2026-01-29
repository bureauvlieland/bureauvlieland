import { StatusSummary } from "./StatusSummary";
import { NextStepsCard } from "./NextStepsCard";
import { PriceSummaryCard } from "./PriceSummaryCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgramRequestItem } from "@/types/programRequest";
import type { AccommodationQuote } from "@/types/accommodation";

interface ProgramSidebarProps {
  statusSummary: {
    total: number;
    confirmed: number;
    pending: number;
    alternative: number;
    progress: number;
  };
  termsAccepted: boolean;
  billingComplete: boolean;
  onOpenBilling: () => void;
  onRefresh: () => void;
  onCancel: () => void;
  items: ProgramRequestItem[];
  numberOfPeople: number;
  selectedAccommodationQuote?: AccommodationQuote | null;
  isMultiDay?: boolean;
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
  isMultiDay = false,
  className,
}: ProgramSidebarProps) => {
  // Determine if accommodation is arranged
  const hasAccommodation = !!selectedAccommodationQuote;

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
        termsAccepted={termsAccepted}
        isMultiDay={isMultiDay}
      />

      {/* Next steps - sidebar variant */}
      <NextStepsCard
        statusSummary={statusSummary}
        termsAccepted={termsAccepted}
        billingComplete={billingComplete}
        onOpenBilling={onOpenBilling}
        variant="sidebar"
      />

      {/* Price summary - compact */}
      <PriceSummaryCard
        items={items}
        numberOfPeople={numberOfPeople}
        variant="compact"
        termsAccepted={termsAccepted}
        selectedAccommodationQuote={selectedAccommodationQuote}
      />

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
