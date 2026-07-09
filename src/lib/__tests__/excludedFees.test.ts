/**
 * Contract voor `isFeeExcluded`. Klein oppervlak, maar wordt op elke
 * bureau_central factuurregel geraadpleegd — een null-safety regressie
 * zou 500's opleveren in de factuur-generator.
 */
import { describe, it, expect } from "vitest";
import { EXCLUDABLE_FEE_LABELS, isFeeExcluded } from "@/lib/excludedFees";

describe("isFeeExcluded", () => {
  it("true als key aanwezig is in de lijst", () => {
    expect(isFeeExcluded(["tourist_tax"], "tourist_tax")).toBe(true);
  });

  it("false als key niet aanwezig is", () => {
    expect(isFeeExcluded(["nature_contribution"], "tourist_tax")).toBe(false);
  });

  it("null/undefined/niet-array → false (geen crash)", () => {
    expect(isFeeExcluded(null, "tourist_tax")).toBe(false);
    expect(isFeeExcluded(undefined, "tourist_tax")).toBe(false);
    // deno-lint-ignore no-explicit-any
    expect(isFeeExcluded("tourist_tax" as any, "tourist_tax")).toBe(false);
  });

  it("elke ExcludableFeeKey heeft een NL label (voor UI)", () => {
    for (const key of ["tourist_tax", "nature_contribution", "central_surcharge", "coordination_fee"] as const) {
      expect(EXCLUDABLE_FEE_LABELS[key]).toBeTruthy();
    }
  });
});
