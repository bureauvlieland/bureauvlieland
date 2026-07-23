import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  AlertCircle, 
  BedDouble, 
  FileText, 
  CheckCircle, 
  PartyPopper,
  ArrowRight,
  MessageSquareWarning,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectExecutionState } from "@/lib/projectExecutionState";

interface ActionRequiredCardProps {
  statusSummary: {
    total: number;
    confirmed: number;
    pending: number;
    alternative: number;
    counter_proposed?: number;
  };
  isMultiDay: boolean;
  hasAccommodation: boolean;
  billingComplete: boolean;
  termsAccepted: boolean;
  onOpenBilling: () => void;
  onScrollToTerms?: () => void;
  onScrollToAccommodation?: () => void;
  programType?: string | null;
  quoteStatus?: string | null;
  programPublishedAt?: string | null;
  guestDetailsIncomplete?: boolean;
  onOpenGuestDetails?: () => void;
  /** Aantal onderdelen waarop de klant nu akkoord moet geven (incl. alternatieven). */
  customerActionsCount?: number;
  /** Aantal alternatieven binnen die acties — voor copy. */
  alternativeActionsCount?: number;
  /** Datums van het project — nodig om te bepalen of uitvoering al voorbij is. */
  selectedDates?: string[] | null;
  /** completion_status uit program_requests — nodig voor executie-state. */
  completionStatus?: string | null;
  /** cancelled_at uit program_requests — nodig voor executie-state. */
  cancelledAt?: string | null;
  className?: string;
}

type ActionType = "alternative" | "counter_proposed" | "pending" | "accommodation" | "billing" | "terms" | "guest_details" | "complete" | "past_execution" | null;


interface ActionConfig {
  type: ActionType;
  title: string;
  description: string;
  icon: React.ReactNode;
  variant: "warning" | "info" | "success" | "neutral";
  cta?: {
    label: string;
    onClick: () => void;
  };
}

export const ActionRequiredCard = ({
  statusSummary,
  isMultiDay,
  hasAccommodation,
  billingComplete,
  termsAccepted,
  onOpenBilling,
  onScrollToTerms,
  onScrollToAccommodation,
  programType,
  quoteStatus,
  programPublishedAt,
  guestDetailsIncomplete,
  onOpenGuestDetails,
  customerActionsCount = 0,
  alternativeActionsCount = 0,
  selectedDates = null,
  completionStatus = null,
  cancelledAt = null,
  className,
}: ActionRequiredCardProps) => {
  const isPublished = !!programPublishedAt;
  const allConfirmed = statusSummary.pending === 0 && statusSummary.alternative === 0 && (statusSummary.counter_proposed || 0) === 0 && statusSummary.total > 0;
  // Quote-pipeline geldt voor alle projecten — niet meer afhankelijk van programType.
  const isQuoteBeingPrepared = !!quoteStatus && ["concept", "in_afstemming"].includes(quoteStatus);
  const isProposalPhase = quoteStatus === "offerte_verstuurd"; // fase 2
  const isApprovalPhase = quoteStatus === "akkoord_ontvangen"; // fase 3 — partner-fase
  const isFinalPhase = quoteStatus === "definitief_bevestigd"; // fase 4

  const executionState = getProjectExecutionState({
    selected_dates: selectedDates ?? undefined,
    completion_status: completionStatus,
    cancelled_at: cancelledAt,
  });
  const isPastExecution = executionState === "past_execution";

  const getAction = (): ActionConfig | null => {
    // Hoogste prioriteit: uitvoering is voorbij. Verberg goedkeur-acties;
    // focus op wat nog echt moet gebeuren (facturatiegegevens, voorwaarden).
    if (isPastExecution) {
      if (!billingComplete) {
        return {
          type: "billing",
          title: "Uw programma is uitgevoerd — laatste stap: facturatiegegevens",
          description:
            "Bureau Vlieland maakt uw factuur klaar. Vul nog uw bedrijfsgegevens in zodat wij die aan de factuur kunnen koppelen.",
          icon: <FileText className="h-5 w-5" />,
          variant: "warning",
          cta: { label: "Gegevens invullen", onClick: onOpenBilling },
        };
      }
      if (!termsAccepted) {
        return {
          type: "terms",
          title: "Uw programma is uitgevoerd — accepteer de voorwaarden",
          description:
            "Alleen de voorwaarden zijn nog niet ondertekend. Zodra dat is gebeurd kunnen wij de factuur versturen.",
          icon: <CheckCircle className="h-5 w-5" />,
          variant: "warning",
          cta: onScrollToTerms
            ? { label: "Ondertekenen", onClick: onScrollToTerms }
            : undefined,
        };
      }
      return {
        type: "past_execution",
        title: "Uw programma is uitgevoerd",
        description:
          "Wij bereiden nu de facturatie voor. U ontvangt de factuur binnenkort per e-mail. Bedankt voor uw bezoek aan Vlieland!",
        icon: <CheckCircle2 className="h-5 w-5" />,
        variant: "success",
      };
    }

    // FASE 2 — voorstel klaar: handled door ProposalHeroCard (geen duplicaat hier).
    if (isProposalPhase) {
      return null;
    }


    // FASE 3 — klant heeft het voorstel goedgekeurd; nu wachten op partners
    // en per onderdeel goedkeuren zodra partner heeft gereageerd.
    if (isApprovalPhase) {
      // 3a — onderdelen waar klant nu akkoord op kan geven (partner heeft gereageerd).
      if (customerActionsCount > 0) {
        const onlyAlternatives = alternativeActionsCount === customerActionsCount;
        const someAlternatives = alternativeActionsCount > 0;
        const label =
          customerActionsCount === 1
            ? "Eén onderdeel wacht op uw akkoord"
            : `${customerActionsCount} onderdelen wachten op uw akkoord`;
        const description = onlyAlternatives
          ? "Een aanbieder stelt een aanpassing voor. Bekijk per onderdeel het voorstel en geef akkoord, of stel een andere tijd voor."
          : someAlternatives
            ? `Bekijk per onderdeel de details en geef akkoord. Bij ${alternativeActionsCount} onderdeel${alternativeActionsCount > 1 ? "en" : ""} stelt de aanbieder een aanpassing voor.`
            : "Een aanbieder heeft beschikbaarheid bevestigd. Geef per onderdeel uw akkoord op de definitieve prijs.";
        return {
          type: "alternative",
          title: label,
          description,
          icon: <AlertCircle className="h-5 w-5" />,
          variant: "warning",
          cta: {
            label: customerActionsCount === 1 ? "Naar onderdeel" : "Naar onderdelen",
            onClick: () => {
              document.getElementById("program")?.scrollIntoView({ behavior: "smooth" });
            },
          },
        };
      }

      // 3b — tegenvoorstel staat open bij partner.
      if ((statusSummary.counter_proposed || 0) > 0) {
        return {
          type: "counter_proposed",
          title: "Tegenvoorstel in behandeling",
          description: "Uw tegenvoorstel is verzonden naar de aanbieder. U ontvangt bericht zodra zij reageren.",
          icon: <MessageSquareWarning className="h-5 w-5" />,
          variant: "info",
        };
      }

      // 3c — aanvragen lopen, nog niets terug.
      if (statusSummary.pending > 0) {
        return {
          type: "pending",
          title: "Aanvragen verstuurd naar aanbieders",
          description: "Uw aanvragen zijn verstuurd naar de aanbieders. Zodra zij reageren ontvangt u hiervan een e-mail.",
          icon: <Clock className="h-5 w-5" />,
          variant: "info",
        };
      }
    }

    // FASE 1 — admin werkt aan voorstel.
    if (isQuoteBeingPrepared) {
      return {
        type: "pending",
        title: "Uw programma wordt voorbereid",
        description: "Bureau Vlieland stelt uw programma samen. U ontvangt een bericht zodra het voorstel klaar is om te bekijken.",
        icon: <Clock className="h-5 w-5" />,
        variant: "neutral",
      };
    }

    // Priority 4: Accommodation not arranged (multi-day only)
    if (isMultiDay && !hasAccommodation) {
      return {
        type: "accommodation",
        title: "Logies nog niet geregeld",
        description: "Wij vragen vrijblijvend offertes aan bij geschikte locaties en voegen deze toe aan uw programma.",
        icon: <BedDouble className="h-5 w-5" />,
        variant: "info",
        cta: onScrollToAccommodation ? {
          label: "Logies bekijken",
          onClick: onScrollToAccommodation,
        } : undefined,
      };
    }

    // Priority 5: Billing incomplete
    if (!billingComplete && allConfirmed) {
      return {
        type: "billing",
        title: "Facturatiegegevens invullen",
        description: "Vul uw bedrijfsgegevens in zodat Bureau Vlieland kan factureren.",
        icon: <FileText className="h-5 w-5" />,
        variant: "warning",
        cta: {
          label: "Gegevens invullen",
          onClick: onOpenBilling,
        },
      };
    }

    // Priority 6: Ready for signing
    if (allConfirmed && billingComplete && !termsAccepted) {
      return {
        type: "terms",
        title: "Programma gereed voor ondertekening",
        description: "Alle activiteiten zijn bevestigd. Accepteer de voorwaarden om uw boeking definitief te maken.",
        icon: <CheckCircle className="h-5 w-5" />,
        variant: "success",
        cta: onScrollToTerms ? {
          label: "Ondertekenen",
          onClick: onScrollToTerms,
        } : undefined,
      };
    }

    // Guest details still missing after signing
    if (termsAccepted && guestDetailsIncomplete) {
      return {
        type: "guest_details",
        title: "Vul de gastenlijst en wensen aan",
        description:
          "Uw boeking staat. Vul nog de namen van uw gasten en eventuele dieet- of kamerwensen in, zodat wij en de aanbieders hier rekening mee kunnen houden.",
        icon: <FileText className="h-5 w-5" />,
        variant: "info",
        cta: onOpenGuestDetails ? { label: "Aanvullen", onClick: onOpenGuestDetails } : undefined,
      };
    }

    // Booking complete
    if (termsAccepted) {
      return {
        type: "complete",
        title: "Uw boeking is compleet!",
        description: "U ontvangt de factuur van Bureau Vlieland. Wij wensen u veel plezier op Vlieland!",
        icon: <PartyPopper className="h-5 w-5" />,
        variant: "success",
      };
    }

    return null;
  };

  const action = getAction();

  if (!action) return null;

  const variantStyles = {
    warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    info: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    success: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    neutral: "bg-muted/50 border-border",
  };

  const iconStyles = {
    warning: "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400",
    info: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
    success: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
    neutral: "bg-muted text-muted-foreground",
  };

  const titleStyles = {
    warning: "text-amber-800 dark:text-amber-200",
    info: "text-blue-800 dark:text-blue-200",
    success: "text-green-800 dark:text-green-200",
    neutral: "text-foreground",
  };

  const descriptionStyles = {
    warning: "text-amber-700 dark:text-amber-300",
    info: "text-blue-700 dark:text-blue-300",
    success: "text-green-700 dark:text-green-300",
    neutral: "text-muted-foreground",
  };

  return (
    <Card className={cn("border", variantStyles[action.variant], className)}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
            iconStyles[action.variant]
          )}>
            {action.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn("font-semibold", titleStyles[action.variant])}>
              {action.title}
            </h3>
            <p className={cn("text-sm mt-0.5", descriptionStyles[action.variant])}>
              {action.description}
            </p>
          </div>
          {action.cta && (
            <Button 
              size="sm" 
              onClick={action.cta.onClick}
              className="shrink-0"
              variant={action.variant === "success" ? "default" : "outline"}
            >
              {action.cta.label}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
