import { describe, it, expect } from "vitest";
import {
  buildBillingLineRowsByItem,
  type BillingSourceAllocation,
  type BillingSourceLine,
} from "@/lib/purchaseInvoiceBillingLines";

const header = {
  amount_excl_vat: 1000,
  vat_rate: 21,
  vat_amount: 210,
  amount_incl_vat: 1210,
};

const alloc = (
  item_id: string,
  amount_excl_vat: number,
  vat_rate = 21,
): BillingSourceAllocation => ({
  item_id,
  amount_excl_vat,
  vat_rate,
  vat_amount: amount_excl_vat * (vat_rate / 100),
  amount_incl_vat: amount_excl_vat * (1 + vat_rate / 100),
});

const line = (description: string, amount_excl_vat: number, vat_rate = 21): BillingSourceLine => ({
  description,
  quantity: 1,
  amount_excl_vat,
  vat_rate,
  vat_amount: amount_excl_vat * (vat_rate / 100),
  amount_incl_vat: amount_excl_vat * (1 + vat_rate / 100),
});

describe("doorbelasten van een inkoopfactuur aan de klant", () => {
  it("verdeelt over álle onderdelen, niet alleen als er één is", () => {
    // Dit is het geval dat eerder stilzwijgend niets deed: één cateringfactuur
    // over drie programma-onderdelen. De klant hield dan de geoffreerde prijs.
    const rowsByItem = buildBillingLineRowsByItem({
      allocations: [alloc("item-a", 600, 9), alloc("item-b", 400, 21), alloc("item-c", 200, 9)],
      lines: [],
      header,
      invoiceNumber: "CAT-2026-01",
    });

    expect([...rowsByItem.keys()]).toEqual(["item-a", "item-b", "item-c"]);
    expect(rowsByItem.get("item-a")![0]).toMatchObject({ amount_excl_vat: 600, vat_rate: 9 });
    expect(rowsByItem.get("item-b")![0]).toMatchObject({ amount_excl_vat: 400, vat_rate: 21 });
    expect(rowsByItem.get("item-c")![0]).toMatchObject({ amount_excl_vat: 200, vat_rate: 9 });
  });

  it("geeft één onderdeel met meerdere btw-tarieven een regel per tarief", () => {
    const rowsByItem = buildBillingLineRowsByItem({
      allocations: [alloc("item-a", 871.56, 9), alloc("item-a", 231.4, 21)],
      lines: [line("Diner", 871.56, 9)],
      header,
      invoiceNumber: "CAT-2026-02",
    });

    const rows = rowsByItem.get("item-a")!;
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.vat_rate)).toEqual([9, 21]);
  });

  it("gebruikt de gescande regels bij één onderdeel, want die zijn rijker", () => {
    const rowsByItem = buildBillingLineRowsByItem({
      allocations: [alloc("item-a", 1000)],
      lines: [line("Zaalhuur", 700), line("Techniek", 300)],
      header,
      invoiceNumber: "X-1",
    });

    const rows = rowsByItem.get("item-a")!;
    expect(rows.map((r) => r.description)).toEqual(["Zaalhuur", "Techniek"]);
  });

  it("valt zonder verdeling terug op het onderdeel van de factuurkop", () => {
    const rowsByItem = buildBillingLineRowsByItem({
      allocations: [],
      lines: [line("Vervoer", 1000)],
      headerItemId: "item-z",
      header,
      invoiceNumber: "V-9",
    });

    expect([...rowsByItem.keys()]).toEqual(["item-z"]);
    expect(rowsByItem.get("item-z")![0].description).toBe("Vervoer");
  });

  it("gebruikt het factuurtotaal als er geen regels én geen verdeling zijn", () => {
    const rowsByItem = buildBillingLineRowsByItem({
      allocations: [],
      lines: [],
      headerItemId: "item-z",
      header,
      description: "Bagagevervoer juni",
    });

    expect(rowsByItem.get("item-z")![0]).toMatchObject({
      description: "Bagagevervoer juni",
      amount_excl_vat: 1000,
      vat_rate: 21,
    });
  });

  it("levert niets op als er nergens een onderdeel aan hangt", () => {
    const rowsByItem = buildBillingLineRowsByItem({
      allocations: [],
      lines: [line("Iets", 100)],
      headerItemId: null,
      header,
    });
    expect(rowsByItem.size).toBe(0);
  });

  it("rekent de stuksprijs terug bij een regel met meerdere stuks", () => {
    const rowsByItem = buildBillingLineRowsByItem({
      allocations: [],
      lines: [{ ...line("Lunch", 250, 9), quantity: 10 }],
      headerItemId: "item-z",
      header,
    });
    expect(rowsByItem.get("item-z")![0].unit_price_excl_vat).toBe(25);
  });
});
