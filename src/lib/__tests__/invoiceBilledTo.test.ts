import { describe, expect, it } from "vitest";
import {
  defaultBilledToForProject,
  isBureauPayable,
  isCustomerBilled,
  isValidBilledTo,
  normalizeBilledTo,
} from "@/lib/invoiceBilledTo";

describe("invoiceBilledTo", () => {
  it("valt bij een lege of onbekende waarde terug op het bureau", () => {
    expect(normalizeBilledTo(undefined)).toBe("bureau");
    expect(normalizeBilledTo(null)).toBe("bureau");
    expect(normalizeBilledTo("gast")).toBe("bureau");
    expect(normalizeBilledTo("customer")).toBe("customer");
    expect(normalizeBilledTo("bureau")).toBe("bureau");
  });

  it("keurt alleen de twee bekende waarden goed", () => {
    expect(isValidBilledTo("bureau")).toBe(true);
    expect(isValidBilledTo("customer")).toBe(true);
    expect(isValidBilledTo("")).toBe(false);
    expect(isValidBilledTo("klant")).toBe(false);
    expect(isValidBilledTo(1)).toBe(false);
  });

  it("een factuur aan de gast is geen post voor het bureau", () => {
    expect(isCustomerBilled({ billed_to: "customer" })).toBe(true);
    expect(isCustomerBilled({ billed_to: "bureau" })).toBe(false);
    expect(isCustomerBilled({})).toBe(false);
    expect(isCustomerBilled(null)).toBe(false);
    expect(isBureauPayable({ billed_to: "customer" })).toBe(false);
    expect(isBureauPayable({ billed_to: "bureau" })).toBe(true);
    expect(isBureauPayable(undefined)).toBe(true);
  });

  it("vult de keuze vooraf in vanuit het project", () => {
    expect(defaultBilledToForProject(null, "item")).toBe("bureau");
    expect(defaultBilledToForProject({ invoicing_mode: "bureau_central" }, "item")).toBe("bureau");
    expect(defaultBilledToForProject({ invoicing_mode: "partner_direct" }, "item")).toBe("customer");
    expect(defaultBilledToForProject({ invoicing_mode: "partner_direct" }, "accommodation")).toBe("customer");
    // Logies van onze factuur gehaald: alleen voor logies relevant.
    expect(defaultBilledToForProject({ invoicing_mode: "bureau_central", excluded_fees: ["accommodation"] }, "accommodation")).toBe("customer");
    expect(defaultBilledToForProject({ invoicing_mode: "bureau_central", excluded_fees: ["accommodation"] }, "item")).toBe("bureau");
    expect(defaultBilledToForProject({ invoicing_mode: "bureau_central", excluded_fees: ["tourist_tax"] }, "accommodation")).toBe("bureau");
  });
});
