// Contracttest (notificaties fase 1): de partnermail van send-items-to-partners
// gebruikt de standaard facturatiezin (inboxroute invoices@ met referentie),
// zonder upload- of inkoop@-instructie, en partnerBillingNote tutoyeert.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { partnerBillingNote } from "../_shared/itemHandling.ts";

const here = new URL(".", import.meta.url);
const indexSrc = await Deno.readTextFile(new URL("./index.ts", here));
const handlingSrc = await Deno.readTextFile(new URL("../_shared/itemHandling.ts", here));

Deno.test("send-items-to-partners: geen upload- of inkoop@-instructie meer", () => {
  assert(!/upload/i.test(indexSrc), "index.ts noemt nog 'upload'");
  assert(!indexSrc.includes("inkoop@reply"), "index.ts noemt nog inkoop@reply");
});

Deno.test("send-items-to-partners: standaard facturatiezin met referentie", () => {
  assert(indexSrc.includes("Mail na uitvoering de pdf van je factuur naar"));
  assert(indexSrc.includes('<a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie ${sanitizeHtml(program.reference_number || "")} erop. Wij factureren centraal aan de klant.'));
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
