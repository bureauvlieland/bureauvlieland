import { describe, it, expect } from "vitest";
import { getCommissionRate, EXTRA_CATEGORY_LABELS } from "@/lib/commissionRates";

describe("commissionRates", () => {
  it("geen partner → default 10%", () => {
    expect(getCommissionRate(null, "activity")).toBe(10);
    expect(getCommissionRate(undefined, "lodging")).toBe(10);
  });

  it("activity gebruikt commission_percentage", () => {
    expect(getCommissionRate({ commission_percentage: 12 }, "activity")).toBe(12);
  });

  it("activity null valt terug op 10", () => {
    expect(getCommissionRate({ commission_percentage: null }, "activity")).toBe(10);
  });

  it("lodging gebruikt accommodation_commission_percentage", () => {
    expect(getCommissionRate({ accommodation_commission_percentage: 15 }, "lodging")).toBe(15);
  });

  it("lodging null valt terug op 10", () => {
    expect(getCommissionRate({ accommodation_commission_percentage: null }, "lodging")).toBe(10);
  });

  it("extras gebruikt extras_commission_percentage", () => {
    expect(getCommissionRate({ extras_commission_percentage: 0 }, "extras")).toBe(0);
  });

  it("extras valt terug op accommodation_commission_percentage", () => {
    expect(getCommissionRate({ accommodation_commission_percentage: 8 }, "extras")).toBe(8);
  });

  it("extras valt uiteindelijk terug op 10", () => {
    expect(getCommissionRate({}, "extras")).toBe(10);
  });

  it("EXTRA_CATEGORY_LABELS bevat verwachte categorieën", () => {
    expect(EXTRA_CATEGORY_LABELS.fb).toBe("F&B (eten & drinken)");
    expect(EXTRA_CATEGORY_LABELS.facilities).toBe("Faciliteiten");
    expect(EXTRA_CATEGORY_LABELS.transport).toBe("Transport");
    expect(EXTRA_CATEGORY_LABELS.other).toBe("Overig");
  });
});
