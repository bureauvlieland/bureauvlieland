import { describe, expect, it } from "vitest";
import {
  basisAmountForBasis,
  commissionForBasis,
  defaultBasisForRow,
  isBillableRow,
  type ReconRow,
} from "@/lib/commissionReconciliation";

const row = (overrides: Partial<ReconRow> = {}): ReconRow => ({
  key: "item:1",
  status: "missing_invoice",
  partnerId: "partner-1",
  partnerName: "Partner 1",
  projectId: "req-1",
  projectReference: "BV-2606-0001",
  projectLabel: "Acme BV",
  customerName: "Jan Jansen",
  itemId: "item-1",
  invoiceId: null,
  itemType: "activity",
  label: "Zeehondentocht",
  salesExclVat: 1000,
  purchaseExclVat: null,
  differenceExclVat: null,
  commissionPercentage: 10,
  commissionAtRisk: 100,
  salesCommission: 100,
  purchaseCommission: null,
  defaultBasis: "sales",
  commissionExempt: false,
  invoiceNumber: null,
  invoiceDate: null,
  executionDate: "2026-05-01",
  commissionStatus: null,
  commissionBasis: "purchase",
  ageDays: 10,
  ...overrides,
});

describe("defaultBasisForRow", () => {
  it("kiest inkoop als er een inkoopfactuurbedrag is", () => {
    expect(defaultBasisForRow({ purchaseExclVat: 900, commissionBasis: "purchase" })).toBe("purchase");
  });

  it("valt terug op verkoop zonder inkoopfactuur", () => {
    expect(defaultBasisForRow({ purchaseExclVat: null, commissionBasis: "purchase" })).toBe("sales");
  });

  it("respecteert een expliciet vastgelegde verkoopgrondslag", () => {
    expect(defaultBasisForRow({ purchaseExclVat: 900, commissionBasis: "sales" })).toBe("sales");
  });
});

describe("commissionForBasis", () => {
  it("gebruikt de verkoopcommissie bij grondslag verkoop", () => {
    expect(commissionForBasis(row(), "sales")).toBe(100);
  });

  it("gebruikt de inkoopcommissie bij grondslag inkoop", () => {
    expect(commissionForBasis(row({ purchaseCommission: 90 }), "purchase")).toBe(90);
  });

  it("valt terug op de andere grondslag als de gekozene ontbreekt", () => {
    expect(commissionForBasis(row(), "purchase")).toBe(100);
  });

  it("geeft 0 als beide grondslagen ontbreken", () => {
    expect(commissionForBasis(row({ salesCommission: null, purchaseCommission: null }), "sales")).toBe(0);
  });
});

describe("basisAmountForBasis", () => {
  it("geeft het verkoopbedrag ex btw bij verkoop", () => {
    expect(basisAmountForBasis(row(), "sales")).toBe(1000);
  });

  it("valt terug op verkoop als inkoop ontbreekt", () => {
    expect(basisAmountForBasis(row(), "purchase")).toBe(1000);
  });

  it("geeft het inkoopbedrag als dat er is", () => {
    expect(basisAmountForBasis(row({ purchaseExclVat: 880 }), "purchase")).toBe(880);
  });
});

describe("isBillableRow", () => {
  it("neemt openstaande regels zonder inkoopfactuur mee", () => {
    expect(isBillableRow(row())).toBe(true);
  });

  it("neemt losse inkoopfacturen mee", () => {
    expect(
      isBillableRow(
        row({
          key: "invoice:1",
          itemType: "purchase_invoice",
          status: "unlinked_invoice",
          itemId: null,
          invoiceId: "inv-1",
          salesExclVat: null,
          salesCommission: null,
          purchaseExclVat: 500,
          purchaseCommission: 50,
        }),
      ),
    ).toBe(true);
  });

  it("sluit commissievrije regels uit", () => {
    expect(isBillableRow(row({ commissionExempt: true, status: "exempt" }))).toBe(false);
  });

  it("sluit al gefactureerde en betaalde regels uit", () => {
    expect(isBillableRow(row({ commissionStatus: "invoiced" }))).toBe(false);
    expect(isBillableRow(row({ commissionStatus: "paid" }))).toBe(false);
  });

  it("sluit regels met 0% commissie uit", () => {
    expect(isBillableRow(row({ commissionPercentage: 0 }))).toBe(false);
  });
});
