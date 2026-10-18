import { describe, it, expect } from "vitest";
import {
  buildProjectInvoiceSpec,
  scaleVatGroups,
  type SpecItemInput,
  type SpecSettingsInput,
} from "@/lib/projectInvoiceSpec";
import type { FeeStructureSet } from "@/types/pricing";

const settings: SpecSettingsInput = {
  coordination_fee_tiers: [
    { maxPeople: 10, fee: 150 },
    { maxPeople: 50, fee: 300 },
  ],
  tourist_tax_pp_per_day: 2.5,
  nature_contribution_pp: 1,
  bureau_central_surcharge_pp: 0.5,
  default_vat_rate: 21,
  accommodation_vat_rate: 9,
};

const request = {
  number_of_people: 20,
  selected_dates: ["2026-09-15", "2026-09-16"],
  invoicing_mode: "bureau_central",
  excluded_fees: [] as string[],
};

const item = (over: Partial<SpecItemInput> & { id: string }): SpecItemInput => ({
  block_id: null,
  block_name: "Zeehondentocht",
  block_category: "excursies",
  provider_name: "Zeehondentochten",
  status: "confirmed",
  day_index: 0,
  quoted_price: null,
  admin_price_override: null,
  price_type: "per_person",
  ...over,
});

describe("één berekening van de klantfactuur", () => {
  it("telt onderdelen, logies, fees en belastingen op zoals het overzicht ze toonde", () => {
    const spec = buildProjectInvoiceSpec({
      request,
      items: [item({ id: "a", quoted_price: 500 }), item({ id: "b", day_index: -1, block_category: "overig", price_type: "total", admin_price_override: 77.49, vat_rate: 21 })],
      accommodation: { accommodation_name: "Hotel", price_total: 1000, vat_rate: 9, extras: [] },
      settings,
    });
    expect(spec.totals.programItems).toBe(500);
    expect(spec.totals.extraCosts).toBe(77.49);
    expect(spec.totals.lodging).toBe(1000);
    expect(spec.totals.coordinationFee).toBe(300);
    expect(spec.totals.centralSurcharge).toBe(10);
    expect(spec.totals.touristTax).toBe(100);
    expect(spec.totals.natureContribution).toBe(20);
    expect(spec.totals.inclVat).toBe(2007.49);
    expect(spec.totals.outstanding).toBe(2007.49);
  });

  it("laat klantregels de offerteprijs vervangen en neemt hun btw exact over", () => {
    const spec = buildProjectInvoiceSpec({
      request: { ...request, excluded_fees: ["tourist_tax", "nature_contribution", "coordination_fee", "central_surcharge"] },
      items: [item({ id: "a", quoted_price: 500 })],
      linesByItem: {
        a: [
          { item_id: "a", description: "Rondvaart", quantity: 20, unit_price_excl_vat: 20, vat_rate: 9, amount_excl_vat: 400, vat_amount: 36, amount_incl_vat: 436 },
          { item_id: "a", description: "Koffie", quantity: 1, unit_price_excl_vat: 50, vat_rate: 21, amount_excl_vat: 50, vat_amount: 10.5, amount_incl_vat: 60.5 },
        ],
      },
      settings,
    });
    const line = spec.lines[0];
    expect(line.amountInclVat).toBe(496.5);
    expect(line.subLines).toHaveLength(2);
    expect(spec.vatGroups).toEqual([
      { rate: 9, exclVat: 400, vatAmount: 36, inclVat: 436 },
      { rate: 21, exclVat: 50, vatAmount: 10.5, inclVat: 60.5 },
    ]);
    expect(spec.totals.exclVat).toBe(450);
    expect(spec.totals.vat).toBe(46.5);
    expect(spec.totals.inclVat).toBe(496.5);
  });

  it("gebruikt het eigen btw-tarief van een kostenpost zonder bouwsteen", () => {
    const spec = buildProjectInvoiceSpec({
      request: { ...request, excluded_fees: ["tourist_tax", "nature_contribution", "coordination_fee", "central_surcharge"] },
      items: [item({ id: "k", day_index: -1, block_category: "overig", price_type: "total", admin_price_override: 109, vat_rate: 9 })],
      settings,
    });
    expect(spec.vatGroups).toEqual([{ rate: 9, exclVat: 100, vatAmount: 9, inclVat: 109 }]);
  });

  it("laat uitgesloten posten en rechtstreeks gefactureerd logies weg", () => {
    const spec = buildProjectInvoiceSpec({
      request: { ...request, excluded_fees: ["tourist_tax", "accommodation"] },
      items: [],
      accommodation: { accommodation_name: "Hotel", price_total: 1000, extras: [{ name: "Ontbijt", quantity: 20, unit_price: 10, pricing_type: "per_person" }] },
      settings,
    });
    expect(spec.totals.touristTax).toBe(0);
    expect(spec.totals.lodging).toBe(0);
    expect(spec.totals.lodgingExtras).toBe(0);
    expect(spec.accommodationBilledDirectly).toBe(true);
    expect(spec.lines.map((l) => l.key)).toEqual(["fee:coordination_fee", "fee:central_surcharge", "fee:nature_contribution"]);
  });

  it("bundelt identieke logies-extra's en houdt hun tarief", () => {
    const spec = buildProjectInvoiceSpec({
      request: { ...request, excluded_fees: ["tourist_tax", "nature_contribution", "coordination_fee", "central_surcharge"] },
      items: [],
      accommodation: {
        accommodation_name: "Hotel",
        price_total: 0,
        extras: [
          { id: "e1", name: "Ontbijt", quantity: 20, unit_price: 10, pricing_type: "per_person", vat_rate: 9 },
          { id: "e2", name: "Ontbijt", quantity: 20, unit_price: 10, pricing_type: "per_person", vat_rate: 9 },
          { id: "e3", name: "Zaalhuur", quantity: 1, unit_price: 121, pricing_type: "fixed", vat_rate: 21 },
        ],
      },
      settings,
    });
    expect(spec.lines).toHaveLength(2);
    expect(spec.lines[0]).toMatchObject({ description: "Ontbijt", quantity: 40, amountInclVat: 400, bundleCount: 2, vatRate: 9 });
    expect(spec.lines[1]).toMatchObject({ description: "Zaalhuur", quantity: 1, amountInclVat: 121, vatRate: 21 });
    const unbundled = buildProjectInvoiceSpec({
      request: { ...request, excluded_fees: ["tourist_tax", "nature_contribution", "coordination_fee", "central_surcharge"] },
      items: [],
      accommodation: spec.lines.length ? { accommodation_name: "Hotel", price_total: 0, extras: [
        { id: "e1", name: "Ontbijt", quantity: 20, unit_price: 10, pricing_type: "per_person", vat_rate: 9 },
        { id: "e2", name: "Ontbijt", quantity: 20, unit_price: 10, pricing_type: "per_person", vat_rate: 9 },
      ] } : null,
      settings,
      bundleExtras: false,
    });
    expect(unbundled.lines).toHaveLength(2);
  });

  it("gebruikt de fee-engine zodra er een structuur is, met de wijzigingsrondes als eigen regel", () => {
    const structure: FeeStructureSet = {
      model: "tiered_v2",
      coordination_fee: { tiers: [{ min_people: 1, max_people: 999999, base: 250 }], extra_day_pct: 50 },
      revision_fee: { amount: 75 },
      rush_surcharge: { pct: 0, weeks: 0 },
      central_invoicing_surcharge: { mode: "percentage", pct: 5, minimum: 0 },
    } as unknown as FeeStructureSet;
    const spec = buildProjectInvoiceSpec({
      request: { ...request, excluded_fees: ["tourist_tax", "nature_contribution"] },
      items: [item({ id: "a", quoted_price: 1000 })],
      settings,
      feeStructure: structure,
      revisionFeesTotal: 150,
    });
    expect(spec.totals.coordinationFee).toBe(375);
    expect(spec.totals.centralSurcharge).toBe(50);
    expect(spec.totals.revisionFees).toBe(150);
    expect(spec.lines.find((l) => l.kind === "revision")?.amountInclVat).toBe(150);
    expect(spec.totals.inclVat).toBe(1575);
  });

  it("trekt geregistreerde facturen af en telt creditnota's negatief", () => {
    const spec = buildProjectInvoiceSpec({
      request: { ...request, excluded_fees: ["tourist_tax", "nature_contribution", "coordination_fee", "central_surcharge"] },
      items: [item({ id: "a", quoted_price: 1000 })],
      settings,
      invoices: [
        { amount_excl_vat: 330.58, vat_amount: 69.42, amount_incl_vat: 400, invoice_type: "partial" },
        { amount_excl_vat: 82.64, vat_amount: 17.36, amount_incl_vat: 100, invoice_type: "credit" },
      ],
    });
    expect(spec.totals.invoiced).toBe(300);
    expect(spec.totals.outstanding).toBe(700);
  });

  it("meldt onderdelen zonder prijs en zelf geregelde onderdelen apart", () => {
    const spec = buildProjectInvoiceSpec({
      request,
      items: [item({ id: "a" }), item({ id: "b", block_type: "self_arranged", quoted_price: 10 })],
      settings,
    });
    expect(spec.unpricedItems.map((i) => i.id)).toEqual(["a"]);
    expect(spec.selfArrangedItems.map((i) => i.id)).toEqual(["b"]);
    expect(spec.totals.programItems).toBe(0);
  });

  it("zet de secties in factuurvolgorde", () => {
    const spec = buildProjectInvoiceSpec({
      request,
      items: [
        item({ id: "v", block_category: "vervoer", quoted_price: 10 }),
        item({ id: "c", block_category: "catering", quoted_price: 10 }),
      ],
      accommodation: { accommodation_name: "Hotel", price_total: 100, extras: [] },
      settings,
    });
    expect(spec.sections.map((s) => s.label)).toEqual(["Catering", "Vervoer", "Logies", "Coördinatie & bijdragen"]);
  });
});

describe("btw-groepen van een deelbedrag", () => {
  it("schaalt pro rata en sluit op de cent", () => {
    const scaled = scaleVatGroups(
      [
        { rate: 9, exclVat: 400, vatAmount: 36, inclVat: 436 },
        { rate: 21, exclVat: 50, vatAmount: 10.5, inclVat: 60.5 },
      ],
      250,
    );
    expect(scaled.reduce((s, g) => s + g.inclVat, 0)).toBeCloseTo(250, 2);
    for (const g of scaled) expect(g.exclVat + g.vatAmount).toBeCloseTo(g.inclVat, 2);
  });

  it("valt terug op 21 % zonder groepen", () => {
    const [g] = scaleVatGroups([], 121);
    expect(g).toEqual({ rate: 21, exclVat: 100, vatAmount: 21, inclVat: 121 });
  });
});

describe("facturen en openstaand (uit de oude facturatietotalen)", () => {
  const noFees = { ...request, excluded_fees: ["tourist_tax", "nature_contribution", "coordination_fee", "central_surcharge"] };

  it("verwerkt SnelStart-aanbetaling plus eindfactuur met negatieve netto-btw", () => {
    const spec = buildProjectInvoiceSpec({
      request: noFees,
      items: [item({ id: "a", quoted_price: 79400.6 })],
      settings,
      invoices: [
        { invoice_type: "partial", amount_excl_vat: 41322.31, vat_amount: 8677.69, amount_incl_vat: 50000 },
        { invoice_type: "final", amount_excl_vat: 16022.81, vat_amount: -76.1, amount_incl_vat: 15946.71 },
      ],
    });
    expect(spec.totals.invoiced).toBeCloseTo(65946.71, 2);
    expect(spec.totals.outstanding).toBeCloseTo(13453.89, 2);
  });

  it("maakt openstaand nooit negatief en telt geannuleerde onderdelen niet", () => {
    const spec = buildProjectInvoiceSpec({
      request: noFees,
      items: [item({ id: "a", quoted_price: 100 }), item({ id: "b", quoted_price: 9999, status: "cancelled" })],
      settings,
      invoices: [{ invoice_type: "final", amount_excl_vat: 10000, vat_amount: 2100, amount_incl_vat: 12100 }],
    });
    expect(spec.totals.programItems).toBe(100);
    expect(spec.totals.outstanding).toBe(0);
  });

  it("rekent een beheerprijs per persoon per dag uit over personen en dagen", () => {
    const spec = buildProjectInvoiceSpec({
      request: noFees,
      items: [item({ id: "a", admin_price_override: 25, price_type: "per_person_per_day" })],
      settings,
    });
    expect(spec.totals.programItems).toBe(25 * 20 * 2);
    expect(spec.lines[0]).toMatchObject({ quantityLabel: "20×2d", unitSuffix: "p.p.p.d.", isPreliminary: true });
  });
});
