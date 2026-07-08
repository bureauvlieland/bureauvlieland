import { describe, it, expect } from "vitest";
import { calculateAdminInvoicingTotals } from "@/lib/adminInvoicingTotals";

const baseSettings = {
  coordinationFee: 50,
  touristTaxPerPersonPerDay: 2.58,
  natureContributionPerPerson: 1.0,
  bureauCentralSurchargePerPerson: 0.5,
};

function makeRequest(overrides: any = {}) {
  return {
    number_of_people: 10,
    selected_dates: ["2026-07-01", "2026-07-02"],
    items: [],
    invoices: [],
    ...overrides,
  };
}

function makeItem(overrides: any = {}) {
  return {
    id: "i1",
    status: "confirmed",
    day_index: 0,
    quoted_price: null,
    admin_price_override: null,
    price_type: "per_person",
    override_people: null,
    ...overrides,
  };
}

describe("calculateAdminInvoicingTotals", () => {
  it("leeg project geeft alleen vaste kosten en 0 uitstaand", () => {
    const r = calculateAdminInvoicingTotals(makeRequest(), baseSettings);
    expect(r.programItemsTotal).toBe(0);
    expect(r.coordinationFee).toBe(50);
    expect(r.touristTax).toBe(2.58 * 10 * 2);
    expect(r.natureContribution).toBe(1.0 * 10);
    expect(r.centralSurcharge).toBe(0);
    expect(r.grandTotalInclVat).toBe(50 + 51.6 + 10);
    expect(r.outstanding).toBe(r.grandTotalInclVat);
  });

  it("quoted_price item telt 1-op-1 in programItemsTotal", () => {
    const r = calculateAdminInvoicingTotals(
      makeRequest({ items: [makeItem({ quoted_price: 500 })] }),
      baseSettings,
    );
    expect(r.programItemsTotal).toBe(500);
    expect(r.grandTotalInclVat).toBe(500 + 50 + 51.6 + 10);
  });

  it("per_person admin override × aantal personen × dagen", () => {
    const r = calculateAdminInvoicingTotals(
      makeRequest({ items: [makeItem({ admin_price_override: 25, price_type: "per_person_per_day" })] }),
      baseSettings,
    );
    expect(r.programItemsTotal).toBe(25 * 10 * 2);
  });

  it("geannuleerde items tellen niet mee", () => {
    const r = calculateAdminInvoicingTotals(
      makeRequest({ items: [makeItem({ quoted_price: 500, status: "cancelled" })] }),
      baseSettings,
    );
    expect(r.programItemsTotal).toBe(0);
  });

  it("day_index -1 telt als extraCostsTotal", () => {
    const r = calculateAdminInvoicingTotals(
      makeRequest({ items: [makeItem({ quoted_price: 120, day_index: -1 })] }),
      baseSettings,
    );
    expect(r.extraCostsTotal).toBe(120);
    expect(r.programItemsTotal).toBe(0);
  });

  it("excluded_fees schakelt kosten uit", () => {
    const r = calculateAdminInvoicingTotals(
      makeRequest({ excluded_fees: ["tourist_tax", "nature_contribution"] }),
      baseSettings,
    );
    expect(r.touristTax).toBe(0);
    expect(r.natureContribution).toBe(0);
  });

  it("bureau_central mode activeert central surcharge", () => {
    const r = calculateAdminInvoicingTotals(
      makeRequest({ invoicing_mode: "bureau_central" }),
      baseSettings,
    );
    expect(r.centralSurcharge).toBe(0.5 * 10);
  });

  it("accommodatie-totaal wordt opgeteld", () => {
    const r = calculateAdminInvoicingTotals(
      makeRequest({ selected_accommodation_total: 800 }),
      baseSettings,
    );
    expect(r.accommodationTotal).toBe(800);
  });

  it("partiële factuur vermindert outstanding", () => {
    const r = calculateAdminInvoicingTotals(
      makeRequest({
        items: [makeItem({ quoted_price: 500 })],
        invoices: [{ invoice_type: "partial", amount_excl_vat: 200, vat_amount: 42, amount_incl_vat: 242 }],
      }),
      baseSettings,
    );
    expect(r.invoicedTotal).toBe(242);
    expect(r.outstanding).toBe(r.grandTotalInclVat - 242);
  });

  it("eindfactuur overschrijft partiële facturen", () => {
    const partial = { invoice_type: "partial", amount_excl_vat: 100, vat_amount: 21, amount_incl_vat: 121 };
    const final = { invoice_type: "final", amount_excl_vat: 400, vat_amount: 84, amount_incl_vat: 484 };
    const r = calculateAdminInvoicingTotals(
      makeRequest({
        items: [makeItem({ quoted_price: 500 })],
        invoices: [partial, final],
      }),
      baseSettings,
    );
    expect(r.invoicedTotal).toBe(484);
  });

  it("creditfactuur wordt afgetrokken", () => {
    const r = calculateAdminInvoicingTotals(
      makeRequest({
        invoices: [{ invoice_type: "credit", amount_excl_vat: 100, vat_amount: 21, amount_incl_vat: 121 }],
      }),
      baseSettings,
    );
    expect(r.invoicedTotal).toBe(-121);
    expect(r.outstanding).toBe(r.grandTotalInclVat + 121);
  });

  it("use_actual_costs + billing lines overschrijven item totaal", () => {
    const item = makeItem({ quoted_price: 500, use_actual_costs: true });
    const lines = { i1: [{ item_id: "i1", amount_incl_vat: 320 }] };
    const r = calculateAdminInvoicingTotals(makeRequest({ items: [item] }), baseSettings, lines);
    expect(r.programItemsTotal).toBe(320);
  });
});
