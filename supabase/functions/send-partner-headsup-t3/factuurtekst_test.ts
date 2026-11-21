// Contracttest (notificaties fase 1 en 3): de heads-up T-3 rendert de
// DB-template partner_headsup_t3; template én noodrem gebruiken de standaard
// facturatiezin (inboxroute invoices@ met referentie), alleen bij een
// onderdeel op de bureaufactuur. Geen "Factuur registreren" of uploadknop meer.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildHeadsupMail, isHeadsupCandidate } from "./headsup-mail.ts";

const here = new URL(".", import.meta.url);
const src = await Deno.readTextFile(new URL("./index.ts", here));
const helper = await Deno.readTextFile(new URL("./headsup-mail.ts", here));
const migration = await Deno.readTextFile(new URL("../../migrations/20261121160000_partnermails-fase3.sql", here));

const baseInput = {
  partnerName: "Zeilschool <Noord>",
  blockName: "Zeiltocht",
  activityDate: "2026-12-04",
  effectiveTime: "14:00",
  durationMinutes: 120,
  people: 12,
  location: "Haven Oost-Vlieland",
  referenceNumber: "BV-2611-0042",
  customerLabel: "RMD Trainingen",
  partnerInstructions: "Graag zwemvesten\nvoor iedereen",
  guestNames: null,
  dietaryNotes: null,
  guestsUpdatedAt: null,
  invoicingMode: "bureau_central",
  item: { partner_handling: "quote", billing_route: "bureau" },
  portalUrl: "https://bureauvlieland.nl/partner/login",
};

Deno.test("send-partner-headsup-t3: geen upload-/registreerknop, inkoop@ of admin_price_notes meer", () => {
  for (const [name, text] of [["index.ts", src], ["headsup-mail.ts", helper]] as const) {
    assert(!/upload/i.test(text), `${name} noemt nog 'upload'`);
    assert(!text.includes("Factuur registreren"), `${name} verwijst nog naar de knop 'Factuur registreren'`);
    assert(!text.includes("inkoop@reply"), `${name} noemt nog inkoop@reply`);
  }
  assertEquals(/select\([^)]*admin_price_notes/.test(src), false, "admin_price_notes wordt niet meer opgehaald");
  assertEquals(/admin_price_notes\s*:/.test(helper), false, "admin_price_notes is geen templatevariabele");
});

Deno.test("send-partner-headsup-t3: rendert de DB-template partner_headsup_t3 met noodrem in de huisstijl", () => {
  assertStringIncludes(src, 'getRenderedTemplate(HEADSUP_TEMPLATE_ID');
  assertStringIncludes(src, "wrapEmailHtml(mail.fallbackHtml, supabase)");
  assertStringIncludes(migration, "'partner_headsup_t3'");
  assertStringIncludes(migration, "{{#if bureau_invoice}}");
});

Deno.test("send-partner-headsup-t3: standaard facturatiezin met referentie, alleen bij bureaufactuur", () => {
  const mail = buildHeadsupMail(baseInput);
  assertEquals(mail.bureauInvoice, true);
  assertEquals(mail.variables.bureau_invoice, "1");
  assertStringIncludes(
    mail.fallbackHtml,
    'Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie BV-2611-0042 erop. Wij factureren centraal aan de klant.',
  );
  assertStringIncludes(
    migration,
    'Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie {{reference_number}} erop. Wij factureren centraal aan de klant.',
  );

  const stay = buildHeadsupMail({ ...baseInput, item: { partner_handling: "confirm", billing_route: "partner_stay_invoice" } });
  assertEquals(stay.bureauInvoice, false);
  assertEquals(stay.variables.bureau_invoice, "");
  assertEquals(stay.fallbackHtml.includes("invoices@reply"), false);

  const direct = buildHeadsupMail({ ...baseInput, invoicingMode: "partner_direct" });
  assertEquals(direct.bureauInvoice, false);
});

Deno.test("send-partner-headsup-t3: aanhef Hoi, referentie in onderwerp, tekst gesanitized en instructie met regelafbrekingen", () => {
  const mail = buildHeadsupMail(baseInput);
  assertEquals(mail.subject.endsWith("(BV-2611-0042)"), true);
  assertStringIncludes(mail.subject, "Over 3 dagen: Zeiltocht op");
  assertStringIncludes(mail.fallbackHtml, "Hoi Zeilschool &lt;Noord&gt;,");
  assertEquals(mail.variables.partner_instructions, "Graag zwemvesten<br>voor iedereen");
  assertEquals(mail.variables.duration, "120 min");
  assertEquals(mail.fallbackHtml.includes("<html"), false);
});

Deno.test("send-partner-headsup-t3: statusfilter — accepted, of confirmed met klantakkoord; geen mededelingen", () => {
  assertEquals(isHeadsupCandidate({ status: "accepted" }), true);
  assertEquals(isHeadsupCandidate({ status: "confirmed", customer_approved_at: "2026-11-01T00:00:00Z" }), true);
  assertEquals(isHeadsupCandidate({ status: "confirmed", customer_accepted_at: "2026-11-01T00:00:00Z" }), true);
  assertEquals(isHeadsupCandidate({ status: "confirmed" }), false, "door partner bevestigd maar klant koos nog niet");
  assertEquals(isHeadsupCandidate({ status: "pending", customer_approved_at: "2026-11-01T00:00:00Z" }), false);
  assertEquals(isHeadsupCandidate({ status: "accepted", partner_handling: "inform" }), false, "mededeling krijgt geen briefing");
  assertEquals(isHeadsupCandidate({ status: "accepted", partner_handling: "confirm" }), true);
});
