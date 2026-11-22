// Tests voor de gedeelde partneraanvraag-mail (notificaties fase 3, WP8).
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildPartnerRequestMail,
  itemsSummary,
  partnerHandlingLine,
  partnerInvoiceInstruction,
  type PartnerRequestMailInput,
} from "./partnerRequestMail.ts";

const base: PartnerRequestMailInput = {
  partnerName: "Strandpaviljoen <Oost>",
  referenceNumber: "BV-2611-0042",
  customerLabel: "RMD Trainingen",
  dates: ["2026-12-04"],
  numberOfPeople: 12,
  items: [{ block_name: "Wadexcursie", preferred_time: "10:00" }],
  portalUrl: "https://bureauvlieland.nl/partner/login",
  customerSigned: true,
};

Deno.test("aanhef Hoi, referentie in onderwerp en tabel, naam gesanitized", () => {
  const mail = buildPartnerRequestMail(base);
  assertStringIncludes(mail.html, "Hoi Strandpaviljoen &lt;Oost&gt;,");
  assertStringIncludes(mail.subject, "(BV-2611-0042)");
  assertStringIncludes(mail.subject, "Wadexcursie");
  assertStringIncludes(mail.html, "<strong>BV-2611-0042</strong>");
  assertStringIncludes(mail.html, "RMD Trainingen");
  assertStringIncludes(mail.html, "⏰ Tijd: 10:00");
  // Geen eigen skelet: de aanroeper wikkelt dit in wrapEmailHtml.
  assertEquals(mail.html.includes("<html"), false);
  assertEquals(/\b(u|uw)\b/.test(mail.html.replace(/<[^>]+>/g, " ")), false, "spreekt partner met u aan");
});

Deno.test("klant getekend: 'bevestigd door klant'; niet getekend: onder voorbehoud", () => {
  const signed = buildPartnerRequestMail(base);
  assertStringIncludes(signed.subject, "Nieuwe aanvraag:");
  assertStringIncludes(signed.html, "We hopen dat het past");
  assertStringIncludes(signed.html, "akkoord gegeven en getekend");
  assertEquals(signed.html.includes("nog niet getekend"), false);

  const unsigned = buildPartnerRequestMail({ ...base, customerSigned: false });
  assertStringIncludes(unsigned.subject, "Nieuwe aanvraag (onder voorbehoud)");
  assertStringIncludes(unsigned.html, "nog niet getekend");
  assertStringIncludes(unsigned.html, "onder voorbehoud");
  assertEquals(unsigned.html.includes("getekend, onder voorbehoud van jullie beschikbaarheid"), false);
});

Deno.test("herinnering: eigen kop en onderwerp met onderdeelnaam", () => {
  const mail = buildPartnerRequestMail({ ...base, reminder: true });
  assertStringIncludes(mail.subject, "Herinnering: Wadexcursie staat nog open (BV-2611-0042)");
  assertStringIncludes(mail.html, "Herinnering: aanvraag staat nog open");
  assertStringIncludes(mail.html, "wacht op je reactie");
});

Deno.test("offerte-onderdeel op bureaufactuur: prijs gevraagd en facturatie-alinea", () => {
  const mail = buildPartnerRequestMail(base);
  assertEquals(mail.anyBureauInvoice, true);
  assertStringIncludes(mail.html, partnerHandlingLine("quote"));
  assertStringIncludes(mail.html, "geef daarbij je prijs door");
  assertStringIncludes(mail.html, partnerInvoiceInstruction("BV-2611-0042"));
  assertStringIncludes(
    mail.html,
    'Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie BV-2611-0042 erop. Wij factureren centraal aan de klant.',
  );
  assertEquals(/upload|inkoop@/i.test(mail.html), false);
});

Deno.test("bevestiging op verblijfsnota: geen prijs gevraagd, geen facturatie-alinea, wel verblijfsnota-regel", () => {
  const mail = buildPartnerRequestMail({
    ...base,
    items: [{ block_name: "Diner in het hotel", partner_handling: "confirm", billing_route: "partner_stay_invoice" }],
  });
  assertEquals(mail.anyBureauInvoice, false);
  assertEquals(mail.allInform, false);
  assertStringIncludes(mail.html, "een prijs of offerte is niet nodig");
  assertStringIncludes(mail.html, "op jouw eigen verblijfsnota");
  assertEquals(mail.html.includes("<strong>Facturatie:</strong>"), false);
  assertEquals(mail.html.includes("invoices@reply"), false);
  assertEquals(mail.html.includes("geef daarbij je prijs door"), false);
  assertEquals(mail.html.includes("met je prijs erbij"), false);
});

Deno.test("alleen mededelingen: ter kennisgeving, geen actie, knop 'Bekijk'", () => {
  const mail = buildPartnerRequestMail({
    ...base,
    items: [{ block_name: "Tafel 4 gereserveerd", partner_handling: "inform", billing_route: "customer_direct" }],
  });
  assertEquals(mail.allInform, true);
  assertEquals(mail.anyBureauInvoice, false);
  assertStringIncludes(mail.subject, "Ter kennisgeving: Tafel 4 gereserveerd (BV-2611-0042)");
  assertStringIncludes(mail.html, "je hoeft hier niets mee te doen");
  assertStringIncludes(mail.html, "Bekijk in partnerportaal");
  assertEquals(mail.html.includes("Reageer in partnerportaal"), false);
  assertEquals(mail.html.includes("bevestigen"), false);
});

Deno.test("gemengde groep: facturatie-alinea zodra één onderdeel op de bureaufactuur staat", () => {
  const mail = buildPartnerRequestMail({
    ...base,
    items: [
      { block_name: "Tafel 4 gereserveerd", partner_handling: "inform", billing_route: "customer_direct" },
      { block_name: "Fietstocht", partner_handling: "quote", billing_route: "bureau" },
    ],
  });
  assertEquals(mail.anyBureauInvoice, true);
  assertEquals(mail.allInform, false);
  assertStringIncludes(mail.subject, "2 onderdelen");
  assertStringIncludes(mail.html, "<strong>Facturatie:</strong>");
  assertEquals(itemsSummary([{ block_name: "a" }, { block_name: "b" }]), "2 onderdelen");
});

Deno.test("zonder referentie: geen referentieregel, geen lege haakjes in het onderwerp", () => {
  const mail = buildPartnerRequestMail({ ...base, referenceNumber: null });
  assertEquals(mail.html.includes("Referentie:"), false);
  assertEquals(mail.subject.includes("("), false);
  assertStringIncludes(mail.html, "met onze referentie erop");
  assert(!mail.html.includes("referentie  erop"));
});
