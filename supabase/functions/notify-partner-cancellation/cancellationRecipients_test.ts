// Annuleringsmail aan partners: alleen bij onderdelen die bevestigd/geaccepteerd/
// uitgevoerd waren (notificaties fase 3). Plus contract op index.ts: templates
// voor beide mails, geen los knopblok achter de wrapper meer.
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { itemHadPartnerCommitment } from "./cancellationRecipients.ts";

const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));

Deno.test("bevestigd/geaccepteerd/uitgevoerd onderdeel: partner krijgt de mail", () => {
  for (const status of ["confirmed", "accepted", "executed"]) {
    assertEquals(itemHadPartnerCommitment({ id: "a", status }), true, status);
  }
});

Deno.test("alleen een aanvraag (pending/counter_proposed): geen mail", () => {
  assertEquals(itemHadPartnerCommitment({ id: "a", status: "pending" }), false);
  assertEquals(itemHadPartnerCommitment({ id: "a", status: "counter_proposed" }), false);
  assertEquals(itemHadPartnerCommitment({ id: "a", status: "alternative" }), false);
});

Deno.test("al geannuleerd (cancel-program-request): status van vóór de annulering uit de historie", () => {
  const history = [
    { item_id: "a", old_value: { status: "pending" }, new_value: { status: "confirmed" } },
    { item_id: "b", old_value: { status: "pending" }, new_value: { status: "unavailable" } },
  ];
  assertEquals(itemHadPartnerCommitment({ id: "a", status: "cancelled" }, history), true);
  assertEquals(itemHadPartnerCommitment({ id: "b", status: "cancelled" }, history), false);
  assertEquals(itemHadPartnerCommitment({ id: "c", status: "cancelled" }, history), false, "zonder historie en tijdstempels: geen mail");
  assertEquals(itemHadPartnerCommitment({ id: "c", status: "cancelled", customer_accepted_at: "2026-11-01T00:00:00Z" }, history), true);
  assertEquals(itemHadPartnerCommitment({ id: "c", status: "cancelled", executed_at: "2026-11-01T00:00:00Z" }), true);
});

Deno.test("index.ts: beide mails via de DB-template, knop in de template, Reply-To op de LOG-referentie", () => {
  assertStringIncludes(src, "itemHadPartnerCommitment(i, statusHistory)");
  // (de template-ids staan los van "getRenderedTemplate(" zodat de Vitest-
  // scanner emailTemplateVariables.test.ts deze testregels niet als aanroep leest)
  assertStringIncludes(src, "TemplateIds.CANCELLATION_PARTNER,");
  assertStringIncludes(src, "TemplateIds.CANCELLATION_ACCOMMODATION_PARTNER,");
  assertStringIncludes(src, "portal_url: portalUrl,");
  assertStringIncludes(src, "formatDateNL(arrival)");
  assertStringIncludes(src, "buildReplyTo(accommodationRef)");
  assertEquals(src.includes("portalLinkBlock"), false, "los knopblok achter de gewrapte template is weg");
  assertEquals(src.includes("Uw offerte"), false);
  assertEquals(/<p>Beste /.test(src), false);
});
