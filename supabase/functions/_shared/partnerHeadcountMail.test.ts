// Tests voor de gedeelde aantalwijzigingsmails aan partners (fase 3, WP8).
import { assertEquals, assertMatch, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildLodgingHeadcountMail, buildPartnerHeadcountMail } from "./partnerHeadcountMail.ts";
import { formatCurrencyNL } from "./email-templates.ts";

const strip = (html: string) => html.replace(/<[^>]+>/g, " ");

Deno.test("activiteitenmail: Hoi/je, referentie in onderwerp, prijs p.p. blijft staan, totaal herberekend", () => {
  const { subject, html } = buildPartnerHeadcountMail({
    partnerName: "Zeilschool <Noord>",
    customerLabel: "RMD Trainingen",
    reference: "BV-2611-0042",
    dates: "vrijdag 4 december 2026",
    oldPeople: 12,
    newPeople: 10,
    items: [{ blockName: "Zeiltocht", people: 10, unitPrice: 45, priceType: "per_person", newTotal: 450, oldTotal: 540 }],
    note: "Twee deelnemers hebben afgezegd.",
    portalUrl: "https://bureauvlieland.nl/partner/login",
  });
  assertEquals(subject, "Aantal gasten gewijzigd van 12 naar 10: Zeiltocht (BV-2611-0042)");
  assertStringIncludes(html, "Hoi Zeilschool &lt;Noord&gt;,");
  assertStringIncludes(html, "prijs per persoon blijft staan");
  // formatCurrencyNL gebruikt een vaste spatie; vergelijk daarom via de helper.
  assertStringIncludes(html, `${formatCurrencyNL(45)} p.p., nieuw totaal ${formatCurrencyNL(450)}`);
  assertStringIncludes(html, `(was ${formatCurrencyNL(540)})`);
  assertStringIncludes(html, "Twee deelnemers hebben afgezegd.");
  assertStringIncludes(html, "Referentie: BV-2611-0042");
  assertEquals(/\b(u|uw)\b/i.test(strip(html).replace(/Bureau Vlieland/g, "")), false, "geen u-vorm");
  assertEquals(html.includes("<html"), false);
});

Deno.test("activiteitenmail: meerdere onderdelen en eigen aantal", () => {
  const { subject, html } = buildPartnerHeadcountMail({
    partnerName: "Partner",
    customerLabel: null,
    reference: null,
    dates: "",
    oldPeople: null,
    newPeople: 8,
    items: [
      { blockName: "Fietstocht", people: 8, unitPrice: null, priceType: null, newTotal: null },
      { blockName: "Lunch", people: 6, unitPrice: 12.5, priceType: "per_person_per_day", newTotal: 150, overridePeople: 6 },
    ],
    portalUrl: "https://bureauvlieland.nl/partner/login",
  });
  assertEquals(subject, "Aantal gasten gewijzigd naar 8: 2 onderdelen");
  assertStringIncludes(html, "<strong>Lunch</strong>: 6 pers.");
  assertStringIncludes(html, "p.p.p.d.");
  assertStringIncludes(html, "eigen aantal (6)");
  assertEquals(html.includes("Referentie:"), false);
  assertEquals(html.includes("Datum(s)"), false);
});

Deno.test("logiespartner-mail vraagt om bevestiging van het nieuwe aantal, tutoyerend", () => {
  const { subject, html } = buildLodgingHeadcountMail({
    partnerName: "Badhotel Bruin",
    accommodationName: "Badhotel Bruin",
    customerLabel: "RMD Trainingen",
    arrival: "5 november 2026",
    departure: "6 november 2026",
    oldGuests: 10,
    newGuests: 8,
    currentPriceTotal: 1336,
    reference: "LOG-2608-0001",
    actionUrl: "https://bureauvlieland.nl/partner/logies/abc?actie=aantal",
    note: "Twee deelnemers hebben afgezegd.",
  });
  assertEquals(subject, "Nieuw aantal gasten bevestigen: 8 in plaats van 10 (LOG-2608-0001)");
  assertStringIncludes(html, "Nieuw aantal bevestigen");
  assertStringIncludes(html, "https://bureauvlieland.nl/partner/logies/abc?actie=aantal");
  assertStringIncludes(html, "voor 10 gasten");
  assertStringIncludes(html, "Twee deelnemers hebben afgezegd.");
  assertStringIncludes(html, "Hoi Badhotel Bruin");
  assertMatch(html, /Wil je het nieuwe aantal bevestigen/);
  assertEquals(/\b(u|uw)\b/i.test(strip(html).replace(/Bureau Vlieland/g, "")), false, "geen u-vorm");
  assertEquals(html.includes("—") || html.includes("→") || subject.includes("—"), false);
});
