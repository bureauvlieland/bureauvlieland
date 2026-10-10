/**
 * De drie stappen van het klantportaal (Logies, Programma, Akkoord) en de
 * volgende stap met een werkende knop (plan klantportaal, fase 2 en 3):
 * één bron voor de `Stepper`-band op elk tabblad en voor het Overzicht.
 */
import type { StepperStep } from "@/components/system";

export type PortalStepKey = "lodging" | "program" | "accept";

/** Het tabblad waar de knop van de volgende stap naartoe gaat. */
export type PortalStepTarget = "accommodation" | "program" | "billing" | "accept";

export interface PortalStepInput {
  isMultiDay: boolean;
  hasSelectedAccommodation: boolean;
  /** Alle onderdelen bevestigd (of het programma is uitgevoerd). */
  programDone: boolean;
  termsAccepted: boolean;
  billingComplete: boolean;
  isCancelled?: boolean;
  /** Er staan logiesoffertes klaar om uit te kiezen. */
  hasQuotesToChoose?: boolean;
  /** Aantal onderdelen dat op de klant wacht. */
  customerActionsCount?: number;
}

export function portalSteps(isMultiDay: boolean): StepperStep[] {
  return [
    ...(isMultiDay ? [{ key: "lodging", label: "Logies" }] : []),
    { key: "program", label: "Programma" },
    { key: "accept", label: "Akkoord" },
  ];
}

/** De eerste stap die nog niet rond is; null als alles rond is of het programma is geannuleerd. */
export function currentPortalStep(input: PortalStepInput): PortalStepKey | null {
  if (input.isCancelled) return null;
  const lodgingDone = !input.isMultiDay || input.hasSelectedAccommodation;
  if (!lodgingDone) return "lodging";
  if (!input.programDone) return "program";
  if (!input.termsAccepted) return "accept";
  return null;
}

export interface NextStep {
  step: PortalStepKey;
  title: string;
  text: string;
  buttonLabel: string;
  target: PortalStepTarget;
  /** warning = de klant is aan zet, info = de klant wacht op een ander. */
  tone: "warning" | "info";
}

/** Wat er nu van de klant wordt verwacht, in één melding met één knop. */
export function nextPortalStep(input: PortalStepInput): NextStep | null {
  const step = currentPortalStep(input);
  if (!step) return null;
  switch (step) {
    case "lodging":
      return input.hasQuotesToChoose
        ? {
            step,
            title: "Kies uw logies",
            text: "Er staan logiesoffertes voor u klaar. Vergelijk ze en kies waar u slaapt.",
            buttonLabel: "Logies kiezen",
            target: "accommodation",
            tone: "warning",
          }
        : {
            step,
            title: "Logies",
            text: "Wij verzamelen logiesoffertes voor u. U hoort het zodra ze binnen zijn.",
            buttonLabel: "Logies bekijken",
            target: "accommodation",
            tone: "info",
          };
    case "program": {
      const open = input.customerActionsCount ?? 0;
      return open > 0
        ? {
            step,
            title: open === 1 ? "Eén onderdeel wacht op uw goedkeuring" : `${open} onderdelen wachten op uw goedkeuring`,
            text: "Bekijk het programma en keur de onderdelen goed, of stel een andere tijd voor.",
            buttonLabel: "Programma beoordelen",
            target: "program",
            tone: "warning",
          }
        : {
            step,
            title: "Programma",
            text: "De aanbieders bevestigen de onderdelen. U hoeft nu niets te doen.",
            buttonLabel: "Programma bekijken",
            target: "program",
            tone: "info",
          };
    }
    case "accept":
      return input.billingComplete
        ? {
            step,
            title: "Onderteken de voorwaarden",
            text: "Alles is bevestigd. Met uw handtekening wordt de boeking definitief.",
            buttonLabel: "Voorwaarden ondertekenen",
            target: "accept",
            tone: "warning",
          }
        : {
            step,
            title: "Vul uw facturatiegegevens in",
            text: "Alles is bevestigd. Vul eerst in aan wie de factuur gericht is, daarna kunt u ondertekenen.",
            buttonLabel: "Facturatiegegevens invullen",
            target: "billing",
            tone: "warning",
          };
  }
}
