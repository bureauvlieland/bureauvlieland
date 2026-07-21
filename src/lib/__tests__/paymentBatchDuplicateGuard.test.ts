import { describe, it, expect } from "vitest";
import {
  findDuplicatesInSelection,
  findAmountDateCollisions,
} from "@/lib/paymentBatchGuards";

const row = (over: Partial<any>) => ({
  id: crypto.randomUUID(),
  invoice_number: "F-2026-001",
  invoice_date: "2026-06-01",
  amount_incl_vat: 100,
  partners: { id: "p1", name: "Partner 1" },
  ...over,
});

describe("findDuplicatesInSelection", () => {
  it("markeert identieke (partner, factuurnummer) combinaties", () => {
    const rows = [row({}), row({}), row({ partners: { id: "p2", name: "Ander" } })];
    const dups = findDuplicatesInSelection(rows);
    expect(dups).toHaveLength(1);
    expect(dups[0].partnerId).toBe("p1");
    expect(dups[0].ids).toHaveLength(2);
  });

  it("normaliseert factuurnummers (T-261008 == T261008 == t261008)", () => {
    const rows = [
      row({ invoice_number: "T-261008" }),
      row({ invoice_number: "T261008" }),
      row({ invoice_number: "t261008" }),
    ];
    expect(findDuplicatesInSelection(rows)[0].ids).toHaveLength(3);
  });

  it("staat verschillende partners met zelfde nummer toe", () => {
    const rows = [
      row({ partners: { id: "p1", name: "A" } }),
      row({ partners: { id: "p2", name: "B" } }),
    ];
    expect(findDuplicatesInSelection(rows)).toHaveLength(0);
  });

  it("negeert lege factuurnummers", () => {
    const rows = [row({ invoice_number: null }), row({ invoice_number: "" })];
    expect(findDuplicatesInSelection(rows)).toHaveLength(0);
  });

  it("werkt met partner_id fallback (zonder partners-relatie geladen)", () => {
    const rows = [
      { id: "a", invoice_number: "X1", invoice_date: "2026-06-01", amount_incl_vat: 10, partner_id: "p1" },
      { id: "b", invoice_number: "X1", invoice_date: "2026-06-02", amount_incl_vat: 10, partner_id: "p1" },
    ];
    expect(findDuplicatesInSelection(rows)[0].ids).toHaveLength(2);
  });
});

describe("findAmountDateCollisions", () => {
  it("vindt zelfde partner + bedrag + datum met verschillend nummer", () => {
    const rows = [
      row({ invoice_number: "A1" }),
      row({ invoice_number: "A2" }),
    ];
    expect(findAmountDateCollisions(rows)).toHaveLength(1);
  });

  it("negeert andere datum of ander bedrag", () => {
    const rows = [
      row({ invoice_number: "A1", amount_incl_vat: 100 }),
      row({ invoice_number: "A2", amount_incl_vat: 101 }),
      row({ invoice_number: "A3", invoice_date: "2026-06-02" }),
    ];
    expect(findAmountDateCollisions(rows)).toHaveLength(0);
  });
});
