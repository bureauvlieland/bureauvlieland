import { describe, it, expect } from "vitest";
import {
  DEFAULT_LODGING_VAT_RATE,
  lodgingAmountExclVat,
} from "../../../supabase/functions/_shared/commissionReconciliationData";

/**
 * K2 uit de doorlichting: de commissiegrondslag telde alle logies-extra's bij de
 * kamerprijs op en rekende dat totaal terug tegen het btw-tarief van de kámer.
 * F&B staat doorgaans op 21 % en de kamer op 9 %, dus de grondslag kwam te hoog uit.
 */
describe("grondslag van logies-extra's", () => {
  it("rekent F&B terug tegen 21 %, niet tegen het kamertarief", () => {
    // Het voorbeeld uit de doorlichting: € 2.000 F&B incl. 21 % btw.
    const excl = lodgingAmountExclVat({
      unit_price: 2000,
      pricing_type: "fixed",
      vat_rate: 21,
      price_includes_vat: true,
    });
    expect(excl).toBeCloseTo(1652.89, 2);

    // Wat er vóór deze reparatie uitkwam, tegen het kamertarief van 9 %:
    expect(2000 / 1.09).toBeCloseTo(1834.86, 2);
    // Verschil in commissie bij 10 %: ruim € 18 te veel.
    expect((2000 / 1.09 - excl) * 0.1).toBeCloseTo(18.2, 1);
  });

  it("vermenigvuldigt per persoon met het aantal", () => {
    const excl = lodgingAmountExclVat({
      unit_price: 24.2,
      quantity: 10,
      pricing_type: "per_person",
      vat_rate: 21,
      price_includes_vat: true,
    });
    expect(excl).toBeCloseTo(200, 6);
  });

  it("neemt een prijs die al ex btw is ongewijzigd over", () => {
    const excl = lodgingAmountExclVat({
      unit_price: 500,
      pricing_type: "fixed",
      vat_rate: 21,
      price_includes_vat: false,
    });
    expect(excl).toBe(500);
  });

  it("valt zonder eigen tarief terug op 9 %", () => {
    expect(DEFAULT_LODGING_VAT_RATE).toBe(9);
    const excl = lodgingAmountExclVat({
      unit_price: 109,
      pricing_type: "fixed",
      vat_rate: null,
      price_includes_vat: true,
    });
    expect(excl).toBeCloseTo(100, 6);
  });

  it("levert 0 bij ontbrekende bedragen in plaats van NaN", () => {
    expect(lodgingAmountExclVat({})).toBe(0);
    expect(lodgingAmountExclVat({ unit_price: null, quantity: null })).toBe(0);
    expect(lodgingAmountExclVat({ unit_price: 50, pricing_type: "per_person" })).toBe(0);
  });
});

describe("kamerprijs en extra's hanteren dezelfde regel", () => {
  it("een leeg 'prijs is inclusief btw' geldt als inclusief, conform de databasedefault", () => {
    // Bij een lege waarde werd de kamerprijs eerder als ex btw behandeld,
    // waardoor de commissiegrondslag op oude offertes te hoog uitkwam.
    const excl = lodgingAmountExclVat({
      unit_price: 1090,
      pricing_type: "fixed",
      vat_rate: 9,
      price_includes_vat: null,
    });
    expect(excl).toBeCloseTo(1000, 6);
  });

  it("alleen een expliciete false betekent 'al ex btw'", () => {
    expect(
      lodgingAmountExclVat({
        unit_price: 1090,
        pricing_type: "fixed",
        vat_rate: 9,
        price_includes_vat: false,
      }),
    ).toBe(1090);
  });
});
