import { describe, it, expect } from "vitest";
import {
  buildCommissionLineDrafts,
  parseAmountParam,
  parseBasisParam,
  sumCommission,
} from "@/lib/commissionInvoiceLines";
import type { ReconRow } from "@/lib/commissionReconciliation";

const row = (overrides: Partial<ReconRow> = {}): ReconRow =>
  ({
    key: overrides.itemId ?? overrides.invoiceId ?? "k1",
    itemType: "activity",
    itemId: "item-1",
    invoiceId: null,
    invoiceNumber: null,
    invoiceDate: null,
    partnerId: "zeehondentochten-vlieland",
    partnerName: "Zeehondentochten Vlieland",
    label: "Zeehondentocht",
    customerName: "Klant A",
    projectLabel: "Klant A",
    projectReference: "BV-2606-0020",
    executionDate: "2026-06-20",
    salesExclVat: 351.24,
    purchaseExclVat: 322.24,
    differenceExclVat: -29,
    salesCommission: 35.12,
    purchaseCommission: 32.22,
    commissionAtRisk: 32.22,
    commissionExempt: false,
    commissionBasis: null,
    ageDays: 10,
    status: "matched",
    projectId: "p1",
    commissionPercentage: 10,
    defaultBasis: "purchase",
    commissionStatus: "not_applicable",
    ...overrides,
  }) as ReconRow;

describe("buildCommissionLineDrafts", () => {
  it("gebruikt de grondslag van de werklijst, niet het bruto bedrag incl. btw", () => {
    const drafts = buildCommissionLineDrafts({
      rows: [row()],
      itemIds: ["item-1"],
      basisById: new Map([["item-1", "sales"]]),
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].baseAmountExclVat).toBe(351.24);
    expect(drafts[0].commissionAmount).toBeCloseTo(35.12, 2);
    expect(drafts[0].hasBaseMismatch).toBe(false);
  });

  it("respecteert de inkoopgrondslag als die in de werklijst is gekozen", () => {
    const drafts = buildCommissionLineDrafts({
      rows: [row()],
      itemIds: ["item-1"],
      basisById: new Map([["item-1", "purchase"]]),
    });
    expect(drafts[0].basis).toBe("purchase");
    expect(drafts[0].baseAmountExclVat).toBe(322.24);
    expect(drafts[0].commissionAmount).toBeCloseTo(32.22, 2);
  });

  it("valt terug op de default-grondslag van de werklijst", () => {
    const drafts = buildCommissionLineDrafts({ rows: [row()], itemIds: ["item-1"] });
    expect(drafts[0].basis).toBe("purchase");
  });

  it("markeert een afwijking tussen werklijst en herberekening", () => {
    const drafts = buildCommissionLineDrafts({
      rows: [row()],
      itemIds: ["item-1"],
      basisById: new Map([["item-1", "sales"]]),
      amountById: new Map([["item-1", 425]]),
    });
    expect(drafts[0].hasBaseMismatch).toBe(true);
  });

  it("negeert regels die niet geselecteerd zijn", () => {
    const drafts = buildCommissionLineDrafts({
      rows: [row(), row({ itemId: "item-2", key: "item-2" })],
      itemIds: ["item-2"],
    });
    expect(drafts.map((d) => d.sourceId)).toEqual(["item-2"]);
  });

  it("gebruikt het factuur-id als bron voor losse inkoopfacturen", () => {
    const drafts = buildCommissionLineDrafts({
      rows: [
        row({
          itemType: "purchase_invoice",
          itemId: null,
          invoiceId: "inv-9",
          invoiceNumber: "2026058",
          key: "inv-9",
        }),
      ],
      invoiceIds: ["inv-9"],
    });
    expect(drafts[0].sourceId).toBe("inv-9");
    expect(drafts[0].purchaseInvoiceId).toBe("inv-9");
    expect(drafts[0].partnerInvoiceNumber).toBe("2026058");
  });

  it("telt commissie op zoals de werklijstfooter", () => {
    const drafts = buildCommissionLineDrafts({
      rows: [row(), row({ itemId: "item-2", key: "item-2" })],
      itemIds: ["item-1", "item-2"],
      basisById: new Map([
        ["item-1", "purchase"],
        ["item-2", "purchase"],
      ]),
    });
    expect(sumCommission(drafts)).toBeCloseTo(64.45, 2);
  });
});

describe("URL-parsers", () => {
  it("parseert basis- en bedragparameters", () => {
    expect(parseBasisParam("a:sales,b:purchase,c:onzin").get("a")).toBe("sales");
    expect(parseBasisParam("a:sales,c:onzin").has("c")).toBe(false);
    expect(parseAmountParam("a:351.24,b:nope").get("a")).toBe(351.24);
    expect(parseAmountParam("a:351.24,b:nope").has("b")).toBe(false);
  });
});
