import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { adminRequestUrl, buildBureauHtml, buildCustomerHtml, bureauSubject, customerSubject, type CateringMailInput } from "./mail.ts";

const input: CateringMailInput = {
  requestId: "11111111-1111-4111-8111-111111111111",
  referenceNumber: "BV-2611-0042",
  contact: { name: "Anna & Bram", company: "", email: "anna@example.test", phone: "0612345678", notes: "Graag <b>vega</b>", dietary: "" },
  cateringType: "Walking dinner",
  date: "zaterdag 6 juni 2027",
  startTime: "18:00",
  locationText: "Strandpaviljoen",
  hasHorecaOnSite: true,
  guests: 40,
  items: [{ name: "Hapjes", priceIndication: "€ 12,50 p.p." }],
  indicativeTotal: 500,
  baseUrl: "https://bureauvlieland.nl",
};

Deno.test("onderwerpen dragen het dossiernummer", () => {
  assertEquals(customerSubject("BV-2611-0042"), "Bevestiging van uw cateringaanvraag (BV-2611-0042)");
  assertEquals(customerSubject(""), "Bevestiging van uw cateringaanvraag");
  assertEquals(bureauSubject(input), "Nieuwe cateringaanvraag — Walking dinner · 40 personen · zaterdag 6 juni 2027 (BV-2611-0042)");
});

Deno.test("klantmail: u-vorm, 5 werkdagen zoals de site belooft, tekst ontsmet", () => {
  const html = buildCustomerHtml(input);
  assertStringIncludes(html, "Beste Anna &amp; Bram");
  assertStringIncludes(html, "binnen 5 werkdagen");
  assertStringIncludes(html, "&lt;b&gt;vega&lt;/b&gt;");
  assertEquals(html.includes("<b>vega</b>"), false);
  assertEquals(html.includes("2 werkdagen"), false);
});

Deno.test("bureaumail: Aan zet met de beloofde termijn en een deeplink naar de aanvraag", () => {
  const html = buildBureauHtml(input);
  assertStringIncludes(html, "Aan zet:");
  assertStringIncludes(html, "binnen 5 werkdagen");
  assertStringIncludes(html, adminRequestUrl("https://bureauvlieland.nl", input.requestId));
  assertStringIncludes(html, "/admin/aanvragen/11111111-1111-4111-8111-111111111111");
  assertEquals(html.includes("/admin/projecten\""), false);
});
