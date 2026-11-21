// Contracttest (notificaties fase 1) voor update-customer-program en de
// bijbehorende templatemigratie 20261121140000_notificaties-teksten-fase1.sql:
//  - fallbacks gebruiken de standaard facturatiezin (geen upload/inkoop@);
//  - de item_added_partner-fallback deelt geen klantcontactgegevens;
//  - date_change_customer krijgt has_accommodation en reference_number;
//  - de migratie raakt precies de verwachte template-ids en zet nergens een
//    upload- of inkoop@-tekst terug.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const here = new URL(".", import.meta.url);
const src = await Deno.readTextFile(new URL("./index.ts", here));
const migration = await Deno.readTextFile(
  new URL("../../migrations/20261121140000_notificaties-teksten-fase1.sql", here),
);

const STANDAARDZIN =
  'Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie ${sanitizeHtml(program.reference_number || "")} erop. Wij factureren centraal aan de klant.';

Deno.test("update-customer-program: geen upload- of inkoop@-instructie in factuurcontext", () => {
  assert(!/upload/i.test(src), "index.ts noemt nog 'upload'");
  assert(!src.includes("inkoop@reply"), "index.ts noemt nog inkoop@reply");
  assert(src.includes(STANDAARDZIN), "booking_confirmed_partner-fallback mist de standaardzin");
});

Deno.test("update-customer-program: booking_confirmed_partner krijgt reference_number", () => {
  const i = src.indexOf("TemplateIds.BOOKING_CONFIRMED_PARTNER, {");
  assert(i > 0);
  const block = src.slice(i, src.indexOf("});", i));
  assert(block.includes("reference_number:"), "reference_number ontbreekt in de templatevariabelen");
});

Deno.test("update-customer-program: partner-fallbacks zonder klantcontactgegevens", () => {
  assert(!src.includes("neem direct contact op met de klant"));
  assert(!src.includes("<h3>Klantgegevens</h3>"), "een partner-fallback toont nog klantgegevens");
  const i = src.indexOf("TemplateIds.ITEM_ADDED_PARTNER, {");
  const fallbackStart = src.indexOf("template?.body ||", i);
  const fallbackEnd = src.indexOf("emailMessages.push", fallbackStart);
  const fallback = src.slice(fallbackStart, fallbackEnd);
  assert(!fallback.includes("customer_email"), "fallback toont klant-e-mail");
  assert(!fallback.includes("customer_phone"), "fallback toont klanttelefoon");
  assert(!fallback.includes("Klantgegevens"), "fallback toont klantgegevens");
  // Platte waarden naar de template: de template zet zelf de labels.
  const vars = src.slice(i, src.indexOf("});", i));
  assert(vars.includes("preferred_time: preferredTime,"));
  assert(vars.includes("notes: itemNotes,"));
});

Deno.test("update-customer-program: date_change_customer krijgt has_accommodation en reference_number", () => {
  const i = src.indexOf("TemplateIds.DATE_CHANGE_CUSTOMER, {");
  assert(i > 0);
  const block = src.slice(i, src.indexOf("});", i));
  assert(block.includes("has_accommodation:"));
  assert(block.includes("reference_number:"));
});

Deno.test("update-customer-program: partnermail tutoyeert ('Je eerdere voorstel')", () => {
  assert(!src.includes("Uw eerdere voorstel"));
  assert(!src.includes("Uw eerdere reactie"));
});

Deno.test("migratie notificaties-teksten-fase1 raakt de verwachte templates", () => {
  const expected = [
    "program_request_partner",
    "booking_confirmed_partner",
    "partner_invitation",
    "accommodation_selected_partner",
    "cancellation_customer",
    "date_change_customer",
    "item_added_partner",
    "item_changes_partner",
  ];
  const touched = [...migration.matchAll(/where id = '([a-z_]+)'/g)].map((m) => m[1]).sort();
  assertEquals(touched, [...expected].sort());
  assert(/update public\.email_templates/.test(migration));
  assert(!/\b(insert|delete)\b/i.test(migration), "migratie mag alleen updaten");
});

Deno.test("migratie zet nergens upload- of inkoop@-tekst terug", () => {
  const nieuweZinnen = [...migration.matchAll(/\$new\$([\s\S]*?)\$new\$/g)].map((m) => m[1]);
  assert(nieuweZinnen.length >= 9, "verwacht minstens negen vervangende zinnen");
  for (const zin of nieuweZinnen) {
    assert(!/upload/i.test(zin), `nieuwe zin noemt upload: ${zin}`);
    assert(!zin.includes("inkoop@"), `nieuwe zin noemt inkoop@: ${zin}`);
    assert(!/automatisch op de hoogte/.test(zin));
  }
  // De facturatiezin is in alle vier partnertemplates dezelfde standaardzin.
  const factuurZinnen = nieuweZinnen.filter((z) => z.includes("invoices@reply.bureauvlieland.nl"));
  assertEquals(factuurZinnen.length, 4);
  for (const zin of factuurZinnen) {
    assert(/^Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply\.bureauvlieland\.nl">invoices@reply\.bureauvlieland\.nl<\/a>, met onze referentie (\{\{reference_number\}\}|\(het (BV|LOG)-nummer\)) erop\. Wij factureren centraal aan de klant\./.test(zin), zin);
  }
});
