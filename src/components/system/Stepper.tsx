import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Eén stapindicator voor alle wizards (ontwerpsysteem fase 2). Op een
 * telefoon één regel met een voortgangsbalk, vanaf `sm` genummerde cirkels
 * met labels. Merkblauw, niet de actiekleur: de stappen zijn geen knop.
 */
export interface StepperStep {
  key: string;
  label: string;
}

interface StepperProps {
  steps: StepperStep[];
  current: string;
  className?: string;
}

export const Stepper = ({ steps, current, className }: StepperProps) => {
  const index = Math.max(
    0,
    steps.findIndex((s) => s.key === current),
  );
  const total = steps.length;
  const active = steps[index];

  return (
    <nav aria-label="Stappen" className={cn("w-full", className)}>
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">{active?.label}</span>
          <span className="shrink-0 text-muted-foreground">
            Stap {index + 1} van {total}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          aria-valuetext={`Stap ${index + 1} van ${total}: ${active?.label ?? ""}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-base ease-standard"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <ol className="hidden items-start sm:flex">
        {steps.map((step, i) => {
          const done = i < index;
          const isActive = i === index;
          return (
            <li
              key={step.key}
              className={cn("flex items-start", i < total - 1 && "flex-1")}
              aria-current={isActive ? "step" : undefined}
            >
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-base",
                    done && "bg-primary/15 text-primary",
                    isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !done && !isActive && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-xs font-medium",
                    isActive ? "text-primary" : done ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < total - 1 && (
                <div
                  className={cn("mx-3 mt-[15px] h-0.5 flex-1 rounded-full", done ? "bg-primary" : "bg-border")}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
