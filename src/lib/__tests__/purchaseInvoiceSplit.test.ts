import { describe, it, expect } from "vitest";
import {
  buildAllocationRows,
  isSplitBalanced,
  proposeSplit,
  splitTotals,
} from "../purchaseInvoiceSplit";

describe("proposeSplit", () => {
  it("verdeelt naar rato van de verkoopprijs en sluit op de cent", () => {
    const result = proposeSplit(1000, [
      { id: "a", weight: 100 },
      { id: "b", weight: 200 },
      { id: "c", weight: 100 },
    ]);
    expect(result).toEqual([
      { item_id: "a", amount_excl_vat: 250 },
      { item_id: "b", amount_excl_vat: 500 },
      { item_id: "c", amount_excl_vat: 250 },
    ]);
  });

  it("legt het afrondingsverschil op het grootste deel", () => {
    const result = proposeSplit(100, [
      { id: "a", weight: 1 },
      { id: "b", weight: 1 },
      { id: "c", weight: 1 },
    ]);
    expect(splitTotals(result, 100).sum).toBe(100);
    expect(result.map((r) => r.amount_excl_vat).sort()).toEqual([33.33, 33.33, 33.34]);
  });

  it("verdeelt gelijk als er geen gewichten bekend zijn", () => {
    const result = proposeSplit(2398.62, [
      { id: "a", weight: null },
      { id: "b", weight: 0 },
    ]);
    expect(result).toEqual([
      { item_id: "a", amount_excl_vat: 1199.31 },
      { item_id: "b", amount_excl_vat: 1199.31 },
    ]);
  });

  it("geeft een lege lijst zonder doelen", () => {
    expect(proposeSplit(100, [])).toEqual([]);
  });
});

describe("isSplitBalanced", () => {
  it("accepteert een sluitende verdeling en weigert een afwijking", () => {
    const amounts = [
      { item_id: "a", amount_excl_vat: 10 },
      { item_id: "b", amount_excl_vat: 5.5 },
    ];
    expect(isSplitBalanced(amounts, 15.5)).toBe(true);
    expect(isSplitBalanced(amounts, 15.6)).toBe(false);
  });
});

describe("buildAllocationRows", () => {
  it("rekent btw op het factuurtarief en slaat nulregels over", () => {
    const rows = buildAllocationRows("inv-1", 9, [
      { item_id: "a", amount_excl_vat: 100 },
      { item_id: "b", amount_excl_vat: 0 },
      { item_id: "c", amount_excl_vat: 50.55 },
    ]);
    expect(rows).toEqual([
      {
        invoice_id: "inv-1",
        item_id: "a",
        amount_excl_vat: 100,
        vat_rate: 9,
        vat_amount: 9,
        amount_incl_vat: 109,
        sort_order: 0,
      },
      {
        invoice_id: "inv-1",
        item_id: "c",
        amount_excl_vat: 50.55,
        vat_rate: 9,
        vat_amount: 4.55,
        amount_incl_vat: 55.1,
        sort_order: 1,
      },
    ]);
  });
});
