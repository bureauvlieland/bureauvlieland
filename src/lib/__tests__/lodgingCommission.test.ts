import { describe, it, expect } from "vitest";
import {
  DEFAULT_LODGING_VAT_RATE,
  amountExclVat,
  calculateLodgingCommission,
} from "@/lib/lodgingCommission";

/**
 * De eindfactuur van de partner is de grondslag en moet 1-op-1 kloppen.
 * `apply-purchase-invoice-to-lodging` zet die factuur op de offerte: kamerregels
 * worden de kamerprijs, extra-regels worden extra's met eigen btw-tarief en eigen
 * commissiepercentage, toeristenbelasting wordt weggelaten.
 */
describe("grondslag ex btw", () => {
  it("rekent F&B terug tegen 21 %, niet tegen het kamertarief", () => {
    const excl = amountExclVat({ amount: 2000, vatRate: 21 });
    expect(excl).toBeCloseTo(1652.89, 2);
    // Tegen het kamertarief van 9 % kwam hier € 1.834,86 uit: € 182 te hoog.
    expect(2000 / 1.09 - excl).toBeCloseTo(181.97, 2);
  });

  it("valt zonder eigen tarief terug op 9 %", () => {
    expect(DEFAULT_LODGING_VAT_RATE).toBe(9);
    expect(amountExclVat({ amount: 109, vatRate: null })).toBeCloseTo(100, 6);
  });

  it("een leeg 'prijs is inclusief btw' geldt als inclusief, conform de databasedefault", () => {
    expect(amountExclVat({ amount: 109, vatRate: 9, priceIncludesVat: null })).toBeCloseTo(100, 6);
  });

  it("alleen een expliciete false betekent 'al ex btw'", () => {
    expect(amountExclVat({ amount: 109, vatRate: 9, priceIncludesVat: false })).toBe(109);
  });

  it("levert 0 bij ontbrekende bedragen in plaats van NaN", () => {
    expect(amountExclVat({ amount: null })).toBe(0);
    expect(amountExclVat({ amount: undefined, vatRate: 21 })).toBe(0);
  });
});

describe("commissie per component", () => {
  it("rekent kamer en extra's elk tegen hun eigen tarief en percentage", () => {
    // Badhotel Bruin: 10 % over de kamer, 0 % over extra's.
    const result = calculateLodgingCommission({
      room: { amount: 5450, vatRate: 9, label: "Overnachtingen" },
      extras: [{ amount: 2000, vatRate: 21, commissionPercentage: 0, label: "Diner" }],
      lodgingRate: 10,
      extrasRate: 0,
    });

    expect(result.components).toHaveLength(2);
    expect(result.components[0]).toMatchObject({
      kind: "room",
      baseExclVat: 5000,
      commissionPct: 10,
      commissionAmount: 500,
    });
    expect(result.components[1]).toMatchObject({
      kind: "extra",
      baseExclVat: 1652.89,
      commissionPct: 0,
      commissionAmount: 0,
    });
    expect(result.commissionAmount).toBe(500);
    expect(result.hasMixedRates).toBe(true);
  });

  it("valt terug op het extra's-percentage van de partner als de extra er geen heeft", () => {
    const result = calculateLodgingCommission({
      room: { amount: 1090, vatRate: 9 },
      extras: [{ amount: 121, vatRate: 21, commissionPercentage: null }],
      lodgingRate: 10,
      extrasRate: 5,
    });
    expect(result.components[1].commissionPct).toBe(5);
    expect(result.components[1].commissionAmount).toBe(5);
  });

  it("een percentage van 0 op de extra blijft 0 en wordt geen terugval", () => {
    const result = calculateLodgingCommission({
      room: { amount: 1090, vatRate: 9 },
      extras: [{ amount: 121, vatRate: 21, commissionPercentage: 0 }],
      lodgingRate: 10,
      extrasRate: 10,
    });
    expect(result.components[1].commissionAmount).toBe(0);
    expect(result.commissionAmount).toBe(100);
  });

  it("de totale commissie is de som van de afgeronde componenten", () => {
    const result = calculateLodgingCommission({
      room: { amount: 134.55, vatRate: 9 },
      extras: [
        { amount: 74.29, vatRate: 21 },
        { amount: 55.66, vatRate: 21 },
      ],
      lodgingRate: 10,
      extrasRate: 10,
    });
    const sum = result.components.reduce((s, c) => s + c.commissionAmount, 0);
    expect(result.commissionAmount).toBeCloseTo(sum, 10);
  });

  it("meldt één tarief als kamer en extra's gelijk lopen", () => {
    const result = calculateLodgingCommission({
      room: { amount: 1090, vatRate: 9 },
      extras: [{ amount: 121, vatRate: 21 }],
      lodgingRate: 10,
      extrasRate: 10,
    });
    expect(result.hasMixedRates).toBe(false);
    expect(result.effectivePct).toBe(10);
  });

  it("een offerte zonder extra's levert één component", () => {
    const result = calculateLodgingCommission({
      room: { amount: 1090, vatRate: 9 },
      lodgingRate: 10,
      extrasRate: 0,
    });
    expect(result.components).toHaveLength(1);
    expect(result.commissionAmount).toBe(100);
    expect(result.hasMixedRates).toBe(false);
  });

  it("een lege offerte is nul, niet NaN", () => {
    const result = calculateLodgingCommission({
      room: { amount: 0 },
      extras: [],
      lodgingRate: 10,
      extrasRate: 10,
    });
    expect(result).toMatchObject({ baseExclVat: 0, commissionAmount: 0, effectivePct: 0 });
  });
});
