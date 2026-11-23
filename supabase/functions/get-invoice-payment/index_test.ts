import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildPaymentView } from "./index.ts";

const settings = { iban: "NL91ABNA0417164300", legalName: "Bureau Vlieland B.V.", paymentTermDays: 14 };
const row = {
  id: "x",
  invoice_number: "260041",
  invoice_date: "2026-11-23",
  amount_incl_vat: 1210,
  invoice_type: "partial",
  status: "pending",
  program_requests: { reference_number: "BV-2611-0001", billing_company_name: "Acme", customer_company: null, customer_name: "Jansen" },
};

Deno.test("buildPaymentView: open factuur krijgt vervaldatum en QR-tekst", () => {
  const view = buildPaymentView(row, settings);
  assertEquals(view.dueDate, "2026-12-07");
  assertEquals(view.customerLabel, "Acme");
  assertEquals(view.epcPayload?.split("\n")[7], "EUR1210.00");
  assertEquals(view.epcPayload?.split("\n")[10], "260041");
});

Deno.test("buildPaymentView: betaald of creditnota geeft geen QR", () => {
  assertEquals(buildPaymentView({ ...row, status: "paid" }, settings).epcPayload, null);
  assertEquals(buildPaymentView({ ...row, invoice_type: "credit" }, settings).isCredit, true);
  assertEquals(buildPaymentView({ ...row, invoice_type: "credit" }, settings).epcPayload, null);
});
