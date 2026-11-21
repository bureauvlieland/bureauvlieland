// Contracttest (notificaties fase 1 en 3): de partnermail van
// send-items-to-partners komt uit de gedeelde generator
// (_shared/partnerRequestMail.ts) met de standaard facturatiezin (inboxroute
// invoices@ met referentie), zonder upload- of inkoop@-instructie, en
// partnerBillingNote tutoyeert.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { partnerBillingNote } from "../_shared/itemHandling.ts";
import { buildPartnerRequestMail } from "../_shared/partnerRequestMail.ts";

const here = new URL(".", import.meta.url);
const indexSrc = await Deno.readTextFile(new URL("./index.ts", here));
const handlingSrc = await Deno.readTextFile(new URL("../_shared/itemHandling.ts", here));
const mailSrc = await Deno.readTextFile(new URL("../_shared/partnerRequestMail.ts", here));

Deno.test("send-items-to-partners: geen upload- of inkoop@-instructie meer", () => {
  for (const [name, src] of [["index.ts", indexSrc], ["partnerRequestMail.ts", mailSrc]] as const) {
    assert(!/upload/i.test(src), `${name} noemt nog 'upload'`);
    assert(!src.includes("inkoop@reply"), `${name} noemt nog inkoop@reply`);
  }
});

Deno.test("send-items-to-partners: gebruikt de gedeelde generator en de huisstijlwrapper", () => {
  assertStringIncludes(indexSrc, "buildPartnerRequestMail(");
  assertStringIncludes(indexSrc, "wrapEmailHtml(mail.html, supabase)");
  assertStringIncludes(indexSrc, "customerSigned: !!program.terms_accepted_at");
  assertStringIncludes(indexSrc, "reminder: isReminderForGroup");
  assertEquals(indexSrc.includes("function generatePartnerNotificationEmail"), false);
});

Deno.test("send-items-to-partners: standaard facturatiezin met referentie", () => {
  const mail = buildPartnerRequestMail({
    partnerName: "Partner",
    referenceNumber: "BV-2611-0001",
    customerLabel: "Klant",
    dates: ["2026-12-01"],
    numberOfPeople: 10,
    items: [{ block_name: "Wadexcursie" }],
    portalUrl: "https://bureauvlieland.nl/partner/login",
    customerSigned: true,
  });
  assertStringIncludes(mail.html, "Mail na uitvoering de pdf van je factuur naar");
  assertStringIncludes(mail.html, '<a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie BV-2611-0001 erop. Wij factureren centraal aan de klant.');
});

Deno.test("partnerBillingNote tutoyeert en noemt geen upload", () => {
  assert(!/upload/i.test(handlingSrc));
  for (const route of ["partner_stay_invoice", "customer_direct"]) {
    const note = partnerBillingNote({ billing_route: route })!;
    assert(note, `geen tekst voor ${route}`);
    assert(!/\b(uw|U)\b/.test(note), `'${note}' spreekt met u/uw`);
    assert(/\b(je|jou|jouw)\b/.test(note), `'${note}' tutoyeert niet`);
  }
  assertEquals(partnerBillingNote({ billing_route: "bureau" }), null);
});
