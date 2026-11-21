// Contracttests voor de logies-gekozen mails (audit notificaties fase 1).
// De handlers draaien Deno.serve bij import, dus we lezen de broncode en de
// migratie en bewaken de afspraken op tekstniveau (patroon: referralPause.test.ts).
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const here = new URL(".", import.meta.url);
const read = (rel: string) => Deno.readTextFile(new URL(rel, here));

Deno.test("select-accommodation-quote: voorwaardenblok landt binnen de huisstijlkaart, niet achter </body>", async () => {
  const src = await read("./index.ts");
  assertStringIncludes(src, "export function insertIntoEmailCard(");
  assertStringIncludes(src, "customerHtml = insertIntoEmailCard(customerHtml, termsAcceptedBlock);");
  assertEquals(src.includes('customerHtml.replace("</body>", `${termsAcceptedBlock}</body>`)'), false);
  // De helper zoekt de voettekstrij van wrapEmailHtml (_shared/email-templates.ts).
  const wrapper = await read("../_shared/email-templates.ts");
  assertStringIncludes(wrapper, '<td style="background-color:#fafafa; border-top:3px solid');
  assertStringIncludes(src, '<td style="background-color:#fafafa;');
});

Deno.test("select-accommodation-quote: klantfallback in u-vorm, beide fallbacks noemen het bureau als aanspreekpunt", async () => {
  const src = await read("./index.ts");
  assertEquals(src.includes("Je logies is bevestigd"), false);
  assertEquals(src.includes("Bekijk je programma"), false);
  assertStringIncludes(src, "Bureau Vlieland is uw aanspreekpunt en regelt de verdere afhandeling met de accommodatie.");
  assertStringIncludes(src, "Bureau Vlieland is het aanspreekpunt voor de gast en regelt de verdere afhandeling met je.");
  assertEquals(src.includes("De accommodatie neemt binnenkort contact"), false);
});

Deno.test("migratie: euroteken uit de template, zelfde contactbelofte in klant- en partnertemplate", async () => {
  const mig = await read("../../migrations/20261121130000_logies-gekozen-templates.sql");
  assertStringIncludes(mig, "'<strong style=\"font-size:20px;color:#0F4C5C;\">€ {{price_total}}</strong>'");
  assertStringIncludes(mig, "'<strong style=\"font-size:20px;color:#0F4C5C;\">{{price_total}}</strong>'");
  assertStringIncludes(mig, "Bureau Vlieland is uw aanspreekpunt en regelt de verdere afhandeling met de accommodatie.");
  assertStringIncludes(mig, "Bureau Vlieland is het aanspreekpunt voor de gast en regelt de verdere afhandeling met je.");
  assertStringIncludes(mig, "{{terms_accepted_block}}");
  assert(mig.includes("where id = 'accommodation_selected_customer'") && mig.includes("where id = 'accommodation_selected_partner'"));
});

Deno.test("notify-accommodation-quote: geen spooktaak forward_accommodation_quote meer, open exemplaren worden gesloten", async () => {
  const src = await read("../notify-accommodation-quote/index.ts");
  assertEquals(src.includes('auto_type: "forward_accommodation_quote"'), false, "insert moet weg zijn");
  assertStringIncludes(src, '.eq("auto_type", "forward_accommodation_quote")');
  assertStringIncludes(src, 'completion_reason: "quote_forwarded"');
});
