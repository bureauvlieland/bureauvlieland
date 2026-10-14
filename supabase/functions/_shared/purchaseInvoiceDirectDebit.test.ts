import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { directDebitAmount } from "./purchaseInvoiceDirectDebit.ts";

Deno.test("zonder ingehouden commissie is er geen apart incassobedrag", () => {
  assertEquals(directDebitAmount({ amount_incl_vat: 348.85, supplier_commission_excl_vat: 0, supplier_commission_vat: 0 }), null);
  assertEquals(directDebitAmount({ amount_incl_vat: 348.85 }), null);
});

Deno.test("met ingehouden commissie: bruto minus commissie (excl. + btw)", () => {
  assertEquals(directDebitAmount({ amount_incl_vat: 1000, supplier_commission_excl_vat: 80, supplier_commission_vat: 0 }), 920);
  assertEquals(directDebitAmount({ amount_incl_vat: 1000, supplier_commission_excl_vat: 80, supplier_commission_vat: 16.8 }), 903.2);
});
