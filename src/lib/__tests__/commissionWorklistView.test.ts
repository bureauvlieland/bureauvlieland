import { describe, expect, it } from "vitest";
import type { ReconRow } from "@/lib/commissionReconciliation";
import {
  bucketForRow,
  canChooseBasis,
  exemptLabel,
  groupWorklistRows,
  isDeviationRow,
  matchesWorklistSearch,
  rowPills,
  rowsForTab,
  tabTotals,
} from "@/lib/commissionWorklistView";

const row = (overrides: Partial<ReconRow> = {}): ReconRow => ({
  key: overrides.key ?? `k-${Math.random()}`,
  status: "match",
  partnerId: "zeezicht",
  partnerName: "Zeezicht",
  projectId: "p1",
  projectReference: "BV-2609-0001",
  projectLabel: "Acme BV",
  customerName: "Jan",
  itemId: "i1",
  invoiceId: null,
  itemType: "activity",
  label: "Diner",
  salesExclVat: 1000,
  purchaseExclVat: 1000,
  differenceExclVat: 0,
  commissionPercentage: 10,
  commissionAtRisk: 100,
  salesCommission: 100,
  purchaseCommission: 100,
  defaultBasis: "purchase",
  commissionExempt: false,
  exemptReason: null,
  exemptAt: null,
  readiness: "billable",
  invoiceNumber: "F-1",
  invoiceDate: "2026-09-01",
  executionDate: "2026-08-20",
  commissionStatus: "pending",
  commissionBasis: null,
  ageDays: 30,
  commissionComponents: null,
  hasMixedRates: false,
  ...overrides,
});

describe("bucketForRow", () => {
  it("één bucket per regel, in de juiste voorrang", () => {
    expect(bucketForRow(row())).toBe("billable");
    expect(bucketForRow(row({ inDraft: true }))).toBe("in_draft");
    expect(bucketForRow(row({ readiness: "expected" }))).toBe("expected");
    expect(bucketForRow(row({ readiness: "unknown_base", salesExclVat: null, purchaseExclVat: null }))).toBe(
      "unknown_base",
    );
    expect(bucketForRow(row({ commissionExempt: true }))).toBe("exempt");
    expect(bucketForRow(row({ commissionStatus: "invoiced" }))).toBe("settled");
    expect(bucketForRow(row({ commissionStatus: "paid", inDraft: true }))).toBe("settled");
  });

  it("gefactureerd en betaald staan in geen enkele tegel: die horen op Commissiefacturen", () => {
    const rows = [row({ commissionStatus: "invoiced" }), row({ commissionStatus: "paid" })];
    const totals = tabTotals(rows);
    expect(Object.values(totals).every((t) => t.count === 0)).toBe(true);
  });
});

describe("afwijkingen", () => {
  const deviation = row({ status: "deviation", purchaseExclVat: 1478, differenceExclVat: 478, purchaseCommission: 147.8 });

  it("een afwijking blijft te factureren én telt in de tegel Afwijkingen", () => {
    expect(bucketForRow(deviation)).toBe("billable");
    expect(isDeviationRow(deviation)).toBe(true);
    expect(rowsForTab([deviation, row()], "deviation")).toHaveLength(1);
    expect(rowsForTab([deviation, row()], "billable")).toHaveLength(2);
    const totals = tabTotals([deviation, row()]);
    expect(totals.billable.count).toBe(2);
    expect(totals.deviation.count).toBe(1);
    expect(totals.deviation.amount).toBeCloseTo(147.8);
  });

  it("de pill toont het verschil", () => {
    const labels = rowPills(deviation).map((p) => p.label);
    expect(labels.some((l) => l.startsWith("Afwijking +"))).toBe(true);
    expect(labels.some((l) => l.includes("478"))).toBe(true);
  });

  it("minder gefactureerd dan verkocht is geen afwijking", () => {
    expect(isDeviationRow(row({ status: "deviation", differenceExclVat: -50 }))).toBe(false);
  });
});

describe("rowPills", () => {
  it("inkoopfactuur ontbreekt alleen als de regel factureerbaar is", () => {
    const billable = row({ status: "missing_invoice", invoiceNumber: null, purchaseExclVat: null, purchaseCommission: null, defaultBasis: "sales" });
    expect(rowPills(billable).map((p) => p.label)).toEqual(["Inkoopfactuur ontbreekt"]);
    const expected = row({ ...billable, readiness: "expected" });
    expect(rowPills(expected).map((p) => p.label)).toEqual(["Verwacht"]);
  });

  it("niet geleverd gaat voor, concept en gesplitst tarief komen erbij", () => {
    const pills = rowPills(row({ partnerDismissed: true, inDraft: true, hasMixedRates: true })).map((p) => p.label);
    expect(pills).toEqual(["Partner: niet geleverd", "In concept", "Gesplitst tarief"]);
  });

  it("commissievrij: één pill met de reden", () => {
    expect(rowPills(row({ commissionExempt: true, exemptReason: "al verrekend" })).map((p) => p.label)).toEqual([
      "Commissievrij: al verrekend",
    ]);
    expect(exemptLabel(row({ commissionExempt: true, partnerId: "rederij" }))).toBe("Verrekend door partner");
    expect(exemptLabel(row({ commissionExempt: true, commissionPercentage: 0 }))).toBe("0% commissie");
  });

  it("een losse inkoopfactuur is niet gekoppeld", () => {
    const loose = row({ itemType: "purchase_invoice", itemId: null, invoiceId: "inv-1", status: "unlinked_invoice", salesExclVat: null, salesCommission: null });
    expect(rowPills(loose).map((p) => p.label)).toEqual(["Niet gekoppeld"]);
    expect(canChooseBasis(loose)).toBe(false);
  });
});

describe("zoeken, sorteren en groeperen", () => {
  const rows = [
    row({ key: "a", partnerId: "zee", partnerName: "Zeezicht", projectId: "p1", ageDays: 10, purchaseCommission: 50, salesCommission: 50 }),
    row({ key: "b", partnerId: "zee", partnerName: "Zeezicht", projectId: "p2", projectLabel: "Beta", projectReference: "BV-2609-0002", ageDays: 40, executionDate: "2026-07-01" }),
    row({ key: "c", partnerId: "oliva", partnerName: "Oliva", projectId: "p3", projectLabel: "Gamma", ageDays: 5, purchaseCommission: 300, salesCommission: 300 }),
  ];

  it("zoekt op partner, klant, project, referentie en factuurnummer", () => {
    expect(rows.filter((r) => matchesWorklistSearch(r, "oliva"))).toHaveLength(1);
    expect(rows.filter((r) => matchesWorklistSearch(r, "BV-2609-0002"))).toHaveLength(1);
    expect(rows.filter((r) => matchesWorklistSearch(r, "f-1"))).toHaveLength(3);
    expect(rows.filter((r) => matchesWorklistSearch(r, "  "))).toHaveLength(3);
  });

  it("groepeert per partner en project, met projecten op datum", () => {
    const groups = groupWorklistRows(rows, "partner");
    expect(groups.map((g) => g.partnerName)).toEqual(["Oliva", "Zeezicht"]);
    const zee = groups[1];
    expect(zee.rows).toHaveLength(2);
    expect(zee.total).toBe(150);
    expect(zee.projects.map((p) => p.label)).toEqual(["Beta", "Acme BV"]);
    expect(zee.maxAgeDays).toBe(40);
  });

  it("sorteert op ouderdom en op bedrag", () => {
    expect(groupWorklistRows(rows, "age").map((g) => g.partnerName)).toEqual(["Zeezicht", "Oliva"]);
    expect(groupWorklistRows(rows, "amount").map((g) => g.partnerName)).toEqual(["Oliva", "Zeezicht"]);
  });
});
