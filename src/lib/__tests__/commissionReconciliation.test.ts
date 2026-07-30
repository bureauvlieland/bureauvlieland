import { describe, it, expect } from "vitest";
import {
  buildReconciliationRows,
  summarizeReconciliation,
  isWithinTolerance,
  invoiceIsLinked,
  invoiceKey,
  exclVatFromIncl,
  firstSelectedDate,
  daysSince,
  type ReconInvoiceInput,
  type ReconItemInput,
} from "../commissionReconciliation";

const partners = [
  { id: "oliva", name: "Trattoria Oliva", commission_percentage: 10 },
  { id: "rederij", name: "Rederij Doeksen", commission_percentage: 10 },
  { id: "zuiver", name: "Zuiver", commission_percentage: 15 },
];

const projects = [
  {
    id: "req-1",
    reference_number: "BV-2606-0001",
    customer_name: "Nancy",
    customer_company: "Scherp BV",
    selected_dates: ["2026-06-10", "2026-06-11"],
  },
];

function item(overrides: Partial<ReconItemInput> = {}): ReconItemInput {
  return {
    id: "item-1",
    request_id: "req-1",
    provider_id: "oliva",
    block_name: "Diner",
    quoted_price: 1210,
    vat_rate: 21,
    commission_percentage: 10,
    commission_status: "expected",
    commission_basis: "purchase",
    invoiced_number: null,
    invoiced_amount: null,
    status: "executed",
    block_type: "partner",
    execution_date: "2026-06-10",
    ...overrides,
  };
}

function invoice(overrides: Partial<ReconInvoiceInput> = {}): ReconInvoiceInput {
  return {
    id: "inv-1",
    partner_id: "oliva",
    request_id: "req-1",
    item_id: null,
    invoice_number: "7",
    invoice_date: "2026-06-15",
    amount_excl_vat: 1000,
    amount_incl_vat: 1210,
    commission_exempt: false,
    allocated_item_ids: [],
    ...overrides,
  };
}

describe("hulpfuncties", () => {
  it("rekent incl. btw correct om naar ex btw", () => {
    expect(exclVatFromIncl(1210, 21)).toBeCloseTo(1000, 6);
    expect(exclVatFromIncl(109, 9)).toBeCloseTo(100, 6);
    expect(exclVatFromIncl(121, null)).toBeCloseTo(100, 6);
  });

  it("pakt de eerste datum uit selected_dates", () => {
    expect(firstSelectedDate(["2026-06-10", "2026-06-11"])).toBe("2026-06-10");
    expect(firstSelectedDate([])).toBeNull();
    expect(firstSelectedDate(null)).toBeNull();
    expect(firstSelectedDate("2026-06-10")).toBe("2026-06-10");
  });

  it("berekent leeftijd in dagen", () => {
    const now = new Date("2026-07-01T12:00:00Z");
    expect(daysSince("2026-06-24T12:00:00Z", now)).toBe(7);
    expect(daysSince(null, now)).toBeNull();
    expect(daysSince("onzin", now)).toBeNull();
  });

  it("normaliseert factuursleutels hoofdletter- en spatie-ongevoelig", () => {
    expect(invoiceKey("Oliva", " 7 ")).toBe(invoiceKey("oliva", "7"));
  });
});

describe("isWithinTolerance", () => {
  it("accepteert kleine absolute verschillen", () => {
    expect(isWithinTolerance(1000, 1004, { toleranceEur: 5, tolerancePct: 2 })).toBe(true);
  });

  it("accepteert verschillen binnen het percentage", () => {
    expect(isWithinTolerance(1000, 1015, { toleranceEur: 5, tolerancePct: 2 })).toBe(true);
  });

  it("markeert grotere verschillen als afwijking", () => {
    expect(isWithinTolerance(1000, 1100, { toleranceEur: 5, tolerancePct: 2 })).toBe(false);
  });

  it("gaat om met een verkoopwaarde van nul", () => {
    expect(isWithinTolerance(0, 100, { toleranceEur: 5, tolerancePct: 2 })).toBe(false);
    expect(isWithinTolerance(0, 2, { toleranceEur: 5, tolerancePct: 2 })).toBe(true);
  });
});

describe("invoiceIsLinked", () => {
  it("herkent koppeling via item_id", () => {
    expect(invoiceIsLinked(invoice({ item_id: "item-1" }), new Set())).toBe(true);
  });

  it("herkent koppeling via allocaties", () => {
    expect(invoiceIsLinked(invoice({ allocated_item_ids: ["item-1"] }), new Set())).toBe(true);
  });

  it("herkent koppeling via factuurnummer op het item", () => {
    const linked = new Set([invoiceKey("oliva", "7")]);
    expect(invoiceIsLinked(invoice(), linked)).toBe(true);
  });

  it("meldt een factuur zonder enige koppeling", () => {
    expect(invoiceIsLinked(invoice(), new Set())).toBe(false);
  });
});

describe("buildReconciliationRows", () => {
  it("lek 1: verkocht onderdeel zonder inkoopfactuur", () => {
    const rows = buildReconciliationRows({ items: [item()], invoices: [], projects, partners });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("missing_invoice");
    expect(rows[0].salesExclVat).toBeCloseTo(1000, 6);
    expect(rows[0].purchaseExclVat).toBeNull();
    expect(rows[0].commissionAtRisk).toBeCloseTo(100, 6);
    expect(rows[0].projectReference).toBe("BV-2606-0001");
  });

  it("lek 2: inkoopfactuur zonder koppeling aan een onderdeel", () => {
    const rows = buildReconciliationRows({ items: [], invoices: [invoice()], projects, partners });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("unlinked_invoice");
    expect(rows[0].invoiceId).toBe("inv-1");
    expect(rows[0].commissionAtRisk).toBeCloseTo(100, 6);
  });

  it("match wanneer inkoopfactuur en verkoopwaarde gelijk zijn", () => {
    const rows = buildReconciliationRows({
      items: [item({ invoiced_number: "7", invoiced_amount: 1000 })],
      invoices: [invoice()],
      projects,
      partners,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("match");
    expect(rows[0].differenceExclVat).toBeCloseTo(0, 6);
  });

  it("afwijking wanneer het factuurbedrag te ver afwijkt", () => {
    const rows = buildReconciliationRows({
      items: [item({ invoiced_number: "7" })],
      invoices: [invoice({ amount_excl_vat: 1400 })],
      projects,
      partners,
    });
    expect(rows[0].status).toBe("deviation");
    expect(rows[0].differenceExclVat).toBeCloseTo(400, 6);
  });

  it("telt meerdere facturen op één onderdeel bij elkaar op", () => {
    const rows = buildReconciliationRows({
      items: [item()],
      invoices: [
        invoice({ id: "a", item_id: "item-1", amount_excl_vat: 600 }),
        invoice({ id: "b", item_id: "item-1", invoice_number: "8", amount_excl_vat: 400 }),
      ],
      projects,
      partners,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].purchaseExclVat).toBeCloseTo(1000, 6);
    expect(rows[0].status).toBe("match");
  });

  it("markeert commissievrije partners als exempt zonder risico", () => {
    const rows = buildReconciliationRows({
      items: [item({ provider_id: "rederij", commission_percentage: 0 })],
      invoices: [],
      projects,
      partners,
    });
    expect(rows[0].status).toBe("exempt");
    expect(rows[0].commissionAtRisk).toBe(0);
  });

  it("respecteert een handmatig commissievrij gemarkeerde factuur", () => {
    const rows = buildReconciliationRows({
      items: [],
      invoices: [invoice({ partner_id: "zuiver", commission_exempt: true })],
      projects,
      partners,
    });
    expect(rows[0].status).toBe("exempt");
    expect(rows[0].commissionAtRisk).toBe(0);
  });

  it("negeert bureau- en zelf-geregelde onderdelen", () => {
    const rows = buildReconciliationRows({
      items: [item({ block_type: "bureau" }), item({ id: "i2", block_type: "self_arranged" })],
      invoices: [],
      projects,
      partners,
    });
    expect(rows).toHaveLength(0);
  });

  it("negeert een commissievrije factuur bij het bepalen van de inkoopwaarde", () => {
    const rows = buildReconciliationRows({
      items: [item()],
      invoices: [invoice({ item_id: "item-1", commission_exempt: true })],
      projects,
      partners,
    });
    expect(rows[0].status).toBe("missing_invoice");
  });

  it("valt terug op de commissie van de partner als het item er geen heeft", () => {
    const rows = buildReconciliationRows({
      items: [item({ provider_id: "zuiver", commission_percentage: null })],
      invoices: [],
      projects,
      partners,
    });
    expect(rows[0].commissionPercentage).toBe(15);
    expect(rows[0].commissionAtRisk).toBeCloseTo(150, 6);
  });

  it("gebruikt de projectdatum wanneer het onderdeel geen eigen datum heeft", () => {
    const rows = buildReconciliationRows({
      items: [item({ execution_date: null })],
      invoices: [],
      projects,
      partners,
    });
    expect(rows[0].executionDate).toBe("2026-06-10");
  });

  it("dubbeltelt niet wanneer een factuur zowel via item_id als factuurnummer koppelt", () => {
    const rows = buildReconciliationRows({
      items: [item({ invoiced_number: "7" })],
      invoices: [invoice({ item_id: "item-1" })],
      projects,
      partners,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].purchaseExclVat).toBeCloseTo(1000, 6);
  });
});

describe("summarizeReconciliation", () => {
  it("telt statussen en commissie-risico correct op", () => {
    const rows = buildReconciliationRows({
      items: [
        item(),
        item({ id: "i2", invoiced_number: "7" }),
        item({ id: "i3", provider_id: "rederij", commission_percentage: 0 }),
      ],
      invoices: [invoice(), invoice({ id: "inv-9", invoice_number: "9", amount_excl_vat: 500 })],
      projects,
      partners,
    });

    const summary = summarizeReconciliation(rows);
    expect(summary.missingInvoice).toBe(1);
    expect(summary.match).toBe(1);
    expect(summary.exempt).toBe(1);
    expect(summary.unlinkedInvoice).toBe(1);
    expect(summary.openCount).toBe(2);
    expect(summary.commissionAtRisk).toBeCloseTo(150, 6);
  });
});
