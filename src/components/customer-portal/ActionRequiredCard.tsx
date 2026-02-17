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
  MessageSquareWarning
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  programType?: string;
  quoteStatus?: string | null;
  className?: string;
}

type ActionType = "alternative" | "counter_proposed" | "pending" | "accommodation" | "billing" | "terms" | "complete" | null;

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
  className,
}: ActionRequiredCardProps) => {
  const allConfirmed = statusSummary.pending === 0 && statusSummary.alternative === 0 && (statusSummary.counter_proposed || 0) === 0 && statusSummary.total > 0;
  const isQuoteAwaitingApproval = programType === "quote" && quoteStatus === "offerte_verstuurd";

  const getAction = (): ActionConfig | null => {
    // Priority 1: Alternative proposals need customer action
    if (statusSummary.alternative > 0) {
      return {
        type: "alternative",
        title: "Alternatief voorstel ontvangen",
        description: `${statusSummary.alternative === 1 ? "Een aanbieder heeft" : `${statusSummary.alternative} aanbieders hebben`} een alternatief voorgesteld. Bekijk het voorstel en geef akkoord of stel een andere tijd voor.`,
        icon: <AlertCircle className="h-5 w-5" />,
        variant: "warning",
        cta: {
          label: "Bekijk voorstel",
          onClick: () => {
            const programSection = document.getElementById("program");
            programSection?.scrollIntoView({ behavior: "smooth" });
          },
        },
      };
    }

    // Priority 2: Counter proposals waiting for partner response
    if ((statusSummary.counter_proposed || 0) > 0) {
      return {
        type: "counter_proposed",
        title: "Tegenvoorstel in behandeling",
        description: `Uw tegenvoorstel is verzonden naar de aanbieder. U ontvangt bericht zodra zij reageren.`,
        icon: <MessageSquareWarning className="h-5 w-5" />,
        variant: "info",
      };
    }

    // Priority 3: Pending items waiting for partner confirmation
    // Skip when quote is awaiting approval - requests haven't been sent yet
    if (statusSummary.pending > 0 && !isQuoteAwaitingApproval) {
      return {
        type: "pending",
        title: "Aanvragen verstuurd naar aanbieders",
        description: `Uw programma is ingediend en de aanvragen zijn verstuurd naar ${statusSummary.pending} aanbieder${statusSummary.pending > 1 ? "s" : ""}. Zodra zij reageren ontvangt u hiervan een e-mail.`,
        icon: <Clock className="h-5 w-5" />,
        variant: "info",
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
        description: "Vul uw bedrijfsgegevens in zodat de aanbieders u kunnen factureren.",
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

    // Booking complete
    if (termsAccepted) {
      return {
        type: "complete",
        title: "Uw boeking is compleet!",
        description: "U ontvangt de facturen van de verschillende aanbieders. Wij wensen u veel plezier op Vlieland!",
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
