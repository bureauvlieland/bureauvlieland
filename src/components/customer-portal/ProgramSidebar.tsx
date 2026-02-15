import { StatusSummary } from "./StatusSummary";
import { PriceSummaryCard } from "./PriceSummaryCard";
import { FietsverhuurBanner } from "@/components/FietsverhuurBanner";
import { BootticketBanner } from "@/components/BootticketBanner";
import { Button } from "@/components/ui/button";
import { RefreshCw, Ban, ArrowRight } from "lucide-react";
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
  isMultiDay?: boolean;
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
  isMultiDay = false,
  totalCost = 0,
  allConfirmed = false,
  onScrollToTerms,
  className,
}: ProgramSidebarProps) => {
  // Determine if accommodation is arranged
  const hasAccommodation = !!selectedAccommodationQuote;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Determine next action for CTA
  const getNextAction = () => {
    if (statusSummary.alternative > 0) {
      return { label: "Bekijk alternatieven", section: "program" };
    }
    if (statusSummary.pending > 0) {
      return null; // No action needed, waiting for providers
    }
    if (isMultiDay && !hasAccommodation) {
      return { label: "Logies bekijken", section: "accommodation" };
    }
    if (!billingComplete && allConfirmed) {
      return { label: "Gegevens invullen", action: onOpenBilling };
    }
    if (allConfirmed && billingComplete && !termsAccepted) {
      return { label: "Ondertekenen", action: onScrollToTerms };
    }
    return null;
  };

  const nextAction = getNextAction();

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

      {/* Next action CTA */}
      {nextAction && !termsAccepted && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm font-medium mb-2">Volgende stap</p>
          <Button 
            className="w-full" 
            onClick={() => {
              if (nextAction.action) {
                nextAction.action();
              } else if (nextAction.section) {
                const el = document.getElementById(nextAction.section);
                el?.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            {nextAction.label}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

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

      {/* Fietsverhuur banner */}
      <FietsverhuurBanner variant="sidebar" />
      <BootticketBanner variant="sidebar" />

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
