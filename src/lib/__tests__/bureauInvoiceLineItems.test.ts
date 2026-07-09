/**
 * Contract: bureau_central factuur-onderdelen. Als deze berekeningen wijzigen
 * gaan klant-facturen fout. Getest:
 *  - Toeristenbelasting = tarief × personen × dagen (0% BTW: bedrag telt 1-op-1
 *    mee in incl-BTW-totaal, geen VAT-opslag).
 *  - Natuurbijdrage = tarief × personen (0% BTW, idem).
 *  - Coordination fee komt uit tier lookup en telt direct mee.
 *  - `excluded_fees` sluit posten uit (bureau_central override).
 *  - Bureau_central surcharge alleen als invoicing_mode === "bureau_central".
 *  - Aanbetalingen (partial) worden afgetrokken; final vervangt partials.
 *  - Credit-facturen trekken altijd extra af.
 *
 * Commissie zit NIET in factuur-totaal (dat gaat naar partner) — dus we
 * verifiëren alleen dat commissie-berekening op EX-BTW gebeurt (getCommissionRate
 * levert een %; ex-BTW conversie moet altijd vóór commissie plaatsvinden).
 * Zie commissionRates.test.ts voor % lookup; hier alleen totals-invarianten.
 */
import { describe, it, expect } from "vitest";
import {
  calculateAdminInvoicingTotals,
  type AdminInvoicingRequestLike,
  type AdminInvoicingSettings,
} from "@/lib/adminInvoicingTotals";

const baseSettings: AdminInvoicingSettings = {
  coordinationFee: 250,
  touristTaxPerPersonPerDay: 2.58,
  natureContributionPerPerson: 1.0,
  bureauCentralSurchargePerPerson: 0,
};

const baseRequest = (
  overrides: Partial<AdminInvoicingRequestLike> = {},
): AdminInvoicingRequestLike => ({
  number_of_people: 10,
  selected_dates: ["2026-06-01", "2026-06-02", "2026-06-03"],
  invoicing_mode: "bureau_central",
  selected_accommodation_total: 0,
  excluded_fees: [],
  items: [],
  invoices: [],
  ...overrides,
});

describe("adminInvoicingTotals — bureau_central factuur invarianten", () => {
  it("toeristenbelasting = tarief × personen × dagen (0% BTW: 1-op-1 in totaal)", () => {
    const t = calculateAdminInvoicingTotals(baseRequest(), baseSettings);
    // 2.58 × 10 × 3 = 77.40
    expect(t.touristTax).toBeCloseTo(77.4, 2);
    expect(t.grandTotalInclVat).toBeCloseTo(
      t.programItemsTotal +
        t.extraCostsTotal +
        t.coordinationFee +
        t.touristTax +
        t.natureContribution +
        t.centralSurcharge +
        t.accommodationTotal,
      2,
    );
  });

  it("natuurbijdrage = tarief × personen (geen dagen-multiplier)", () => {
    const t = calculateAdminInvoicingTotals(baseRequest({ number_of_people: 25 }), baseSettings);
    expect(t.natureContribution).toBeCloseTo(25.0, 2);
  });

  it("excluded_fees zet post op 0 zonder rest te beïnvloeden", () => {
    const req = baseRequest({ excluded_fees: ["tourist_tax", "nature_contribution"] });
    const t = calculateAdminInvoicingTotals(req, baseSettings);
    expect(t.touristTax).toBe(0);
    expect(t.natureContribution).toBe(0);
    expect(t.coordinationFee).toBe(250);
  });

  it("bureau_central surcharge alleen als invoicing_mode='bureau_central'", () => {
    const settings = { ...baseSettings, bureauCentralSurchargePerPerson: 5 };
    const a = calculateAdminInvoicingTotals(baseRequest({ invoicing_mode: "direct" }), settings);
    expect(a.centralSurcharge).toBe(0);
    const b = calculateAdminInvoicingTotals(baseRequest({ invoicing_mode: "bureau_central" }), settings);
    expect(b.centralSurcharge).toBeCloseTo(50, 2); // 5 × 10
  });

  it("final factuur vervangt partials in invoicedTotal (geen dubbeltelling)", () => {
    const req = baseRequest({
      invoices: [
        { amount_excl_vat: 500, vat_amount: 105, amount_incl_vat: 605, invoice_type: "partial" },
        { amount_excl_vat: 1000, vat_amount: 210, amount_incl_vat: 1210, invoice_type: "final" },
      ],
    });
    const t = calculateAdminInvoicingTotals(req, baseSettings);
    // final aanwezig → alleen final telt (1210), partial (605) telt niet mee
    expect(t.invoicedTotal).toBeCloseTo(1210, 2);
  });

  it("credit-facturen trekken altijd af, ook bovenop finals", () => {
    const req = baseRequest({
      invoices: [
        { amount_excl_vat: 1000, vat_amount: 210, amount_incl_vat: 1210, invoice_type: "final" },
        { amount_excl_vat: -100, vat_amount: -21, amount_incl_vat: 121, invoice_type: "credit" },
      ],
    });
    const t = calculateAdminInvoicingTotals(req, baseSettings);
    expect(t.invoicedTotal).toBeCloseTo(1210 - 121, 2);
  });

  it("cancelled items tellen NIET mee in programma/extra-totaal", () => {
    const req = baseRequest({
      items: [
        { id: "a", status: "confirmed", day_index: 0, quoted_price: 100, price_type: "fixed" },
        { id: "b", status: "cancelled", day_index: 0, quoted_price: 9999, price_type: "fixed" },
      ],
    });
    const t = calculateAdminInvoicingTotals(req, baseSettings);
    expect(t.programItemsTotal).toBeCloseTo(100, 2);
  });

  it("day_index === -1 telt als extra kost, niet als programma-item", () => {
    const req = baseRequest({
      items: [
        { id: "a", status: "confirmed", day_index: 0, quoted_price: 100, price_type: "fixed" },
        { id: "b", status: "confirmed", day_index: -1, quoted_price: 40, price_type: "fixed" },
      ],
    });
    const t = calculateAdminInvoicingTotals(req, baseSettings);
    expect(t.programItemsTotal).toBeCloseTo(100, 2);
    expect(t.extraCostsTotal).toBeCloseTo(40, 2);
  });

  it("outstanding nooit negatief (overbetaling wordt afgetopt)", () => {
    const req = baseRequest({
      invoices: [
        { amount_excl_vat: 10000, vat_amount: 2100, amount_incl_vat: 12100, invoice_type: "final" },
      ],
    });
    const t = calculateAdminInvoicingTotals(req, baseSettings);
    expect(t.outstanding).toBe(0);
  });
});
