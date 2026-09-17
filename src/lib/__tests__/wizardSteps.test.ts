import { describe, it, expect } from "vitest";
import { wizardStepsFor, nextWizardPhase, previousWizardPhase } from "@/lib/wizardSteps";

describe("wizardStepsFor", () => {
  it("vanaf de wal, één dag: geen logies, wel vervoer", () => {
    expect(wizardStepsFor({ situation: "vanaf_wal", numberOfDays: 1 }).map((s) => s.key)).toEqual([
      "basics", "template", "transport", "program", "contact", "success",
    ]);
  });

  it("vanaf de wal, meerdaags: logies vóór vervoer", () => {
    expect(wizardStepsFor({ situation: "vanaf_wal", numberOfDays: 3 }).map((s) => s.key)).toEqual([
      "basics", "template", "accommodation", "transport", "program", "contact", "success",
    ]);
  });

  it("al op Vlieland: geen logies, stap heet Startpunt & fietsen", () => {
    const steps = wizardStepsFor({ situation: "op_vlieland", numberOfDays: 3 });
    expect(steps.map((s) => s.key)).toEqual(["basics", "template", "transport", "program", "contact", "success"]);
    expect(steps.find((s) => s.key === "transport")?.label).toBe("Startpunt & fietsen");
  });

  it("navigeert vooruit en terug langs de lijst", () => {
    const steps = wizardStepsFor({ situation: "vanaf_wal", numberOfDays: 2 });
    expect(nextWizardPhase(steps, "template")).toBe("accommodation");
    expect(previousWizardPhase(steps, "transport")).toBe("accommodation");
    expect(nextWizardPhase(steps, "success")).toBeNull();
    expect(previousWizardPhase(steps, "basics")).toBeNull();
  });
});
