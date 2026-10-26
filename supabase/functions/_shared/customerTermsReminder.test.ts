import { assertEquals, assertStringIncludes, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  allItemsConfirmedForTerms,
  buildTermsCallTodo,
  buildTermsMailCopy,
  pickTermsMail,
  termsStageFor,
} from "./customerTermsReminder.ts";

const NOW = new Date("2026-10-26T09:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

Deno.test("termsStageFor: akkoord telt altijd, ook zonder partnerbevestigingen", () => {
  assertEquals(termsStageFor({ quote_status: "akkoord_ontvangen" }, NOW), "akkoord");
  assertEquals(termsStageFor({ quote_status: "definitief_bevestigd" }, NOW), "akkoord");
});

Deno.test("termsStageFor: offerte pas na zeven dagen zonder akkoord", () => {
  assertEquals(termsStageFor({ quote_status: "offerte_verstuurd", quote_sent_at: daysAgo(3) }, NOW), null);
  assertEquals(termsStageFor({ quote_status: "offerte_verstuurd", quote_sent_at: daysAgo(7) }, NOW), "offerte");
  assertEquals(termsStageFor({ quote_status: "offerte_verstuurd", quote_sent_at: daysAgo(40) }, NOW), "offerte");
});

Deno.test("termsStageFor: verlopen voorstel wordt niet automatisch achternagestuurd", () => {
  assertEquals(
    termsStageFor({ quote_status: "offerte_verstuurd", quote_sent_at: daysAgo(40), quote_valid_until: "2026-10-01" }, NOW),
    null,
  );
  assertEquals(
    termsStageFor({ quote_status: "offerte_verstuurd", quote_sent_at: daysAgo(40), quote_valid_until: "2026-10-26" }, NOW),
    "offerte",
  );
});

Deno.test("termsStageFor: concept, zonder verzenddatum of geannuleerd levert niets op", () => {
  assertEquals(termsStageFor({ quote_status: "concept" }, NOW), null);
  assertEquals(termsStageFor({ quote_status: "offerte_verstuurd", quote_sent_at: null }, NOW), null);
  assertEquals(termsStageFor({ quote_status: null }, NOW), null);
});

Deno.test("pickTermsMail: eerste verzoek ver vooraf, daarna de reeks 14, 7, 3", () => {
  assertEquals(pickTermsMail(60, [], NOW), "customer_terms_request");
  assertEquals(pickTermsMail(10, [{ type: "customer_terms_request", at: daysAgo(20) }], NOW), "customer_terms_reminder_t14");
  assertEquals(pickTermsMail(6, [{ type: "customer_terms_reminder_t14", at: daysAgo(4) }], NOW), "customer_terms_reminder_t7");
  assertEquals(pickTermsMail(2, [{ type: "customer_terms_reminder_t7", at: daysAgo(5) }], NOW), "customer_terms_reminder_t3");
  assertEquals(pickTermsMail(-1, [], NOW), null);
});

Deno.test("pickTermsMail: minimaal twee dagen tussen twee mails, nooit dezelfde fase twee keer", () => {
  assertEquals(pickTermsMail(10, [{ type: "customer_terms_request", at: daysAgo(1) }], NOW), null);
  assertEquals(pickTermsMail(10, [{ type: "customer_terms_reminder_t14", at: daysAgo(3) }], NOW), null);
  assertEquals(pickTermsMail(6, [{ type: "customer_terms_reminder_t7", at: daysAgo(3) }], NOW), null);
});

Deno.test("allItemsConfirmedForTerms blijft beschikbaar voor de tekst van de mail", () => {
  assertEquals(allItemsConfirmedForTerms([{ status: "confirmed" }, { status: "pending", item_quote_status: "bevestigd" }]), true);
  assertEquals(allItemsConfirmedForTerms([{ status: "confirmed" }, { status: "pending" }]), false);
  assertEquals(allItemsConfirmedForTerms([]), false);
});

const base = {
  customerName: "Mevrouw Jansen",
  referenceNumber: "BV-2608-0002",
  portalUrl: "https://bureauvlieland.nl/mijn-programma/tok?view=akkoord",
  billingMissing: false,
};

Deno.test("buildTermsMailCopy: na akkoord vraagt de eerste mail om de handtekening, met voorbehoud als er iets open staat", () => {
  const copy = buildTermsMailCopy({ ...base, stage: "akkoord", mailType: "customer_terms_request", daysUntil: 30, allConfirmed: false });
  assertStringIncludes(copy.subject, "Bedankt voor uw akkoord");
  assertStringIncludes(copy.subject, "BV-2608-0002");
  assertStringIncludes(copy.intro, "daar hoeft u niet op te wachten");
  assertStringIncludes(copy.html, "onder voorbehoud");
  assertStringIncludes(copy.html, base.portalUrl);
  assertEquals(copy.variables.stage, "akkoord");
  assertEquals(copy.variables.days_until, "30");
});

Deno.test("buildTermsMailCopy: alles bevestigd geeft de oude 'goed nieuws'-intro zonder voorbehoud", () => {
  const copy = buildTermsMailCopy({ ...base, stage: "akkoord", mailType: "customer_terms_request", daysUntil: 30, allConfirmed: true });
  assertStringIncludes(copy.intro, "Goed nieuws");
  assert(!copy.html.includes("onder voorbehoud"));
});

Deno.test("buildTermsMailCopy: herinnering noemt het aantal dagen en de ontbrekende factuurgegevens", () => {
  const copy = buildTermsMailCopy({ ...base, stage: "akkoord", mailType: "customer_terms_reminder_t3", daysUntil: 3, allConfirmed: true, billingMissing: true });
  assertStringIncludes(copy.subject, "Herinnering");
  assertStringIncludes(copy.intro, "Over 3 dagen");
  assertStringIncludes(copy.html, "factuurgegevens");
  assertEquals(copy.variables.billing_missing, "true");
});

Deno.test("buildTermsMailCopy: zonder akkoord vraagt de mail om akkoord én handtekening", () => {
  const first = buildTermsMailCopy({ ...base, stage: "offerte", mailType: "customer_terms_request", daysUntil: 90, allConfirmed: false });
  assertStringIncludes(first.subject, "wacht op uw akkoord");
  assertStringIncludes(first.html, "akkoord geven en de algemene voorwaarden ondertekenen");
  assertStringIncludes(first.html, "Bekijk en bevestig uw voorstel");
  const later = buildTermsMailCopy({ ...base, stage: "offerte", mailType: "customer_terms_reminder_t7", daysUntil: 7, allConfirmed: false });
  assertStringIncludes(later.intro, "Over 7 dagen");
  assertStringIncludes(later.intro, "akkoord");
});

Deno.test("buildTermsMailCopy: handmatig verzoek vanuit de admin heeft een neutrale intro, ook zonder datum", () => {
  const copy = buildTermsMailCopy({ ...base, stage: "akkoord", mailType: "customer_terms_request", daysUntil: null, allConfirmed: false, manual: true });
  assertStringIncludes(copy.intro, "staat klaar in uw portaal");
  assertEquals(copy.variables.days_until, "");
  const enkeleUren = buildTermsMailCopy({ ...base, stage: "akkoord", mailType: "customer_terms_reminder_t3", daysUntil: 0, allConfirmed: true });
  assertStringIncludes(enkeleUren.intro, "Over enkele uren");
});

Deno.test("buildTermsCallTodo: titel en tekst verschillen per fase", () => {
  const a = buildTermsCallTodo({ stage: "akkoord", customerLabel: "Kreeft BV", daysUntil: 2, portalUrl: "https://x/p" });
  assertEquals(a.title, "Bel Kreeft BV: voorwaarden nog niet getekend (event over 2 dagen)");
  assertStringIncludes(a.description, "https://x/p");
  const o = buildTermsCallTodo({ stage: "offerte", customerLabel: "Kreeft BV", daysUntil: 1, portalUrl: "https://x/p" });
  assertStringIncludes(o.title, "akkoord en voorwaarden nog niet binnen");
  assertStringIncludes(o.title, "over 1 dag)");
});
