import { describe, it, expect } from "vitest";
import {
  buildReconciliationRows,
  summarizeReconciliation,
  isWithinTolerance,
  invoiceIsLinked,
  invoiceKey,
  isBillableRow,
  isExpectedRow,
  isArchivedRow,
  readinessForItem,
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

describe("readiness: verwacht vs factureerbaar", () => {
  it("is factureerbaar bij uitgevoerde itemstatus", () => {
    expect(readinessForItem({ status: "executed" })).toBe("billable");
    expect(readinessForItem({ status: "invoiced" })).toBe("billable");
  });

  it("is verwacht zolang het project nog niet is afgerond", () => {
    expect(readinessForItem({ status: "confirmed" })).toBe("expected");
    expect(readinessForItem({ status: "confirmed", projectCompleted: true })).toBe("billable");
  });
});

describe("commissievrij markeren", () => {
  it("haalt een gearchiveerde regel uit zowel te factureren als verwacht", () => {
    const rows = buildReconciliationRows({
      items: [item({ id: "ex-1", commission_exempt: true, commission_exempt_reason: "Afspraak" })],
      invoices: [],
      projects,
      partners,
    });
    expect(rows).toHaveLength(1);
    expect(isArchivedRow(rows[0])).toBe(true);
    expect(isBillableRow(rows[0])).toBe(false);
    expect(isExpectedRow(rows[0])).toBe(false);
    expect(rows[0].exemptReason).toBe("Afspraak");
  });
});

describe("regressie: partnerregels met default commissiestatus blijven zichtbaar", () => {
  // Reproductie van de Zuiver Traiteur-casus: 12 verkochte onderdelen, waarvan er
  // slechts 1 een geregistreerde inkoopfactuur (en dus status "pending") heeft.
  // Alle overige regels staan op de databasedefault "not_applicable" en mogen
  // niet stilzwijgend uit de werklijst verdwijnen.
  const soldItems: ReconItemInput[] = Array.from({ length: 11 }, (_, i) =>
    item({
      id: `zuiver-${i + 1}`,
      provider_id: "zuiver",
      block_name: `Catering ${i + 1}`,
      quoted_price: 500,
      commission_percentage: null,
      commission_status: "not_applicable",
      invoiced_number: null,
      status: i % 2 === 0 ? "confirmed" : "executed",
    }),
  );

  const invoicedItem = item({
    id: "zuiver-12",
    provider_id: "zuiver",
    block_name: "Luxe Lunchbuffet",
    quoted_price: 225,
    commission_percentage: 15,
    commission_status: "pending",
    invoiced_number: "T-261008",
    invoiced_amount: 186,
    status: "confirmed",
  });

  const rows = buildReconciliationRows({
    items: [...soldItems, invoicedItem],
    invoices: [
      invoice({
        id: "inv-zuiver-1",
        partner_id: "zuiver",
        item_id: "zuiver-12",
        invoice_number: "T-261008",
        amount_excl_vat: 186,
        amount_incl_vat: 225,
      }),
    ],
    projects,
    partners,
  });

  it("bouwt een regel per verkocht onderdeel", () => {
    expect(rows.filter((r) => r.partnerId === "zuiver")).toHaveLength(12);
  });

  it("markeert de regels zonder inkoopfactuur als missing_invoice", () => {
    expect(rows.filter((r) => r.status === "missing_invoice")).toHaveLength(11);
  });

  it("houdt alle 12 regels zichtbaar (factureerbaar of verwacht)", () => {
    const zuiver = rows.filter((r) => r.partnerId === "zuiver");
    expect(zuiver.filter((r) => isBillableRow(r) || isExpectedRow(r))).toHaveLength(12);
  });

  it("zet niet-uitgevoerde onderdelen op verwacht en uitgevoerde op factureerbaar", () => {
    // 6 onderdelen staan op "confirmed" (i % 2 === 0 => 0,2,4,6,8,10) plus het
    // gefactureerde onderdeel op "confirmed": samen 7 verwachte regels.
    expect(rows.filter(isExpectedRow)).toHaveLength(7);
    expect(rows.filter(isBillableRow)).toHaveLength(5);
  });

  it("maakt alles factureerbaar zodra het project is afgerond", () => {
    const completed = buildReconciliationRows({
      items: [...soldItems, invoicedItem],
      invoices: [],
      projects: [{ ...projects[0], completion_status: "completed" }],
      partners,
    });
    expect(completed.filter((r) => r.partnerId === "zuiver").every(isBillableRow)).toBe(true);
  });

  it("gebruikt het partnerpercentage als het onderdeel er geen heeft", () => {
    const row = rows.find((r) => r.itemId === "zuiver-1")!;
    expect(row.commissionPercentage).toBe(15);
    expect(row.salesCommission).toBeCloseTo((500 / 1.21) * 0.15, 6);
    expect(row.defaultBasis).toBe("sales");
  });
});

describe("verzamelfactuur-allocaties", () => {
  const allocInvoice = invoice({
    id: "inv-collectief",
    invoice_number: "20260013",
    amount_excl_vat: 1102.96,
    amount_incl_vat: 1230,
    item_id: null,
    allocated_item_ids: ["trip-a", "trip-b"],
    allocation_amounts: { "trip-a": 440.37, "trip-b": 431.19 },
  });
  const allocItems = [
    item({ id: "trip-a", quoted_price: 480, vat_rate: 9 }),
    item({ id: "trip-b", quoted_price: 470, vat_rate: 9 }),
  ];
  const rows = buildReconciliationRows({ items: allocItems, invoices: [allocInvoice], projects, partners });

  it("verdeelt de verzamelfactuur over de gealloceerde onderdelen (geen dubbeltelling)", () => {
    expect(rows.find((r) => r.itemId === "trip-a")!.purchaseExclVat).toBeCloseTo(440.37, 6);
    expect(rows.find((r) => r.itemId === "trip-b")!.purchaseExclVat).toBeCloseTo(431.19, 6);
    expect(rows.find((r) => r.itemId === "trip-a")!.status).toBe("match");
    expect(rows.find((r) => r.itemId === "trip-b")!.status).toBe("match");
  });

  it("telt zonder allocaties het volledige factuurbedrag per gekoppeld onderdeel", () => {
    const plain = buildReconciliationRows({
      items: [item({ id: "x1" })],
      invoices: [invoice({ id: "inv-plain", item_id: "x1", allocated_item_ids: [], allocation_amounts: null })],
      projects,
      partners,
    });
    expect(plain.find((r) => r.itemId === "x1")!.purchaseExclVat).toBeCloseTo(1000, 6);
  });
});

/**
 * K3 uit de doorlichting: voor logies gold het activiteitenpercentage van de
 * partner in plaats van het logiespercentage, omdat alleen `commission_percentage`
 * werd geraadpleegd. Beide staan in `partners`.
 */
describe("commissiepercentage per soort", () => {
  const hotel = {
    id: "badhotel",
    name: "Badhotel Bruin",
    commission_percentage: 15,
    accommodation_commission_percentage: 10,
    extras_commission_percentage: 0,
  };

  const lodgingItem = (overrides: Partial<ReconItemInput> = {}): ReconItemInput =>
    item({
      id: "quote-1",
      provider_id: "badhotel",
      item_type: "accommodation",
      block_name: "Tweepersoonskamers",
      commission_percentage: null,
      quoted_price: 1000,
      vat_rate: 0,
      ...overrides,
    });

  it("logies valt terug op het logiespercentage, niet op het activiteitenpercentage", () => {
    const [row] = buildReconciliationRows({
      items: [lodgingItem()],
      invoices: [],
      projects,
      partners: [hotel],
    });
    expect(row.commissionPercentage).toBe(10);
    expect(row.salesCommission).toBeCloseTo(100, 6);
  });

  it("een programma-onderdeel valt terug op het activiteitenpercentage", () => {
    const [row] = buildReconciliationRows({
      items: [lodgingItem({ item_type: "activity", id: "item-9" })],
      invoices: [],
      projects,
      partners: [hotel],
    });
    expect(row.commissionPercentage).toBe(15);
  });

  it("een percentage op de regel zelf wint van beide", () => {
    const [row] = buildReconciliationRows({
      items: [lodgingItem({ commission_percentage: 7.5 })],
      invoices: [],
      projects,
      partners: [hotel],
    });
    expect(row.commissionPercentage).toBe(7.5);
  });

  it("zonder partnerpercentages blijft 10 % de standaard", () => {
    const [row] = buildReconciliationRows({
      items: [lodgingItem({ provider_id: "onbekend" })],
      invoices: [],
      projects,
      partners: [{ id: "onbekend", name: "Onbekend" }],
    });
    expect(row.commissionPercentage).toBe(10);
  });

  it("rekent kamer en extra's elk tegen hun eigen percentage", () => {
    // Badhotel Bruin: 10 % over de kamer, 0 % over de extra's.
    const [row] = buildReconciliationRows({
      items: [
        lodgingItem({
          commission_components: [
            { kind: "room", label: "Kamers", baseExclVat: 5000, commissionPct: 10, commissionAmount: 500 },
            { kind: "extra", label: "Diner", baseExclVat: 1652.89, commissionPct: 0, commissionAmount: 0 },
          ],
        }),
      ],
      invoices: [],
      projects,
      partners: [hotel],
    });

    expect(row.salesExclVat).toBeCloseTo(6652.89, 2);
    expect(row.salesCommission).toBe(500);
    expect(row.hasMixedRates).toBe(true);
    // Het rijpercentage is louter ter weergave: 500 / 6652,89.
    expect(row.commissionPercentage).toBeCloseTo(7.52, 2);
  });

  it("een regel zonder componenten houdt de gewone berekening", () => {
    const [row] = buildReconciliationRows({
      items: [lodgingItem()],
      invoices: [],
      projects,
      partners: [hotel],
    });
    expect(row.commissionComponents).toBeNull();
    expect(row.hasMixedRates).toBe(false);
    expect(row.commissionPercentage).toBe(10);
  });

  it("telt de toeristenbelasting niet mee zodra de factuur op de offerte staat", () => {
    // De eindfactuur is EUR 6.000 ex btw, waarvan EUR 120 toeristenbelasting die
    // `apply-purchase-invoice-to-lodging` bewust buiten de offerte houdt.
    const [row] = buildReconciliationRows({
      items: [
        lodgingItem({
          invoiced_number: "H-2026-88",
          purchase_invoice_applied: true,
          commission_components: [
            { kind: "room", label: "Kamers", baseExclVat: 5880, commissionPct: 10, commissionAmount: 588 },
          ],
        }),
      ],
      invoices: [
        {
          id: "inv-88",
          partner_id: "badhotel",
          request_id: "req-1",
          item_id: null,
          invoice_number: "H-2026-88",
          invoice_date: "2026-06-12",
          amount_excl_vat: 6000,
          amount_incl_vat: 6540,
        },
      ],
      projects,
      partners: [hotel],
    });

    expect(row.defaultBasis).toBe("sales");
    expect(row.salesCommission).toBe(588);
    // Over het ruwe factuurbedrag zou het EUR 600 zijn — EUR 12 commissie over
    // toeristenbelasting die niet van de partner is.
    expect(row.purchaseCommission).toBeGreaterThan(row.salesCommission!);
    // En het blijft een match: de offerte is mét deze factuur overschreven.
    expect(row.status).toBe("match");
  });
});
