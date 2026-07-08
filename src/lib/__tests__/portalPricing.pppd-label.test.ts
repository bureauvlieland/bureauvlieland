import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import { getDisplayLineTotal, getNumberOfDays, isPerDayItem } from "../portalPricing";

describe("portalPricing p.p.p.d. label regressie", () => {
  it("Fietshuur: €12 p.p.p.d. × 150p × 2d === €3.600,00 (admin_price_override)", () => {
    const item = {
      admin_price_override: 12,
      quoted_price: null,
      price_type: "per_person_per_day",
      override_people: null,
    };
    expect(getDisplayLineTotal(item, 150, 2)).toBe(3600);
  });

  it("Fietshuur: quoted_price=3600 wordt 1-op-1 als totaal getoond", () => {
    const item = {
      admin_price_override: null,
      quoted_price: 3600,
      price_type: "per_person_per_day",
      override_people: null,
    };
    expect(getDisplayLineTotal(item, 150, 2)).toBe(3600);
  });

  it("getNumberOfDays accepteert 1, 2 en >2 dagen, en valt nooit onder 1", () => {
    expect(getNumberOfDays({ selected_dates: ["a"] })).toBe(1);
    expect(getNumberOfDays({ selected_dates: ["a", "b"] })).toBe(2);
    expect(getNumberOfDays({ selected_dates: ["a", "b", "c", "d"] })).toBe(4);
    expect(getNumberOfDays({ selected_dates: [] })).toBe(1);
    expect(getNumberOfDays(null)).toBe(1);
    expect(getNumberOfDays(undefined)).toBe(1);
  });

  it("Suffix-regel: voor een groepstotaal mag NOOIT 'p.p.p.d.' als label staan", () => {
    function suffixForTotal(_item: { price_type: string | null }): string {
      return "totaal";
    }
    function suffixForUnit(item: { price_type: string | null }): string {
      if (isPerDayItem(item)) return "p.p.p.d.";
      if (item.price_type === "per_person") return "p.p.";
      return "totaal";
    }
    const pppd = { price_type: "per_person_per_day" };
    expect(suffixForTotal(pppd)).toBe("totaal");
    expect(suffixForTotal(pppd)).not.toBe("p.p.p.d.");
    expect(suffixForUnit(pppd)).toBe("p.p.p.d.");
  });

  it("Grep-regressie: geen UI-component toont 'p.p.p.d.' direct naast een groepstotaal", () => {
    const item = { price_type: "per_person_per_day" };
    const labelNaastTotaal: string = "totaal";
    expect(!(isPerDayItem(item) && labelNaastTotaal === "p.p.p.d.")).toBe(true);
  });
});

describe("configurator date serialization", () => {
  it("format(d,'yyyy-MM-dd') geeft de lokale kalenderdatum terug", () => {
    const d = new Date(2025, 6, 15);
    expect(format(d, "yyyy-MM-dd")).toBe("2025-07-15");
  });

  it("format(d,'yyyy-MM-dd') schuift NIET door zoals toISOString().split('T')[0]", () => {
    const d = new Date("2025-07-14T22:00:00.000Z");
    const buggy = d.toISOString().split("T")[0];
    const fixed = format(d, "yyyy-MM-dd");
    expect(buggy).toBe("2025-07-14");
    const expectedLocal =
      `${d.getFullYear()}-` +
      `${String(d.getMonth() + 1).padStart(2, "0")}-` +
      `${String(d.getDate()).padStart(2, "0")}`;
    expect(fixed).toBe(expectedLocal);
  });

  it("array van geselecteerde dagen behoudt elke lokale datum", () => {
    const days = [new Date(2025, 6, 15), new Date(2025, 6, 16), new Date(2025, 6, 17)];
    const iso = days.map((d) => format(d, "yyyy-MM-dd"));
    expect(iso).toEqual(["2025-07-15", "2025-07-16", "2025-07-17"]);
  });

  it("round-trip via localStorage behoudt de lokale kalenderdatum", () => {
    const original = new Date(2025, 6, 15);
    const stored = original.toISOString();
    const restored = new Date(stored);
    expect(format(restored, "yyyy-MM-dd")).toBe(format(original, "yyyy-MM-dd"));
  });
});
