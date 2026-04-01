import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  FileText, 
  CreditCard,
  PartyPopper,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NextStepsCardProps {
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
  className?: string;
  variant?: "default" | "sidebar";
}

type Step = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "active" | "completed" | "waiting";
  action?: {
    label: string;
    onClick: () => void;
  };
};

export const NextStepsCard = ({
  statusSummary,
  termsAccepted,
  billingComplete,
  onOpenBilling,
  className,
  variant = "default",
}: NextStepsCardProps) => {
  const steps = useMemo((): Step[] => {
    const hasAlternatives = statusSummary.alternative > 0;
    const allConfirmed = statusSummary.pending === 0 && statusSummary.alternative === 0 && (statusSummary.counter_proposed || 0) === 0 && statusSummary.confirmed > 0;
    
    // Step 1: Wait for confirmations (includes alternatives that need action)
    const step1Status: Step["status"] = 
      statusSummary.pending > 0 ? "active" : 
      hasAlternatives ? "active" : 
      "completed";
    
    const step1Description = statusSummary.pending > 0 
      ? `Nog ${statusSummary.pending} activiteit${statusSummary.pending > 1 ? "en" : ""} wachtend op bevestiging`
      : hasAlternatives
        ? `${statusSummary.alternative} alternatief${statusSummary.alternative > 1 ? "en" : ""} - actie vereist`
        : "Alle activiteiten zijn bevestigd!";

    const step1: Step = {
      id: "confirmations",
      title: "Bevestigingen aanbieders",
      description: step1Description,
      icon: step1Status === "completed"
        ? <CheckCircle className="h-5 w-5 text-green-600" />
        : hasAlternatives
          ? <AlertCircle className="h-5 w-5 text-blue-600" />
          : <Clock className="h-5 w-5 text-amber-600" />,
      status: step1Status,
    };

    // Step 2: Fill billing details
    const step2: Step = {
      id: "billing",
      title: "Facturatiegegevens invullen",
      description: billingComplete 
        ? "Facturatiegegevens zijn compleet"
        : "Vul uw bedrijfsgegevens in voor de facturatie",
      icon: billingComplete 
        ? <CheckCircle className="h-5 w-5 text-green-600" />
        : <FileText className="h-5 w-5 text-muted-foreground" />,
      status: billingComplete ? "completed" : (allConfirmed ? "active" : "waiting"),
      action: !billingComplete && allConfirmed ? {
        label: "Invullen",
        onClick: onOpenBilling,
      } : undefined,
    };

    // Step 3: Accept terms
    const step3: Step = {
      id: "terms",
      title: "Voorwaarden accepteren",
      description: termsAccepted 
        ? "Voorwaarden geaccepteerd"
        : "Accepteer de voorwaarden om je boeking te bevestigen",
      icon: termsAccepted 
        ? <CheckCircle className="h-5 w-5 text-green-600" />
        : <CreditCard className="h-5 w-5 text-muted-foreground" />,
      status: termsAccepted 
        ? "completed" 
        : (allConfirmed && billingComplete ? "active" : "waiting"),
    };

    // Step 4: Done!
    const step4: Step = {
      id: "complete",
      title: "Boeking compleet",
      description: termsAccepted 
        ? "Uw programma is definitief bevestigd!"
        : "Na acceptatie is uw boeking compleet",
      icon: termsAccepted 
        ? <PartyPopper className="h-5 w-5 text-green-600" />
        : <PartyPopper className="h-5 w-5 text-muted-foreground" />,
      status: termsAccepted ? "completed" : "waiting",
    };

    return [step1, step2, step3, step4];
  }, [statusSummary, termsAccepted, billingComplete, onOpenBilling]);

  // Find the current active step
  const activeStepIndex = steps.findIndex(s => s.status === "active");

  // If everything is completed, show success state
  if (termsAccepted) {
    return (
      <Card className={cn("bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800", className)}>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <PartyPopper className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                Uw boeking is compleet!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                U ontvangt de factuur van Bureau Vlieland. Veel plezier op Vlieland!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sidebar variant - more compact
  if (variant === "sidebar") {
    const activeStep = steps.find((s) => s.status === "active");
    const completedCount = steps.filter((s) => s.status === "completed").length;

    return (
      <div className={cn("bg-muted/50 rounded-lg p-3", className)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Volgende stap</span>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{steps.length}
          </span>
        </div>
        {activeStep && (
          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded border border-primary/20">
            {activeStep.icon}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{activeStep.title}</p>
            </div>
            {activeStep.action && (
              <Button size="sm" variant="ghost" onClick={activeStep.action.onClick} className="shrink-0 h-7 text-xs">
                {activeStep.action.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("mb-6", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Volgende stappen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={cn(
                "flex items-start gap-4 p-3 rounded-lg transition-colors",
                step.status === "active" && "bg-primary/5 border border-primary/20",
                step.status === "completed" && "opacity-60",
                step.status === "waiting" && "opacity-40"
              )}
            >
              {/* Step number or icon */}
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                step.status === "active" && "bg-primary/10",
                step.status === "completed" && "bg-green-100 dark:bg-green-900",
                step.status === "waiting" && "bg-muted"
              )}>
                {step.status === "completed" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <span className={cn(
                    "text-sm font-medium",
                    step.status === "active" && "text-primary",
                    step.status === "waiting" && "text-muted-foreground"
                  )}>
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {step.icon}
                  <h4 className={cn(
                    "font-medium",
                    step.status === "waiting" && "text-muted-foreground"
                  )}>
                    {step.title}
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              </div>

              {/* Action button */}
              {step.action && step.status === "active" && (
                <Button size="sm" onClick={step.action.onClick}>
                  {step.action.label}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Helpful note */}
        {statusSummary.pending > 0 && (
          <div className="flex items-start gap-2 mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-800 dark:text-amber-200">
              U ontvangt een e-mail zodra een aanbieder reageert op uw aanvraag.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
