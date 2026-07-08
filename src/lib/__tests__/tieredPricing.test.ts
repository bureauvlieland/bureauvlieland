import { describe, it, expect } from "vitest";
import {
  getTieredConfig,
  isTieredBlock,
  resolveTier,
  calculateTieredTotal,
  formatTieredFromLabel,
  parseTiersFromText,
  validateTiers,
} from "@/lib/tieredPricing";

describe("tieredPricing", () => {
  const block = (tiers: any[], above: any = "highest") => ({
    price_type: "tiered_total" as const,
    price_extras: { tiers, tiers_above_max: above },
  });

  it("getTieredConfig filtert en sorteert tiers", () => {
    const cfg = getTieredConfig(block(
      [
        { min_people: 20, max_people: 40, price: 900 },
        { min_people: 1, max_people: 19, price: 500 },
        { min_people: 41, max_people: 60, price: 1200, extra: "ignored" },
      ],
    ));
    expect(cfg.tiers.length).toBe(3);
    expect(cfg.tiers[0].min_people).toBe(1);
    expect(cfg.tiers[1].min_people).toBe(20);
    expect(cfg.tiers[2].min_people).toBe(41);
  });

  it("isTieredBlock true alleen met tiers", () => {
    expect(isTieredBlock({ price_type: "tiered_total" as const, price_extras: { tiers: [{ min_people: 1, max_people: 10, price: 100 }] } }))
      .toBe(true);
    expect(isTieredBlock({ price_type: "tiered_total" as const, price_extras: {} })).toBe(false);
    expect(isTieredBlock({ price_type: "per_person" as const, price_extras: { tiers: [{ min_people: 1, max_people: 10, price: 100 }] } }))
      .toBe(false);
  });

  it("resolveTier binnen range", () => {
    const tiers = [
      { min_people: 1, max_people: 10, price: 100 },
      { min_people: 11, max_people: 20, price: 200 },
    ];
    expect(resolveTier(tiers, 5)).toEqual(tiers[0]);
    expect(resolveTier(tiers, 15)).toEqual(tiers[1]);
  });

  it("resolveTier onder eerste tier valt terug op eerste", () => {
    const tiers = [{ min_people: 5, max_people: 10, price: 100 }];
    expect(resolveTier(tiers, 2)).toEqual(tiers[0]);
  });

  it("resolveTier boven laatste tier geeft null", () => {
    const tiers = [{ min_people: 1, max_people: 10, price: 100 }];
    expect(resolveTier(tiers, 15)).toBeNull();
  });

  it("calculateTieredTotal match", () => {
    const b = block([
      { min_people: 1, max_people: 10, price: 500 },
      { min_people: 11, max_people: 20, price: 900 },
    ]);
    expect(calculateTieredTotal(b, 8)).toBe(500);
    expect(calculateTieredTotal(b, 15)).toBe(900);
  });

  it("calculateTieredTotal above max on_request = null", () => {
    const b = block([{ min_people: 1, max_people: 10, price: 500 }], "on_request");
    expect(calculateTieredTotal(b, 15)).toBeNull();
  });

  it("calculateTieredTotal above max highest = hoogste prijs", () => {
    const b = block([{ min_people: 1, max_people: 10, price: 500 }], "highest");
    expect(calculateTieredTotal(b, 15)).toBe(500);
  });

  it("formatTieredFromLabel", () => {
    const b = block([
      { min_people: 1, max_people: 10, price: 750 },
      { min_people: 11, max_people: 20, price: 900 },
    ]);
    expect(formatTieredFromLabel(b)).toBe("vanaf € 750");
  });

  it("parseTiersFromText", () => {
    const text = "0-29  750\n30-60 €1.200\n61-100 1500";
    const tiers = parseTiersFromText(text);
    expect(tiers).toEqual([
      { min_people: 0, max_people: 29, price: 750 },
      { min_people: 30, max_people: 60, price: 1200 },
      { min_people: 61, max_people: 100, price: 1500 },
    ]);
  });

  it("validateTiers: leeg", () => {
    expect(validateTiers([])).toBe("Voeg minimaal één staffel toe.");
  });

  it("validateTiers: max < min", () => {
    expect(validateTiers([{ min_people: 10, max_people: 5, price: 100 }])).toContain("t/m moet ≥ vanaf");
  });

  it("validateTiers: negatieve prijs", () => {
    expect(validateTiers([{ min_people: 1, max_people: 10, price: -1 }])).toContain("prijs moet ≥ 0");
  });

  it("validateTiers: overlap", () => {
    expect(validateTiers([
      { min_people: 1, max_people: 10, price: 100 },
      { min_people: 5, max_people: 15, price: 200 },
    ])).toContain("overlap");
  });

  it("validateTiers: geldig", () => {
    expect(validateTiers([
      { min_people: 1, max_people: 10, price: 100 },
      { min_people: 11, max_people: 20, price: 200 },
    ])).toBeNull();
  });
});
