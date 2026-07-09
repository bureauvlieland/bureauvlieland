/**
 * Contract: `calculateProjectGrandTotal` en
 * `calculateProjectOutstandingAmount` zijn de bron voor het "Openstaand"-
 * bedrag in Voltooiingsstatus én FinancialOverviewCard. Regressies leiden
 * direct tot verkeerde bedragen op klantfacturen en projecten-overzicht.
 *
 * Invarianten:
 *  - cancelled items tellen NIET mee, ook niet in extra-kosten.
 *  - day_index === -1 telt als extra kost (admin_price_override), niet als
 *    programma-item.
 *  - billing-lines overrulen quoted_price/admin_price_override.
 *  - Final vervangt partials in `netInvoicedInclVat`.
 *  - Credit-facturen trekken altijd extra af.
 *  - Outstanding is nooit negatief (overbetaling → 0).
 */
import { describe, it, expect } from "vitest";
import {
  calculateProjectGrandTotal,
  calculateProjectOutstandingAmount,
} from "@/lib/projectFinancials";

const baseArgs = (over: Partial<Parameters<typeof calculateProjectOutstandingAmount>[0]> = {}) => ({
  items: [
    { id: "a", block_name: "Wadloop", status: "confirmed", quoted_price: 500, day_index: 0, price_type: "fixed" as const },
    { id: "b", block_name: "Diner", status: "confirmed", quoted_price: 800, day_index: 0, price_type: "fixed" as const },
    { id: "c", block_name: "Vervoer", status: "confirmed", quoted_price: null, admin_price_override: 100, day_index: -1, price_type: "fixed" as const },
  ],
  invoices: [],
  numberOfPeople: 10,
  numberOfDays: 2,
  coordinationFee: 250,
  touristTax: 50,
  natureContribution: 10,
  centralSurcharge: 0,
  accommodationTotal: 1000,
  linesByItem: {},
  ...over,
});

describe("calculateProjectGrandTotal", () => {
  it("optelt programma + extra + fee + belasting + logies", () => {
    const total = calculateProjectGrandTotal(baseArgs());
    // program: 500 + 800 = 1300; extra: 100; fee 250; toerist 50; natuur 10; logies 1000 → 2710
    expect(total).toBeCloseTo(2710, 2);
  });

  it("cancelled items tellen nooit mee", () => {
    const t = calculateProjectGrandTotal(
      baseArgs({
        items: [
          { id: "a", block_name: "Wadloop", status: "confirmed", quoted_price: 500, day_index: 0, price_type: "fixed" },
          { id: "b", block_name: "Diner",   status: "cancelled", quoted_price: 999, day_index: 0, price_type: "fixed" },
          { id: "c", block_name: "Vervoer", status: "cancelled", quoted_price: null, admin_price_override: 999, day_index: -1, price_type: "fixed" },
        ],
      }),
    );
    // 500 + 250 + 50 + 10 + 1000 = 1810
    expect(t).toBeCloseTo(1810, 2);
  });

  it("billing-lines overrulen quoted_price", () => {
    const t = calculateProjectGrandTotal(
      baseArgs({
        linesByItem: {
          a: [
            { amount_incl_vat: 999 } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          ],
        },
      }),
    );
    // programma: 999 (uit lines voor a) + 800 (b) = 1799; extra 100; fee 250; toerist 50; natuur 10; logies 1000 = 3209
    expect(t).toBeCloseTo(3209, 2);
  });
});

describe("calculateProjectOutstandingAmount", () => {
  it("zonder facturen = volledige grand total", () => {
    expect(calculateProjectOutstandingAmount(baseArgs())).toBeCloseTo(2710, 2);
  });

  it("final vervangt partials in netto gefactureerd (geen dubbeltelling)", () => {
    const t = calculateProjectOutstandingAmount(
      baseArgs({
        invoices: [
          { amount_excl_vat: 500, vat_amount: 105, amount_incl_vat: 605, invoice_type: "partial" } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          { amount_excl_vat: 2000, vat_amount: 420, amount_incl_vat: 2420, invoice_type: "final" } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        ],
      }),
    );
    // 2710 - 2420 (final, partials niet meegeteld) = 290
    expect(t).toBeCloseTo(290, 2);
  });

  it("credit-factuur trekt altijd extra af", () => {
    const t = calculateProjectOutstandingAmount(
      baseArgs({
        invoices: [
          { amount_excl_vat: 2000, vat_amount: 420, amount_incl_vat: 2420, invoice_type: "final" } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          { amount_excl_vat: -100, vat_amount: -21, amount_incl_vat: 121, invoice_type: "credit" } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        ],
      }),
    );
    // 2710 - (2420 - 121) = 411
    expect(t).toBeCloseTo(411, 2);
  });

  it("overbetaling levert 0 op (nooit negatief)", () => {
    const t = calculateProjectOutstandingAmount(
      baseArgs({
        invoices: [
          { amount_excl_vat: 10000, vat_amount: 2100, amount_incl_vat: 12100, invoice_type: "final" } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        ],
      }),
    );
    expect(t).toBe(0);
  });
});
