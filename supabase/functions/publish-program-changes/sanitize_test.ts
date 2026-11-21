// Contracttest (notificaties fase 1): publish-program-changes ontsmet partner-
// en klantnaam voordat ze in de template item_changes_partner gaan (de
// renderer ontsmet zelf niets), en het onderwerp krijgt de platte waarden.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));

Deno.test("publish-program-changes: partner_name en customer_name via sanitizeHtml", () => {
  assert(/import\s*\{[^}]*\bsanitizeHtml\b[^}]*\}\s*from\s*"\.\.\/_shared\/email-templates\.ts"/s.test(src), "sanitizeHtml wordt niet geïmporteerd");
  assert(src.includes("partner_name: sanitizeHtml(partner.name),"));
  assert(src.includes("customer_name: sanitizeHtml(program.customer_name),"));
  assert(src.includes('customer_company: sanitizeHtml(program.customer_company || ""),'));
  // De templatevariabelen zijn ontsmet; het onderwerp (derde argument) krijgt bewust platte tekst.
  assert(src.includes("const partnerTemplateVars = {\n        partner_name: sanitizeHtml(partner.name),"));
  assert(src.includes("getRenderedTemplate(TemplateIds.ITEM_CHANGES_PARTNER, partnerTemplateVars, {"));
});
