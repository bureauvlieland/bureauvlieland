import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { collectiveInvoiceTotals } from "./collectiveInvoiceTotals.ts";

/** Factuur 3263498 van 30 september 2026: één retourboeking van 17 personen. */
const doeksen = {
  total_incl_vat: 549.44,
  total_tourist_tax: 43.86,
  total_supplier_commission: 27.48,
  net_to_pay: 565.82,
};

Deno.test("ziet aan het nettobedrag dat de toeristenbelasting bovenop het totaal komt", () => {
  const t = collectiveInvoiceTotals(doeksen);
  assertEquals(t.touristTaxIncluded, false);
  assertEquals(t.grossInclTouristTax, 593.3);
  assertEquals(t.expectedNetToPay, 565.82);
});

Deno.test("ziet aan het nettobedrag als de toeristenbelasting al in het totaal zit", () => {
  const t = collectiveInvoiceTotals({ ...doeksen, total_incl_vat: 593.3 });
  assertEquals(t.touristTaxIncluded, true);
  assertEquals(t.grossInclTouristTax, 593.3);
  assertEquals(t.expectedNetToPay, 565.82);
});

Deno.test("gaat zonder nettobedrag uit van de kolomindeling van Doeksen: erbovenop", () => {
  const t = collectiveInvoiceTotals({ ...doeksen, net_to_pay: null });
  assertEquals(t.touristTaxIncluded, false);
  assertEquals(t.expectedNetToPay, 565.82);
});

Deno.test("zonder toeristenbelasting is het gewoon totaal minus commissie", () => {
  const t = collectiveInvoiceTotals({ total_incl_vat: 1000, total_supplier_commission: 80, total_tourist_tax: 0 });
  assertEquals(t.touristTax, 0);
  assertEquals(t.grossInclTouristTax, 1000);
  assertEquals(t.expectedNetToPay, 920);
});
