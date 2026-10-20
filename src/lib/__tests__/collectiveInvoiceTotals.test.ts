import { describe, expect, it } from "vitest";
import { collectiveInvoiceTotals } from "@/lib/collectiveInvoiceTotals";

/** Factuur 3263498 van 30 september 2026: één retourboeking van 17 personen. */
const doeksen = {
  total_incl_vat: 549.44,
  total_tourist_tax: 43.86,
  total_supplier_commission: 27.48,
  net_to_pay: 565.82,
};

describe("collectiveInvoiceTotals", () => {
  it("ziet aan het nettobedrag dat de toeristenbelasting bovenop het totaal komt", () => {
    const t = collectiveInvoiceTotals(doeksen);
    expect(t.touristTaxIncluded).toBe(false);
    expect(t.grossInclTouristTax).toBe(593.3);
    // Precies wat Doeksen afschrijft — en wat de bankmatching dus moet zoeken.
    expect(t.expectedNetToPay).toBe(565.82);
  });

  it("ziet aan het nettobedrag als de toeristenbelasting al in het totaal zit", () => {
    const t = collectiveInvoiceTotals({ ...doeksen, total_incl_vat: 593.3 });
    expect(t.touristTaxIncluded).toBe(true);
    expect(t.grossInclTouristTax).toBe(593.3);
    expect(t.expectedNetToPay).toBe(565.82);
  });

  it("gaat zonder nettobedrag uit van de kolomindeling van Doeksen: erbovenop", () => {
    const t = collectiveInvoiceTotals({ ...doeksen, net_to_pay: null });
    expect(t.touristTaxIncluded).toBe(false);
    expect(t.expectedNetToPay).toBe(565.82);
  });

  it("zonder toeristenbelasting is het gewoon totaal minus commissie", () => {
    const t = collectiveInvoiceTotals({ total_incl_vat: 1000, total_supplier_commission: 80, total_tourist_tax: 0 });
    expect(t.touristTax).toBe(0);
    expect(t.grossInclTouristTax).toBe(1000);
    expect(t.expectedNetToPay).toBe(920);
  });

  it("zonder ingehouden commissie incasseert de partner het hele bedrag", () => {
    const t = collectiveInvoiceTotals({ total_incl_vat: 348.85, total_tourist_tax: 10, net_to_pay: 358.85 });
    expect(t.expectedNetToPay).toBe(358.85);
  });
});
