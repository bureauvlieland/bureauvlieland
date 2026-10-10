import { describe, expect, it } from "vitest";
import { currentPortalStep, nextPortalStep, portalSteps, type PortalStepInput } from "@/lib/customerPortalSteps";

const base: PortalStepInput = {
  isMultiDay: true,
  hasSelectedAccommodation: false,
  programDone: false,
  termsAccepted: false,
  billingComplete: false,
};

describe("stappen", () => {
  it("een eendaags programma heeft geen logiesstap", () => {
    expect(portalSteps(false).map((s) => s.key)).toEqual(["program", "accept"]);
    expect(portalSteps(true).map((s) => s.key)).toEqual(["lodging", "program", "accept"]);
    expect(currentPortalStep({ ...base, isMultiDay: false })).toBe("program");
  });

  it("de eerste stap die niet rond is licht op; alles rond of geannuleerd is niets", () => {
    expect(currentPortalStep(base)).toBe("lodging");
    expect(currentPortalStep({ ...base, hasSelectedAccommodation: true })).toBe("program");
    expect(currentPortalStep({ ...base, hasSelectedAccommodation: true, programDone: true })).toBe("accept");
    expect(currentPortalStep({ ...base, hasSelectedAccommodation: true, programDone: true, termsAccepted: true })).toBeNull();
    expect(currentPortalStep({ ...base, isCancelled: true })).toBeNull();
  });
});

describe("volgende stap", () => {
  it("logies: kiezen als er offertes zijn, anders wachten", () => {
    expect(nextPortalStep({ ...base, hasQuotesToChoose: true })).toMatchObject({ buttonLabel: "Logies kiezen", target: "accommodation", tone: "warning" });
    expect(nextPortalStep(base)).toMatchObject({ buttonLabel: "Logies bekijken", tone: "info" });
  });

  it("programma: beoordelen als er iets op de klant wacht, anders wachten op de aanbieders", () => {
    const atProgram = { ...base, hasSelectedAccommodation: true };
    expect(nextPortalStep({ ...atProgram, customerActionsCount: 2 })).toMatchObject({ title: "2 onderdelen wachten op uw goedkeuring", target: "program", tone: "warning" });
    expect(nextPortalStep({ ...atProgram, customerActionsCount: 1 })?.title).toBe("Eén onderdeel wacht op uw goedkeuring");
    expect(nextPortalStep(atProgram)).toMatchObject({ buttonLabel: "Programma bekijken", tone: "info" });
  });

  it("akkoord: eerst facturatiegegevens, dan ondertekenen; daarna niets meer", () => {
    const atAccept = { ...base, hasSelectedAccommodation: true, programDone: true };
    expect(nextPortalStep(atAccept)).toMatchObject({ target: "billing", buttonLabel: "Facturatiegegevens invullen" });
    expect(nextPortalStep({ ...atAccept, billingComplete: true })).toMatchObject({ target: "accept", buttonLabel: "Voorwaarden ondertekenen" });
    expect(nextPortalStep({ ...atAccept, billingComplete: true, termsAccepted: true })).toBeNull();
  });
});
