import { describe, it, expect } from "vitest";
import { buildProjectInvoiceSpec, type SpecSettingsInput } from "@/lib/projectInvoiceSpec";
import {
  chooseStoredLines,
  specToStoredLines,
  summaryStoredLines,
  totalsFromStoredLines,
} from "@/lib/bureauInvoiceLines";
import { specToCategories, storedLinesToCategories, summaryCategory } from "@/lib/invoiceDisplayLines";

const settings: SpecSettingsInput = {
  coordination_fee_tiers: [{ maxPeople: 999, fee: 300 }],
  tourist_tax_pp_per_day: 2.5,
  nature_contribution_pp: 1,
  bureau_central_surcharge_pp: 0.5,
  default_vat_rate: 21,
  accommodation_vat_rate: 9,
};

const spec = buildProjectInvoiceSpec({
  request: { number_of_people: 20, selected_dates: ["2026-09-15"], invoicing_mode: "bureau_central", excluded_fees: ["nature_contribution"] },
  items: [
    { id: "a", block_name: "Zeehondentocht", block_category: "excursies", provider_name: "Zeehondentochten", status: "confirmed", day_index: 0, quoted_price: 500, price_type: "per_person" },
    { id: "b", block_name: "Lunch", block_category: "catering", provider_name: "De Bolder", status: "confirmed", day_index: 0, quoted_price: null, price_type: "per_person" },
  ],
  linesByItem: {
    b: [
      { item_id: "b", description: "Broodjes", quantity: 20, unit_price_excl_vat: 10, vat_rate: 9, amount_excl_vat: 200, vat_amount: 18, amount_incl_vat: 218 },
      { item_id: "b", description: "Zaalhuur", quantity: 1, unit_price_excl_vat: 100, vat_rate: 21, amount_excl_vat: 100, vat_amount: 21, amount_incl_vat: 121 },
    ],
  },
  accommodation: { accommodation_name: "Hotel", price_total: 1090, vat_rate: 9, extras: [] },
  settings,
});

describe("bevroren factuurregels", () => {
  it("zet de specificatie om in regels met groepen en subregels, in sectievolgorde", () => {
    const rows = specToStoredLines(spec);
    expect(rows.map((r) => r.kind)).toEqual(["item_group", "sub", "sub", "item", "lodging", "fee", "fee", "fee"]);
    expect(rows[0]).toMatchObject({ section: "Catering", description: "Lunch", item_id: "b", amount_incl_vat: 339 });
    expect(rows[1]).toMatchObject({ description: "Broodjes", quantity: 20, unit_price_excl_vat: 10, vat_rate: 9 });
    expect(rows[3]).toMatchObject({ section: "Excursies", description: "Zeehondentocht", quantity: 20, unit_suffix: "p.p.", amount_incl_vat: 500 });
    expect(rows.map((r) => r.sort_order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("telt groepen niet dubbel: totalen uit de regels sluiten op de specificatie", () => {
    const totals = totalsFromStoredLines(specToStoredLines(spec));
    expect(totals.inclVat).toBeCloseTo(spec.totals.inclVat, 2);
    expect(totals.vatGroups.map((g) => g.rate)).toEqual(spec.vatGroups.map((g) => g.rate));
    for (const [i, g] of totals.vatGroups.entries()) {
      expect(g.exclVat).toBeCloseTo(spec.vatGroups[i].exclVat, 1);
      expect(g.vatAmount).toBeCloseTo(spec.vatGroups[i].vatAmount, 1);
    }
  });

  it("maakt per btw-tarief één samenvattende regel voor een deelfactuur", () => {
    const rows = summaryStoredLines({
      invoiceType: "partial",
      invoiceNumber: "FV-2026-001",
      subDescription: "Aanbetaling",
      vatGroups: [
        { rate: 9, exclVat: 100, vatAmount: 9, inclVat: 109 },
        { rate: 21, exclVat: 200, vatAmount: 42, inclVat: 242 },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: "summary", section: "Deelfactuur", description: "Deelfactuur FV-2026-001 — btw 9%", amount_incl_vat: 109 });
    expect(rows[1].sub_description).toBe("Aanbetaling");
  });

  it("kiest de volledige specificatie alleen voor een eindfactuur die het hele project dekt", () => {
    const full = chooseStoredLines({
      spec,
      invoiceType: "final",
      invoiceNumber: "FV-1",
      amountInclVat: spec.totals.inclVat,
      alreadyInvoicedInclVat: 0,
      vatGroups: spec.vatGroups,
    });
    expect(full[0].kind).toBe("item_group");
    const rest = chooseStoredLines({
      spec,
      invoiceType: "final",
      invoiceNumber: "FV-2",
      amountInclVat: 500,
      alreadyInvoicedInclVat: spec.totals.inclVat - 500,
      vatGroups: [{ rate: 21, exclVat: 413.22, vatAmount: 86.78, inclVat: 500 }],
    });
    expect(rest).toHaveLength(1);
    expect(rest[0]).toMatchObject({ kind: "summary", description: "Eindfactuur FV-2" });
  });

  it("vertaalt specificatie en opgeslagen regels naar dezelfde factuurregels", () => {
    const fmt = (n: number) => n.toFixed(2);
    const fromSpec = specToCategories(spec, fmt);
    const fromStored = storedLinesToCategories(specToStoredLines(spec), fmt);
    expect(fromStored.map((c) => c.label)).toEqual(fromSpec.map((c) => c.label));
    expect(fromStored.flatMap((c) => c.rows.map((r) => [r.description, r.qty, r.amount, Boolean(r.isSubRow), Boolean(r.bold)])))
      .toEqual(fromSpec.flatMap((c) => c.rows.map((r) => [r.description, r.qty, r.amount, Boolean(r.isSubRow), Boolean(r.bold)])));
    expect(storedLinesToCategories(specToStoredLines(spec), fmt, -1)[0].rows[0].amount).toBe("-339.00");
  });

  it("maakt één samenvattende regel voor een slotfactuur", () => {
    const cat = summaryCategory({ label: "Termijnfactuur", description: "Slotfactuur BV-1", subDescription: "Restant", amountInclVat: 250 }, (n) => `${n}`);
    expect(cat.rows).toEqual([{ description: "Slotfactuur BV-1", subDescription: "Restant", qty: "1", unitPrice: "250", amount: "250" }]);
  });
});
