import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Container } from "./Container";
import { Stepper, type StepperStep } from "./Stepper";

/**
 * De stappenbalk onder een `FunnelHead`: volle breedte, lichte achtergrond,
 * een lijn eronder. Geef een `ref` mee om er bij een stapwissel naartoe te
 * scrollen (`useScrollOnStepChange`); `scroll-mt-20` houdt rekening met de
 * navigatiebalk.
 */
interface StepperBarProps {
  steps: StepperStep[];
  current: string;
  className?: string;
}

export const StepperBar = forwardRef<HTMLDivElement, StepperBarProps>(({ steps, current, className }, ref) => (
  <div ref={ref} className={cn("scroll-mt-20 border-b border-border bg-background", className)}>
    <Container size="content" className="py-4">
      <Stepper steps={steps} current={current} />
    </Container>
  </div>
));
StepperBar.displayName = "StepperBar";
