import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroupSituation } from "@/lib/programWizardCart";

export type ConfigPhase =
  | "basics"
  | "template"
  | "accommodation"
  | "transport"
  | "program"
  | "contact"
  | "success";

export interface WizardStep {
  key: ConfigPhase;
  label: string;
}

/**
 * Welke stappen de wizard toont hangt af van de situatie van de groep.
 * "Al op Vlieland": geen logies, geen overtocht — wel een startpunt en fietsen.
 * "Vanaf de wal": logies alleen bij meer dan één dag.
 */
export const wizardStepsFor = ({
  situation,
  numberOfDays,
}: {
  situation: GroupSituation;
  numberOfDays: number;
}): WizardStep[] => {
  const steps: WizardStep[] = [
    { key: "basics", label: "Basisgegevens" },
    { key: "template", label: "Voorbeeld" },
  ];
  if (situation === "vanaf_wal") {
    if (numberOfDays > 1) steps.push({ key: "accommodation", label: "Logies" });
    steps.push({ key: "transport", label: "Vervoer & fietsen" });
  } else {
    steps.push({ key: "transport", label: "Startpunt & fietsen" });
  }
  steps.push(
    { key: "program", label: "Programma" },
    { key: "contact", label: "Gegevens" },
    { key: "success", label: "Versturen" },
  );
  return steps;
};

/** De stap ná `current` in deze volgorde, of null aan het einde. */
export const nextWizardPhase = (steps: WizardStep[], current: ConfigPhase): ConfigPhase | null => {
  const i = steps.findIndex((s) => s.key === current);
  return i >= 0 && i < steps.length - 1 ? steps[i + 1].key : null;
};

/** De stap vóór `current`, of null aan het begin. */
export const previousWizardPhase = (steps: WizardStep[], current: ConfigPhase): ConfigPhase | null => {
  const i = steps.findIndex((s) => s.key === current);
  return i > 0 ? steps[i - 1].key : null;
};

interface CheckoutStepIndicatorProps {
  currentStep: ConfigPhase;
  steps: WizardStep[];
}

export const CheckoutStepIndicator = ({ currentStep, steps }: CheckoutStepIndicatorProps) => {
  const current = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="w-full bg-background border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-4">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => {
            const isDone = i < current;
            const isActive = i === current;

            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors shrink-0",
                      isDone && "bg-primary text-primary-foreground",
                      isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                      !isDone && !isActive && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium hidden sm:block whitespace-nowrap",
                      isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-4">
                    <div
                      className={cn(
                        "h-0.5 rounded-full transition-colors",
                        i < current ? "bg-primary" : "bg-border"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
