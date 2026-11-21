import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSummaryHtml, collectiveInvoiceSubject, projectLabel } from "./summary.ts";

Deno.test("projectkolom leesbaar: gekoppeld aan BV-…, intern, niet gekoppeld", () => {
  const refs = { "req-1": "BV-2611-0007" };
  assertEquals(projectLabel({ item_id: "it-1", match_status: "matched", request_id: "req-1" }, refs), "gekoppeld aan BV-2611-0007");
  assertEquals(projectLabel({ item_id: null, match_status: "manual", request_id: "req-2" }, refs), "gekoppeld aan een project");
  assertEquals(projectLabel({ item_id: null, match_status: "internal", request_id: null }, refs), "intern (bureau)");
  assertEquals(projectLabel({ item_id: null, match_status: "unmatched", request_id: null }, refs), "niet gekoppeld");
});

Deno.test("bedragen in Nederlandse notatie, ook in het onderwerp", () => {
  const html = buildSummaryHtml(
    { invoice_number: "DOEKSEN-42", invoice_date: "2026-11-20", total_incl_vat: 1234.5, total_supplier_commission: 61.73 },
    [{ resnr: "R1", customer_name: "Smit & Co", departure_dates: ["2026-11-01"], amount_incl_vat: 402.97, match_status: "matched", item_id: "it", request_id: "req-1" }],
    1300,
    { "req-1": "BV-2611-0007" },
  );
  assertStringIncludes(html, "402,97");
  assertStringIncludes(html, "1.234,50");
  assertStringIncludes(html, "Toeristenbelasting");
  assertStringIncludes(html, "Smit &amp; Co");
  assertStringIncludes(html, "gekoppeld aan BV-2611-0007");
  assertEquals(html.includes("€ 402.97"), false);
  assertStringIncludes(collectiveInvoiceSubject("DOEKSEN-42", 1234.5), "verzamelfactuur (");
  assertStringIncludes(collectiveInvoiceSubject("DOEKSEN-42", 1234.5), "1.234,50");
});
