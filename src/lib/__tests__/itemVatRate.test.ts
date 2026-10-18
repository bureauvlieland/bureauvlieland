import { describe, it, expect } from "vitest";
import { resolveItemVatRate } from "@/lib/itemVatRate";

const blocks = { wadlopen: 9, borrel: 21 };

describe("btw-tarief van een onderdeel", () => {
  it("neemt het tarief van de bouwsteen", () => {
    expect(resolveItemVatRate({ block_id: "wadlopen", vat_rate: 21 }, blocks)).toBe(9);
  });

  it("gebruikt het eigen tarief van een post zonder bouwsteen", () => {
    expect(resolveItemVatRate({ block_id: null, vat_rate: 9 }, blocks)).toBe(9);
    expect(resolveItemVatRate({ block_id: null, vat_rate: 0 }, blocks)).toBe(0);
  });

  it("valt terug op het standaardtarief als niets bekend is", () => {
    expect(resolveItemVatRate({ block_id: null, vat_rate: null }, blocks)).toBe(21);
    expect(resolveItemVatRate({ block_id: "onbekend" }, blocks, 9)).toBe(9);
  });
});
