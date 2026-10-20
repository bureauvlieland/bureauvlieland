import { describe, it, expect } from "vitest";
import {
  buildReconciliationRows,
  summarizeReconciliation,
  isWithinTolerance,
  invoiceIsLinked,
  invoiceKey,
  isRowlessItem,
  worklistInvoiceCoverage,
  isBillableRow,
  isExpectedRow,
  isUnknownBaseRow,
  isInDraftRow,
  isArchivedRow,
  readinessForItem,
  exclVatFromIncl,
  firstSelectedDate,
  daysSince,
  splitCollectiveInvoices,
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

  it("telt een koppeling naar een regelloos onderdeel niet als koppeling", () => {
    const rowless = new Set(["bureau-1"]);
    expect(invoiceIsLinked(invoice({ item_id: "bureau-1" }), new Set(), rowless)).toBe(false);
    expect(invoiceIsLinked(invoice({ allocated_item_ids: ["bureau-1"] }), new Set(), rowless)).toBe(false);
    // Eén echte koppeling naast een regelloze is genoeg.
    expect(invoiceIsLinked(invoice({ allocated_item_ids: ["bureau-1", "item-1"] }), new Set(), rowless)).toBe(true);
  });
});

describe("isRowlessItem", () => {
  it("herkent bureau- en zelf-geregelde onderdelen", () => {
    expect(isRowlessItem({ block_type: "bureau" })).toBe(true);
    expect(isRowlessItem({ block_type: "self_arranged" })).toBe(true);
    expect(isRowlessItem({ block_type: "partner" })).toBe(false);
    expect(isRowlessItem({ block_type: null })).toBe(false);
  });
});

describe("inkoopfacturen aan bureau-regels", () => {
  // Stortemelk 26013731 (€ 5.751,09) hing via vier allocaties alleen aan
  // bureau-regels en verdween daardoor stil uit de werklijst.
  it("laat een factuur die alleen aan een bureau-regel hangt als projectfactuur terugkomen", () => {
    const rows = buildReconciliationRows({
      items: [item({ id: "bureau-1", block_type: "bureau", provider_id: "bureau" })],
      invoices: [invoice({ item_id: "bureau-1", amount_excl_vat: 5751.09 })],
      projects,
      partners,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("invoice:inv-1");
    expect(rows[0].status).toBe("match");
    expect(rows[0].partnerId).toBe("oliva");
    expect(rows[0].purchaseExclVat).toBeCloseTo(5751.09, 2);
    expect(rows[0].purchaseCommission).toBeCloseTo(575.109, 3);
  });

  it("doet hetzelfde bij allocaties die alleen naar bureau-regels wijzen", () => {
    const rows = buildReconciliationRows({
      items: [
        item({ id: "bureau-1", block_type: "bureau", provider_id: "bureau" }),
        item({ id: "bureau-2", block_type: "bureau", provider_id: "bureau" }),
      ],
      invoices: [
        invoice({
          allocated_item_ids: ["bureau-1", "bureau-2"],
          allocation_amounts: { "bureau-1": 600, "bureau-2": 400 },
        }),
      ],
      projects,
      partners,
    });
    expect(rows.map((r) => r.key)).toEqual(["invoice:inv-1"]);
    expect(rows[0].purchaseExclVat).toBe(1000);
  });

  it("negeert een factuurnummer dat alleen op een bureau-regel staat", () => {
    const rows = buildReconciliationRows({
      items: [item({ id: "bureau-1", block_type: "bureau", provider_id: "oliva", invoiced_number: "7" })],
      invoices: [invoice({ invoice_number: "7" })],
      projects,
      partners,
    });
    expect(rows.map((r) => r.key)).toEqual(["invoice:inv-1"]);
  });

  it("houdt de factuur bij het echte onderdeel en laat het bureau-deel als restregel terugkomen", () => {
    // Tot het werkblad Doorbelasten (18 oktober 2026) verdween de € 300 op de
    // bureau-regel stil uit de werklijst; nu is het een eigen regel.
    const rows = buildReconciliationRows({
      items: [
        item({ id: "item-1" }),
        item({ id: "bureau-1", block_type: "bureau", provider_id: "bureau" }),
      ],
      invoices: [
        invoice({
          allocated_item_ids: ["item-1", "bureau-1"],
          allocation_amounts: { "item-1": 700, "bureau-1": 300 },
        }),
      ],
      projects,
      partners,
    });
    expect(rows.map((r) => r.key)).toEqual(["item:item-1", "invoice:inv-1:rest"]);
    expect(rows[0].purchaseExclVat).toBe(700);
    expect(rows[1].purchaseExclVat).toBe(300);
  });

  it("dekt de partneronderdelen zonder eigen factuur in hetzelfde project af", () => {
    // Een factuur op een bureau-regel geldt als projectfactuur: de losse
    // onderdelen van dezelfde partner tellen dan niet óók als "factuur ontbreekt".
    const rows = buildReconciliationRows({
      items: [
        item({ id: "item-1" }),
        item({ id: "bureau-1", block_type: "bureau", provider_id: "bureau" }),
      ],
      invoices: [invoice({ item_id: "bureau-1" })],
      projects,
      partners,
    });
    expect(rows.map((r) => r.key)).toEqual(["invoice:inv-1"]);
  });
});

describe("worklistInvoiceCoverage", () => {
  it("telt per factuur het bedrag dat in de werklijst terugkomt", () => {
    const rows = buildReconciliationRows({
      items: [item({ id: "item-1" }), item({ id: "item-2" })],
      invoices: [
        // Verzamelfactuur van 1000 waarvan maar 900 is gealloceerd.
        invoice({
          id: "inv-1",
          allocated_item_ids: ["item-1", "item-2"],
          allocation_amounts: { "item-1": 500, "item-2": 400 },
        }),
        invoice({ id: "inv-2", invoice_number: "8", amount_excl_vat: 250 }),
      ],
      projects,
      partners,
    });
    const covered = worklistInvoiceCoverage(rows);
    expect(covered.get("inv-1")).toBe(900);
    expect(covered.get("inv-2")).toBe(250);
  });

  it("laat vrijgestelde regels en regels zonder percentage buiten beschouwing", () => {
    const rows = buildReconciliationRows({
      items: [
        item({ id: "item-1", commission_exempt: true }),
        item({ id: "item-2", commission_percentage: 0 }),
      ],
      invoices: [
        invoice({ id: "inv-1", item_id: "item-1" }),
        invoice({ id: "inv-2", item_id: "item-2", invoice_number: "8" }),
      ],
      projects,
      partners,
    });
    const covered = worklistInvoiceCoverage(rows);
    expect(covered.has("inv-1")).toBe(false);
    expect(covered.has("inv-2")).toBe(false);
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

  it("lek 2: inkoopfactuur zonder project én zonder onderdeel is niet gekoppeld", () => {
    const rows = buildReconciliationRows({
      items: [],
      invoices: [invoice({ request_id: null })],
      projects,
      partners,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("unlinked_invoice");
    expect(rows[0].invoiceId).toBe("inv-1");
    expect(rows[0].commissionAtRisk).toBeCloseTo(100, 6);
  });

  it("inkoopfactuur alleen aan een project is voldoende en blijft factureerbaar", () => {
    const rows = buildReconciliationRows({ items: [], invoices: [invoice()], projects, partners });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("match");
    expect(rows[0].itemType).toBe("purchase_invoice");
    expect(rows[0].projectReference).toBe("BV-2606-0001");
    expect(isBillableRow(rows[0])).toBe(true);
    expect(rows[0].purchaseCommission).toBeCloseTo(100, 6);
  });

  it("project-factuur dekt onderdelen van dezelfde partner in dat project (geen dubbele commissie)", () => {
    const rows = buildReconciliationRows({
      items: [item()],
      invoices: [invoice()],
      projects,
      partners,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].itemType).toBe("purchase_invoice");
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

describe("programRequestId: waar een taak of mail aan hangt", () => {
  const lodgingProjects = [
    ...projects,
    {
      id: "acc-1",
      reference_number: "LOG-2602-0004",
      customer_name: "Nancy",
      customer_company: null,
      program_request_id: "req-1",
    },
    {
      id: "acc-2",
      reference_number: "LOG-2603-0005",
      customer_name: "Piet",
      customer_company: null,
      program_request_id: null,
    },
  ];

  it("programma-onderdeel: het eigen project", () => {
    const [row] = buildReconciliationRows({ items: [item()], invoices: [], projects, partners });
    expect(row.projectId).toBe("req-1");
    expect(row.programRequestId).toBe("req-1");
  });

  it("logies: het programma waar de logiesaanvraag aan hangt, niet de logiesaanvraag zelf", () => {
    const [row] = buildReconciliationRows({
      items: [item({ id: "quote-1", request_id: "acc-1", item_type: "accommodation" })],
      invoices: [],
      projects: lodgingProjects,
      partners,
    });
    expect(row.projectId).toBe("acc-1");
    expect(row.projectReference).toBe("LOG-2602-0004");
    expect(row.programRequestId).toBe("req-1");
  });

  it("losse logiesaanvraag zonder programma: null", () => {
    const [row] = buildReconciliationRows({
      items: [item({ id: "quote-2", request_id: "acc-2", item_type: "accommodation" })],
      invoices: [],
      projects: lodgingProjects,
      partners,
    });
    expect(row.projectId).toBe("acc-2");
    expect(row.programRequestId).toBeNull();
  });

  it("inkoopfactuur: het project van de factuur", () => {
    const [row] = buildReconciliationRows({
      items: [],
      invoices: [invoice({ request_id: null })],
      projects,
      partners,
    });
    expect(row.programRequestId).toBeNull();
    const [linked] = buildReconciliationRows({ items: [], invoices: [invoice()], projects, partners });
    expect(linked.programRequestId).toBe("req-1");
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
      invoices: [invoice(), invoice({ id: "inv-9", invoice_number: "9", amount_excl_vat: 500, request_id: null })],
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

describe("readiness: datum voorbij", () => {
  const now = new Date("2026-10-03T12:00:00Z");

  it("logies is factureerbaar na de vertrekdatum, ook zonder afronding", () => {
    expect(
      readinessForItem({ status: "selected", itemType: "accommodation", endDate: "2026-09-10", now }),
    ).toBe("billable");
    expect(
      readinessForItem({ status: "selected", itemType: "accommodation", endDate: "2026-10-20", now }),
    ).toBe("expected");
  });

  it("activiteit met verstreken datum is alleen factureerbaar met inkoopfactuur", () => {
    const base = { status: "confirmed", itemType: "activity" as const, endDate: "2026-06-10", now };
    expect(readinessForItem({ ...base, hasPurchaseInvoice: true })).toBe("billable");
    expect(readinessForItem({ ...base, hasPurchaseInvoice: false })).toBe("expected");
  });

  it("regel zonder verkoopprijs en zonder inkoopfactuur heeft geen grondslag", () => {
    const rows = buildReconciliationRows({
      items: [item({ status: "executed", quoted_price: null })],
      invoices: [],
      projects,
      partners,
      now,
    });
    expect(rows[0].readiness).toBe("unknown_base");
    expect(isBillableRow(rows[0])).toBe(false);
    expect(isUnknownBaseRow(rows[0])).toBe(true);
  });
});

describe("conceptfactuur houdt regels uit te factureren", () => {
  it("een onderdeel op een nog niet verstuurde factuur is niet meer te factureren", () => {
    const rows = buildReconciliationRows({
      items: [item({ status: "executed", in_commission_draft: true })],
      invoices: [],
      projects,
      partners,
    });
    expect(rows[0].inDraft).toBe(true);
    expect(isBillableRow(rows[0])).toBe(false);
    expect(isExpectedRow(rows[0])).toBe(false);
    expect(isInDraftRow(rows[0])).toBe(true);
  });

  it("een losse inkoopfactuur op een concept is niet meer te factureren", () => {
    const rows = buildReconciliationRows({
      items: [],
      invoices: [invoice({ request_id: "req-1", in_commission_draft: true })],
      projects,
      partners,
    });
    expect(isBillableRow(rows[0])).toBe(false);
    expect(isInDraftRow(rows[0])).toBe(true);
  });

  it("zonder concept blijft de regel gewoon te factureren", () => {
    const rows = buildReconciliationRows({
      items: [item({ status: "executed" })],
      invoices: [],
      projects,
      partners,
    });
    expect(isBillableRow(rows[0])).toBe(true);
    expect(isInDraftRow(rows[0])).toBe(false);
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
    // Vóór de projectdatum (10 juni): een inkoopfactuur maakt een onderdeel
    // pas factureerbaar als de datum voorbij is.
    now: new Date("2026-06-01T12:00:00Z"),
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

describe("werkblad Doorbelasten: kostenposten en niet-doorbelaste regels", () => {
  const kostenpost = item({ id: "kosten-1", block_type: "bureau", provider_id: "bureau", quoted_price: null });

  it("telt bij een factuur die alleen op kostenposten is verdeeld het verdeelde bedrag", () => {
    // Kampeerterrein: € 5.000 verblijf naar een kostenpost, € 700 toeristenbelasting niet doorbelast.
    const rows = buildReconciliationRows({
      items: [kostenpost],
      invoices: [
        invoice({
          amount_excl_vat: 5700,
          allocated_item_ids: ["kosten-1"],
          allocation_amounts: { "kosten-1": 5000 },
        }),
      ],
      projects,
      partners,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].itemType).toBe("purchase_invoice");
    expect(rows[0].purchaseExclVat).toBe(5000);
    expect(rows[0].commissionAtRisk).toBeCloseTo(500, 6);
  });

  it("geeft het kostenpostdeel van een gemengd verdeelde factuur een eigen restregel", () => {
    const rows = buildReconciliationRows({
      items: [item({ id: "diner" }), kostenpost],
      invoices: [
        invoice({
          amount_excl_vat: 1200,
          allocated_item_ids: ["diner", "kosten-1"],
          allocation_amounts: { diner: 1000, "kosten-1": 150 },
        }),
      ],
      projects,
      partners,
    });
    const dinerRow = rows.find((r) => r.itemId === "diner");
    const restRow = rows.find((r) => r.key === "invoice:inv-1:rest");
    expect(dinerRow?.purchaseExclVat).toBe(1000);
    expect(restRow?.purchaseExclVat).toBe(150);
    expect(restRow?.label).toContain("overige kosten");
    // De € 50 zonder allocatie (niet doorbelast) telt nergens mee.
    const covered = worklistInvoiceCoverage(rows);
    expect(covered.get("inv-1")).toBeCloseTo(1150, 6);
  });

  it("laat een volledig aan onderdelen verdeelde factuur ongemoeid", () => {
    const rows = buildReconciliationRows({
      items: [item({ id: "diner" })],
      invoices: [invoice({ allocated_item_ids: ["diner"], allocation_amounts: { diner: 1000 } })],
      projects,
      partners,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].itemId).toBe("diner");
  });
});

describe("verzamelfacturen: regels dragen het project", () => {
  it("splitst een kop zonder project in één virtuele factuur per project van de regels", () => {
    const [a, b] = splitCollectiveInvoices(
      [invoice({ request_id: null, amount_excl_vat: 1000 })],
      [
        { invoice_id: "inv-1", request_id: "req-1", item_id: "boot-1", charge_status: "charged", amount_excl_vat: 600 },
        { invoice_id: "inv-1", request_id: "req-2", item_id: null, charge_status: "open", amount_excl_vat: 300 },
        { invoice_id: "inv-1", request_id: null, item_id: null, charge_status: "skipped", amount_excl_vat: 100 },
      ],
    );
    expect(a.id).toBe("inv-1::req-1");
    expect(a.request_id).toBe("req-1");
    expect(a.amount_excl_vat).toBe(600);
    expect(a.allocation_amounts).toEqual({ "boot-1": 600 });
    expect(b.id).toBe("inv-1::req-2");
    expect(b.amount_excl_vat).toBe(300);
    expect(b.allocation_amounts).toBeNull();
  });

  it("laat een factuur met project en een verzamelfactuur zonder regels met rust", () => {
    const normal = invoice();
    const empty = invoice({ id: "inv-2", request_id: null });
    expect(splitCollectiveInvoices([normal, empty], [])).toEqual([normal, empty]);
  });

  it("geeft elk project een eigen losse-factuurregel in de werklijst", () => {
    const invoices = splitCollectiveInvoices(
      [invoice({ request_id: null, partner_id: "zuiver", amount_excl_vat: 900 })],
      [
        { invoice_id: "inv-1", request_id: "req-1", item_id: null, charge_status: "open", amount_excl_vat: 500 },
        { invoice_id: "inv-1", request_id: "req-2", item_id: null, charge_status: "open", amount_excl_vat: 400 },
      ],
    );
    const rows = buildReconciliationRows({ items: [], invoices, projects, partners });
    expect(rows.map((r) => [r.projectId, r.purchaseExclVat])).toEqual([
      ["req-1", 500],
      ["req-2", 400],
    ]);
    expect(rows[0].commissionAtRisk).toBeCloseTo(75, 6);
  });
});

describe("factuur aan de gast (billed_to = customer)", () => {
  // De gast rekende rechtstreeks met de partner af; de boeking liep via het
  // bureau. De grondslag en de commissie blijven exact hetzelfde als bij een
  // factuur aan het bureau; alleen de vlag `customerPaid` komt erbij.
  it("rekent dezelfde commissie over een factuur die de gast betaalde", () => {
    const bureau = buildReconciliationRows({
      items: [item()],
      invoices: [invoice({ item_id: "item-1", amount_excl_vat: 1000, billed_to: "bureau" })],
      projects,
      partners,
    })[0];
    const customer = buildReconciliationRows({
      items: [item()],
      invoices: [invoice({ item_id: "item-1", amount_excl_vat: 1000, billed_to: "customer" })],
      projects,
      partners,
    })[0];
    expect(customer.purchaseExclVat).toBe(bureau.purchaseExclVat);
    expect(customer.purchaseCommission).toBe(bureau.purchaseCommission);
    expect(customer.commissionAtRisk).toBe(bureau.commissionAtRisk);
    expect(customer.defaultBasis).toBe("purchase");
    expect(customer.readiness).toBe("billable");
    expect(bureau.customerPaid).toBe(false);
    expect(customer.customerPaid).toBe(true);
    expect(customer.purchaseInvoices?.[0].billedTo).toBe("customer");
  });

  it("zonder vlag geldt de factuur als factuur aan het bureau", () => {
    const row = buildReconciliationRows({
      items: [item()],
      invoices: [invoice({ item_id: "item-1" })],
      projects,
      partners,
    })[0];
    expect(row.customerPaid).toBe(false);
    expect(row.purchaseInvoices?.[0].billedTo).toBe("bureau");
  });

  it("is pas 'door de gast betaald' als álle facturen in de grondslag aan de gast gericht zijn", () => {
    const row = buildReconciliationRows({
      items: [item()],
      invoices: [
        invoice({ id: "inv-1", invoice_number: "7", item_id: "item-1", amount_excl_vat: 600, billed_to: "customer" }),
        invoice({ id: "inv-2", invoice_number: "8", item_id: "item-1", amount_excl_vat: 400, billed_to: "bureau" }),
      ],
      projects,
      partners,
    })[0];
    expect(row.purchaseExclVat).toBe(1000);
    expect(row.customerPaid).toBe(false);
  });

  it("logies: de eindfactuur op de offerte aan de gast telt als grondslag én als door de gast betaald", () => {
    const row = buildReconciliationRows({
      items: [
        item({
          item_type: "accommodation",
          quoted_price: 2000,
          vat_rate: 0,
          invoiced_number: "H-1",
          invoiced_amount: 1800,
          invoice_billed_to: "customer",
          execution_end_date: "2026-06-11",
        }),
      ],
      invoices: [],
      projects,
      partners,
    })[0];
    expect(row.purchaseExclVat).toBe(1800);
    expect(row.purchaseCommission).toBeCloseTo(180, 6);
    expect(row.customerPaid).toBe(true);
  });

  it("logies zonder geregistreerde factuur is niet 'door de gast betaald', ook niet met de vlag", () => {
    const row = buildReconciliationRows({
      items: [item({ item_type: "accommodation", invoice_billed_to: "customer" })],
      invoices: [],
      projects,
      partners,
    })[0];
    expect(row.purchaseExclVat).toBeNull();
    expect(row.customerPaid).toBe(false);
  });

  it("losse inkoopfactuur aan de gast: zelfde regel, met de vlag", () => {
    const row = buildReconciliationRows({
      items: [],
      invoices: [invoice({ item_id: null, amount_excl_vat: 250, billed_to: "customer" })],
      projects,
      partners,
    })[0];
    expect(row.itemType).toBe("purchase_invoice");
    expect(row.purchaseCommission).toBeCloseTo(25, 6);
    expect(row.customerPaid).toBe(true);
    expect(row.purchaseInvoices?.[0].billedTo).toBe("customer");
  });
});
