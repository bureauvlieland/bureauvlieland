import { describe, it, expect } from "vitest";
import { findDuplicatesInSelection } from "@/lib/paymentBatchGuards";

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

  it("negeert lege factuurnummers bij de nummer-controle", () => {
    const rows = [
      row({ invoice_number: null, amount_incl_vat: 100 }),
      row({ invoice_number: "", amount_incl_vat: 250 }),
    ];
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

describe("findDuplicatesInSelection – bedrag", () => {
  it("vindt zelfde partner + bedrag rond dezelfde datum met verschillend nummer", () => {
    const rows = [
      row({ invoice_number: "A1" }),
      row({ invoice_number: "A2" }),
    ];
    const dups = findDuplicatesInSelection(rows);
    expect(dups).toHaveLength(1);
    expect(dups[0].reason).toBe("amount");
    expect(dups[0].partnerName).toBe("Partner 1");
  });

  it("negeert een ander bedrag, een ander project of een datum ver weg", () => {
    const rows = [
      row({ invoice_number: "A1", amount_incl_vat: 100, request_id: "r1" }),
      row({ invoice_number: "A2", amount_incl_vat: 101, request_id: "r1" }),
      row({ invoice_number: "A3", amount_incl_vat: 100, request_id: "r2" }),
      row({ invoice_number: "A4", amount_incl_vat: 100, invoice_date: "2026-12-01" }),
    ];
    expect(findDuplicatesInSelection(rows)).toHaveLength(0);
  });
});
