import { describe, it, expect } from "vitest";
import { computeQuoteLineTotals, computeCommission, isValidLine } from "../customQuoteLines";

describe("computeQuoteLineTotals", () => {
  it("returns zeros for empty input", () => {
    expect(computeQuoteLineTotals([])).toEqual({
      incl_vat: 0,
      excl_vat: 0,
      vat_amount: 0,
      by_vat_rate: {},
    });
  });

  it("computes 21% BTW correctly (single line)", () => {
    const t = computeQuoteLineTotals([
      { description: "Champagne", quantity: 20, unit_price_incl_vat: 12.1, vat_rate: 21 },
    ]);
    // 20 * 12.10 = 242 incl / 1.21 = 200 excl
    expect(t.incl_vat).toBe(242);
    expect(t.excl_vat).toBe(200);
    expect(t.vat_amount).toBe(42);
    expect(t.by_vat_rate["21"].excl_vat).toBe(200);
  });

  it("splits mixed VAT rates correctly", () => {
    const t = computeQuoteLineTotals([
      { description: "Broodjes", quantity: 20, unit_price_incl_vat: 5.45, vat_rate: 9 }, // 109
      { description: "Bediening", quantity: 4, unit_price_incl_vat: 60.5, vat_rate: 21 }, // 242
      { description: "Toeristenbelasting", quantity: 20, unit_price_incl_vat: 2.58, vat_rate: 0 }, // 51.6
    ]);
    expect(t.incl_vat).toBeCloseTo(402.6, 2);
    expect(t.by_vat_rate["9"].incl_vat).toBe(109);
    expect(t.by_vat_rate["21"].incl_vat).toBe(242);
    expect(t.by_vat_rate["0"].incl_vat).toBe(51.6);
    expect(t.by_vat_rate["0"].vat).toBe(0);
  });

  it("guards against negative and invalid input", () => {
    const t = computeQuoteLineTotals([
      { description: "x", quantity: -5, unit_price_incl_vat: 100, vat_rate: 21 },
      { description: "y", quantity: 1, unit_price_incl_vat: Number.NaN, vat_rate: 21 },
      { description: "z", quantity: 2, unit_price_incl_vat: 121, vat_rate: 21 }, // 242 incl
    ]);
    expect(t.incl_vat).toBe(242);
    expect(t.excl_vat).toBe(200);
  });
});

describe("computeCommission", () => {
  it("is 10% of ex-BTW total", () => {
    const lines = [
      { description: "a", quantity: 1, unit_price_incl_vat: 121, vat_rate: 21 },
      { description: "b", quantity: 1, unit_price_incl_vat: 109, vat_rate: 9 },
    ];
    // excl: 100 + 100 = 200 -> 10% = 20
    expect(computeCommission(lines)).toBe(20);
  });

  it("uses configurable percentage", () => {
    const lines = [{ description: "a", quantity: 1, unit_price_incl_vat: 121, vat_rate: 21 }];
    expect(computeCommission(lines, 15)).toBe(15);
  });
});

describe("isValidLine", () => {
  it("rejects empty description", () => {
    expect(isValidLine({ description: "  ", quantity: 1, unit_price_incl_vat: 1, vat_rate: 21 })).toBe(false);
  });
  it("rejects zero quantity", () => {
    expect(isValidLine({ description: "x", quantity: 0, unit_price_incl_vat: 1, vat_rate: 21 })).toBe(false);
  });
  it("accepts a well-formed line", () => {
    expect(isValidLine({ description: "x", quantity: 1, unit_price_incl_vat: 121, vat_rate: 21 })).toBe(true);
  });
});
