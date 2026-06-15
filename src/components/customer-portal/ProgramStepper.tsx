import { useState } from "react";
import { Check, BedDouble, Users, ThumbsUp, FileSignature, ChevronDown, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type StepId = "lodging" | "providers" | "approve" | "billing_terms";
export type StepState = "done" | "active" | "upcoming";

export interface ProgramStep {
  id: StepId;
  number: number;
  label: string;
  sub: string;
  state: StepState;
  actionLabel?: string;
}

export interface ProgramStepperProps {
  statusSummary: {
    total: number;
    confirmed: number;
    pending: number;
    alternative: number;
    counter_proposed?: number;
  };
  billingComplete: boolean;
  termsAccepted: boolean;
  isMultiDay: boolean;
  accommodationStatus?: "none" | "requested" | "selected";
  customerApprovedCount: number;
  customerApprovableCount: number;
  quoteStatus?: string | null;
  onStepAction?: (stepId: StepId) => void;
  className?: string;
}

const STEP_ICONS: Record<StepId, React.ComponentType<{ className?: string }>> = {
  lodging: BedDouble,
  providers: Users,
  approve: ThumbsUp,
  billing_terms: FileSignature,
};

export function getProgramSteps({
  statusSummary,
  billingComplete,
  termsAccepted,
  isMultiDay,
  accommodationStatus = "none",
  customerApprovedCount,
  customerApprovableCount,
}: Omit<ProgramStepperProps, "onStepAction" | "className" | "quoteStatus">): ProgramStep[] {
  const steps: ProgramStep[] = [];

  // Step 1: Lodging (only multi-day)
  if (isMultiDay) {
    const lodgingDone = accommodationStatus === "selected";
    steps.push({
      id: "lodging",
      number: 1,
      label: "Logies kiezen",
      sub: lodgingDone
        ? "Logies vastgelegd"
        : accommodationStatus === "requested"
          ? "Offertes worden verzameld"
          : "Aanvraag indienen",
      state: lodgingDone ? "done" : "active",
      actionLabel: lodgingDone ? "Bekijken" : accommodationStatus === "requested" ? "Offertes bekijken" : "Logies regelen",
    });
  }

  // Step 2: Providers confirm
  const providersDone =
    statusSummary.total > 0 &&
    statusSummary.pending === 0 &&
    statusSummary.alternative === 0 &&
    (statusSummary.counter_proposed || 0) === 0;
  const providersActive = !providersDone && statusSummary.total > 0;
  steps.push({
    id: "providers",
    number: steps.length + 1,
    label: "Aanbieders bevestigen",
    sub: providersDone
      ? "Alle onderdelen bevestigd"
      : statusSummary.alternative > 0
        ? `${statusSummary.alternative} alternatief — uw aandacht`
        : statusSummary.total === 0
          ? "Programma in voorbereiding"
          : `${statusSummary.confirmed} van ${statusSummary.total} bevestigd`,
    state: providersDone ? "done" : providersActive ? "active" : "upcoming",
  });

  // Step 3: Customer approves items
  const approveDone =
    customerApprovableCount > 0 && customerApprovedCount >= customerApprovableCount;
  const approveActive = providersDone && !approveDone;
  steps.push({
    id: "approve",
    number: steps.length + 1,
    label: "Onderdelen goedkeuren",
    sub: customerApprovableCount === 0
      ? "Nog geen onderdelen om goed te keuren"
      : approveDone
        ? "Alle onderdelen goedgekeurd"
        : `${customerApprovedCount} van ${customerApprovableCount} goedgekeurd`,
    state: approveDone ? "done" : approveActive ? "active" : "upcoming",
    actionLabel: approveActive ? "Beoordelen" : undefined,
  });

  // Step 4: Billing + terms (bundled)
  const billingTermsDone = billingComplete && termsAccepted;
  const billingTermsActive = approveDone && !billingTermsDone;
  steps.push({
    id: "billing_terms",
    number: steps.length + 1,
    label: "Gegevens & voorwaarden",
    sub: billingTermsDone
      ? "Klaar — wij gaan het regelen"
      : !billingComplete && !termsAccepted
        ? "Factuurgegevens & voorwaarden"
        : !billingComplete
          ? "Factuurgegevens aanleveren"
          : "Voorwaarden ondertekenen",
    state: billingTermsDone ? "done" : billingTermsActive ? "active" : "upcoming",
    actionLabel: billingTermsActive
      ? !billingComplete
        ? "Gegevens invullen"
        : "Ondertekenen"
      : undefined,
  });

  return steps;
}

const GlossaryTooltip = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Uitleg stappen"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs space-y-1.5 text-xs">
        <p>
          <strong>Bevestigd</strong> = de aanbieder heeft het onderdeel toegezegd.
        </p>
        <p>
          <strong>Goedgekeurd</strong> = u heeft het onderdeel akkoord bevonden.
        </p>
        <p>
          <strong>Ondertekend</strong> = u accepteert de algemene voorwaarden.
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const stepCircleClasses = (state: StepState) =>
  cn(
    "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
    state === "done" && "bg-primary border-primary text-primary-foreground",
    state === "active" && "bg-background border-primary text-primary ring-4 ring-primary/15",
    state === "upcoming" && "bg-background border-border text-muted-foreground",
  );

const miniDotClasses = (state: StepState) =>
  cn(
    "h-2.5 w-2.5 rounded-full transition-colors",
    state === "done" && "bg-primary",
    state === "active" && "bg-primary ring-2 ring-primary/25",
    state === "upcoming" && "bg-border",
  );

export const ProgramStepper = ({
  statusSummary,
  billingComplete,
  termsAccepted,
  isMultiDay,
  accommodationStatus,
  customerApprovedCount,
  customerApprovableCount,
  quoteStatus,
  onStepAction,
  className,
}: ProgramStepperProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const steps = getProgramSteps({
    statusSummary,
    billingComplete,
    termsAccepted,
    isMultiDay,
    accommodationStatus,
    customerApprovedCount,
    customerApprovableCount,
  });

  const activeIndex = steps.findIndex((s) => s.state === "active");
  const currentStep = activeIndex >= 0 ? steps[activeIndex] : steps[steps.length - 1];
  const allDone = steps.every((s) => s.state === "done");

  return (
    <div className={cn("bg-card border rounded-xl p-4 sm:p-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold">Voortgang</h3>
          <GlossaryTooltip />
        </div>
        <span className="text-xs text-muted-foreground">
          {allDone ? "Klaar" : `Stap ${currentStep.number} van ${steps.length}`}
        </span>
      </div>

      {/* DESKTOP / TABLET — horizontal stepper */}
      <div className="hidden sm:block">
        <div className="flex items-start">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[step.id];
            const isLast = i === steps.length - 1;
            return (
              <div key={step.id} className="flex-1 flex items-start min-w-0">
                {/* Circle + label column */}
                <div className="flex flex-col items-center text-center gap-2 min-w-0 px-1 flex-1">
                  <div className={stepCircleClasses(step.state)}>
                    {step.state === "done" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <p
                      className={cn(
                        "text-xs font-semibold leading-tight",
                        step.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {step.sub}
                    </p>
                  </div>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="flex-1 pt-[18px] px-1 min-w-[16px]">
                    <div
                      className={cn(
                        "h-0.5 rounded-full transition-colors",
                        steps[i + 1].state !== "upcoming" || step.state === "done"
                          ? "bg-primary"
                          : "bg-border",
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Active CTA row */}
        {!allDone && currentStep.actionLabel && onStepAction && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Nu aan u:</span> {currentStep.sub}
            </p>
            <Button size="sm" onClick={() => onStepAction(currentStep.id)}>
              {currentStep.actionLabel}
            </Button>
          </div>
        )}
        {allDone && (
          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span className="font-medium">Alles geregeld — wij gaan ermee aan de slag.</span>
          </div>
        )}
      </div>

      {/* MOBILE — compact pill + expandable detail */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full text-left"
          aria-expanded={mobileOpen}
        >
          <div className="flex items-center gap-2 mb-2">
            {steps.map((step) => (
              <div key={step.id} className={miniDotClasses(step.state)} />
            ))}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground ml-auto transition-transform",
                mobileOpen && "rotate-180",
              )}
            />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {allDone ? "Alles geregeld" : currentStep.label}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allDone ? "Wij gaan ermee aan de slag." : currentStep.sub}
          </p>
        </button>

        {/* CTA on mobile */}
        {!allDone && currentStep.actionLabel && onStepAction && (
          <Button
            size="sm"
            className="w-full mt-3"
            onClick={() => onStepAction(currentStep.id)}
          >
            {currentStep.actionLabel}
          </Button>
        )}

        {/* Expanded step list */}
        {mobileOpen && (
          <ol className="mt-4 pt-4 border-t space-y-3">
            {steps.map((step) => {
              const Icon = STEP_ICONS[step.id];
              return (
                <li key={step.id} className="flex items-start gap-3">
                  <div className={cn(stepCircleClasses(step.state), "h-7 w-7")}>
                    {step.state === "done" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium leading-tight",
                        step.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.sub}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
};
