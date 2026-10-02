import type { StepperStep } from "@/components/system";

/**
 * De drie stappen van het klantportaal (plan klantportaal, besluit 5): Logies
 * (alleen meerdaags), Programma en Akkoord. De eerste stap die nog niet rond
 * is licht op. Is alles rond, of is de aanvraag geannuleerd, dan is er geen
 * huidige stap en toont het portaal geen band.
 */
export type PortalStepKey = "lodging" | "program" | "accept";

export interface PortalStepsInput {
  isMultiDay: boolean;
  hasSelectedAccommodation: boolean;
  allConfirmed: boolean;
  isPostExecution: boolean;
  termsAccepted: boolean;
  isCancelled?: boolean;
}

export const buildPortalSteps = (
  input: PortalStepsInput,
): { steps: StepperStep[]; current: PortalStepKey | null } => {
  const steps: StepperStep[] = [
    ...(input.isMultiDay ? [{ key: "lodging", label: "Logies" }] : []),
    { key: "program", label: "Programma" },
    { key: "accept", label: "Akkoord" },
  ];
  const lodgingDone = !input.isMultiDay || input.hasSelectedAccommodation;
  const programDone = input.allConfirmed || input.isPostExecution;
  const current: PortalStepKey | null = input.isCancelled
    ? null
    : !lodgingDone
      ? "lodging"
      : !programDone
        ? "program"
        : !input.termsAccepted
          ? "accept"
          : null;
  return { steps, current };
};
