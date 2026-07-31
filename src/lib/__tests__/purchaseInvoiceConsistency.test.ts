import { describe, it, expect } from "vitest";
import {
  expectedCommission,
  findOrphanInvoicedItems,
  hasCommissionDrift,
  isValidInvoiceNumberInput,
  normalizeInvoiceNumberInput,
  type InvoicedItemRef,
} from "@/lib/purchaseInvoiceConsistency";

const item = (o: Partial<InvoicedItemRef> = {}): InvoicedItemRef => ({
  id: "i1",
  request_id: "r1",
  block_name: "Lunch op locatie",
  invoiced_number: "T-261015",
  invoiced_amount: 573.39,
  invoiced_date: "2026-06-29",
  provider_id: "zuiver",
  ...o,
});

describe("findOrphanInvoicedItems", () => {
  it("meldt een item met factuurnummer zonder factuurrij", () => {
    const res = findOrphanInvoicedItems([item()], []);
    expect(res).toHaveLength(1);
    expect(res[0].reason).toBe("no_purchase_invoice");
  });

  it("meldt niets als het item aan een factuur gekoppeld is", () => {
    expect(findOrphanInvoicedItems([item()], ["i1"])).toHaveLength(0);
  });

  it("negeert items zonder factuurnummer", () => {
    expect(findOrphanInvoicedItems([item({ invoiced_number: null })], [])).toHaveLength(0);
  });

  it("ziet dekking via factuurnummer + leverancier zonder item-koppeling", () => {
    const rows = [item({ invoiced_number: "2026015", provider_id: "zeehonden" })];
    expect(
      findOrphanInvoicedItems(rows, [], [
        { partner_id: "zeehonden", invoice_number: "2026015", invoice_number_normalized: "2026015" },
      ]),
    ).toHaveLength(0);
  });

  it("blijft melden bij ander leverancier of ander nummer", () => {
    const rows = [item({ invoiced_number: "2026015", provider_id: "zeehonden" })];
    expect(
      findOrphanInvoicedItems(rows, [], [
        { partner_id: "rederij", invoice_number: "2026015" },
      ]),
    ).toHaveLength(1);
    expect(
      findOrphanInvoicedItems(rows, [], [
        { partner_id: "zeehonden", invoice_number: "2026099" },
      ]),
    ).toHaveLength(1);
  });

  it("negeert placeholder-nummers zoals nvt op bureau-onderdelen", () => {
    const rows = [
      item({ invoiced_number: "nvt", provider_id: "bureau" }),
      item({ id: "i2", invoiced_number: "n.v.t.", provider_id: "bureau" }),
      item({ id: "i3", invoiced_number: "-", provider_id: "bureau" }),
      item({ id: "i4", invoiced_number: "   ", provider_id: "bureau" }),
    ];
    expect(findOrphanInvoicedItems(rows, [])).toHaveLength(0);
  });
});

describe("normalizeInvoiceNumberInput", () => {
  it("trimt en behoudt echte nummers", () => {
    expect(normalizeInvoiceNumberInput("  2026015 ")).toBe("2026015");
    expect(normalizeInvoiceNumberInput("F2026011")).toBe("F2026011");
  });

  it("maakt placeholders leeg", () => {
    for (const raw of ["nvt", "NVT", "n.v.t.", "N/A", "geen", "-", "?", "x", "", "   ", "0"]) {
      expect(normalizeInvoiceNumberInput(raw)).toBeNull();
    }
    expect(normalizeInvoiceNumberInput(null)).toBeNull();
  });

  it("valideert dat er minstens één cijfer in staat", () => {
    expect(isValidInvoiceNumberInput("2026015")).toBe(true);
    expect(isValidInvoiceNumberInput("factuur")).toBe(false);
    expect(isValidInvoiceNumberInput("nvt")).toBe(false);
  });
});


describe("commissie-afgeleiden", () => {
  it("rekent commissie op centen af", () => {
    expect(expectedCommission(573.39, 15)).toBe(86.01);
    expect(expectedCommission(269.72, 15)).toBe(40.46);
    expect(expectedCommission(null, 15)).toBe(0);
    expect(expectedCommission(100, null)).toBe(0);
  });

  it("signaleert drift buiten 2 cent", () => {
    expect(
      hasCommissionDrift({ invoiced_amount: 573.39, commission_percentage: 15, commission_amount: 86.01 }),
    ).toBe(false);
    expect(
      hasCommissionDrift({ invoiced_amount: 573.39, commission_percentage: 15, commission_amount: 0 }),
    ).toBe(true);
    expect(
      hasCommissionDrift({ invoiced_amount: null, commission_percentage: 15, commission_amount: null }),
    ).toBe(false);
  });
});
