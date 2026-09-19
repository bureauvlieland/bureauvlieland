/**
 * Stappen van de programma-wizard. Bewust puur (geen React) zodat de
 * volgorde per situatie getest kan worden.
 */
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
    steps.push({ key: "transport", label: "Vervoer en fietsen" });
  } else {
    steps.push({ key: "transport", label: "Startpunt en fietsen" });
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

