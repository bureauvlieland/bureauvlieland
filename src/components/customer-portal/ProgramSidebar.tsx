import { StatusSummary } from "./StatusSummary";
import { Button } from "@/components/ui/button";
import { RefreshCw, Ban, TreePine, Landmark } from "lucide-react";
import { ExternalLink, UtensilsCrossed, Coffee } from "lucide-react";
import olivaImg from "@/assets/oliva.jpg";
import cafeBovenImg from "@/assets/cafe-boven.jpg";
import { cn } from "@/lib/utils";
import { useAppSettings } from "@/hooks/useAppSettings";
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
  numberOfDays?: number;
  selectedAccommodationQuote?: AccommodationQuote | null;
  accommodation?: AccommodationRequest | null;
  isMultiDay?: boolean;
  isPreApproval?: boolean;
  quoteStatus?: string | null;
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
  numberOfDays,
  selectedAccommodationQuote,
  accommodation,
  isMultiDay = false,
  isPreApproval = false,
  quoteStatus,
  totalCost = 0,
  allConfirmed = false,
  onScrollToTerms,
  className,
}: ProgramSidebarProps) => {
  // Determine accommodation status
  const hasAccommodation = !!selectedAccommodationQuote;
  const accommodationStatus: "none" | "requested" | "selected" = selectedAccommodationQuote ? "selected" : accommodation ? "requested" : "none";
  const { settings: appSettings } = useAppSettings();

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
         quoteStatus={quoteStatus}
      />



      {/* Levies info */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <Landmark className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Toeristenbelasting</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              €{appSettings.tourist_tax_pp_per_day.toFixed(2).replace('.', ',')} p.p. per dag — de gemeente Vlieland heft toeristenbelasting voor iedereen die op het eiland verblijft.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <TreePine className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Natuurbijdrage</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              €{appSettings.nature_contribution_pp.toFixed(2).replace('.', ',')} p.p. — per deelnemer wordt een bijdrage afgedragen aan Staatsbosbeheer voor het behoud van de natuur op Vlieland.
            </p>
          </div>
        </div>
      </div>


      {/* Horeca advertenties */}
      <div className="space-y-3">
        <a
          href="https://olivavlieland.nl"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl overflow-hidden border group hover:shadow-md transition-shadow"
        >
          <div className="relative h-28 overflow-hidden">
            <img src={olivaImg} alt="Trattoria Oliva" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute bottom-3 left-3 right-3 text-white font-semibold text-sm flex items-center gap-1.5 drop-shadow-md">
              <UtensilsCrossed className="h-4 w-4" />
              Trattoria Oliva
            </span>
          </div>
          <div className="p-3 bg-card">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Authentiek Italiaans dineren op Vlieland.
            </p>
            <span className="text-xs font-medium text-primary flex items-center gap-1 mt-1.5 group-hover:underline">
              Bekijk menu <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </a>

        <a
          href="https://cafeboven.nl"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl overflow-hidden border group hover:shadow-md transition-shadow"
        >
          <div className="relative h-28 overflow-hidden">
            <img src={cafeBovenImg} alt="Café Boven" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute bottom-3 left-3 right-3 text-white font-semibold text-sm flex items-center gap-1.5 drop-shadow-md">
              <Coffee className="h-4 w-4" />
              Vlielands Biercafé
            </span>
          </div>
          <div className="p-3 bg-card">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gezellig borrelen met uitzicht over het dorp.
            </p>
            <span className="text-xs font-medium text-primary flex items-center gap-1 mt-1.5 group-hover:underline">
              Meer info <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </a>
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
