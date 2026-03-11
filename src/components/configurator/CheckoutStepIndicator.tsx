import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfigPhase = "basics" | "program" | "contact" | "success";

const STEPS: { key: ConfigPhase; label: string }[] = [
  { key: "basics", label: "Basisgegevens" },
  { key: "program", label: "Programma" },
  { key: "contact", label: "Gegevens" },
  { key: "success", label: "Versturen" },
];

const phaseIndex = (phase: ConfigPhase) =>
  STEPS.findIndex((s) => s.key === phase);

interface CheckoutStepIndicatorProps {
  currentStep: ConfigPhase;
}

export const CheckoutStepIndicator = ({ currentStep }: CheckoutStepIndicatorProps) => {
  const current = phaseIndex(currentStep);

  return (
    <div className="w-full bg-background border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
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
                {i < STEPS.length - 1 && (
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
