import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildGeneratedTestMails,
  placeholderNames,
  renderTemplateForTest,
  sampleVariablesFor,
  sliceBatch,
} from "./samples.ts";

Deno.test("placeholderNames: ook de naam in {{#if}}, niet else of /if", () => {
  const names = placeholderNames("Hoi {{ partner_name }}, {{#if bureau_invoice}}factuur{{else}}geen{{/if}} {{reference_number}}");
  assertEquals(names, ["bureau_invoice", "partner_name", "reference_number"]);
});

Deno.test("renderTemplateForTest: geen placeholders over, onbekende namen zichtbaar als «naam»", () => {
  const r = renderTemplateForTest({
    id: "x",
    name: "Test",
    subject: "Offerte {{reference_number}} voor {{customer_name}}",
    body_html: "<p>{{customer_name}}, {{#if bureau_invoice}}op de bureaufactuur{{/if}} {{onbekende_variabele}}</p>",
  });
  assertEquals(r.subject, "Offerte BV-2611-TEST voor Anna Testklant");
  assert(!r.html.includes("{{"), r.html);
  assert(r.html.includes("op de bureaufactuur"));
  assert(r.html.includes("«onbekende_variabele»"));
  assertEquals(r.unknownVariables, ["onbekende_variabele"]);
});

Deno.test("sampleVariablesFor levert alleen de gebruikte variabelen", () => {
  const vars = sampleVariablesFor("A {{customer_name}}", "B {{portal_url}} {{#if was_selected}}x{{/if}}");
  assertEquals(Object.keys(vars).sort(), ["customer_name", "portal_url", "was_selected"]);
});

Deno.test("de opbouwfuncties leveren minstens tien mails zonder lege onderwerpen of 'undefined'", () => {
  const mails = buildGeneratedTestMails();
  assert(mails.length >= 10, String(mails.length));
  for (const m of mails) {
    assert(m.subject.trim().length > 5, m.id);
    assert(m.html.length > 100, m.id);
    assert(!m.html.includes("undefined"), `${m.id}: undefined in html`);
    assert(!m.subject.includes("undefined"), `${m.id}: undefined in onderwerp`);
  }
  const ids = new Set(mails.map((m) => m.id));
  assertEquals(ids.size, mails.length, "dubbele ids");
});

Deno.test("sliceBatch: batches van tien, buiten bereik valt terug op de laatste", () => {
  const all = Array.from({ length: 23 }, (_, i) => i + 1);
  assertEquals(sliceBatch(all, 1, 10).items, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assertEquals(sliceBatch(all, 3, 10).items, [21, 22, 23]);
  assertEquals(sliceBatch(all, 3, 10).batches, 3);
  assertEquals(sliceBatch(all, 9, 10).items, [21, 22, 23]);
  assertEquals(sliceBatch([], 1, 10).batches, 1);
});
