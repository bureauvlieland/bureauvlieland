// Zuivere opbouw van de bundelmail (docs/plan-notificaties.md fase 3):
// groepering per ontvanger en dossier, klant- en partnertekst, lege run.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildChangeDigestEmail,
  digestEmailType,
  digestGroupKey,
  groupPendingChanges,
  renderChangeLine,
  skipReasonFor,
  type ChangeDigestPayload,
  type PendingChangeRow,
} from "./changeDigest.ts";

const basePayload = (over: Partial<ChangeDigestPayload> = {}): ChangeDigestPayload => ({
  reference_number: "BV-2611-0001",
  recipient_name: "Anna & Bram",
  customer_label: "Anna & Bram",
  changes: [{ item: "Wadlooptocht", label: "Tijd", from: "10:00", to: "11:00" }],
  note: null,
  portal_url: "https://bureauvlieland.nl/mijn-programma/tok",
  actor: "bureau",
  subject_prefix: "",
  ...over,
});

const row = (over: Partial<PendingChangeRow> = {}): PendingChangeRow => ({
  id: crypto.randomUUID(),
  request_id: "req-1",
  recipient_kind: "customer",
  recipient_email: "anna@example.com",
  partner_id: null,
  payload: basePayload(),
  created_at: "2026-11-21T09:00:00Z",
  ...over,
});

Deno.test("groupPendingChanges: lege run geeft geen groepen", () => {
  assertEquals(groupPendingChanges([]), []);
});

Deno.test("groupPendingChanges: drie publicaties op een dag worden één mail, in volgorde", () => {
  const rows = [
    row({ id: "c", created_at: "2026-11-21T15:00:00Z", payload: basePayload({ changes: [{ item: "Diner", label: "Tijd", from: "18:00", to: "19:00" }], note: "Keuken sluit later." }) }),
    row({ id: "a", created_at: "2026-11-21T09:00:00Z" }),
    row({ id: "b", created_at: "2026-11-21T12:00:00Z", payload: basePayload({ changes: [{ item: "Wadlooptocht", label: "Tijd", from: "11:00", to: "10:30" }], note: "Keuken sluit later." }) }),
  ];
  const groups = groupPendingChanges(rows);
  assertEquals(groups.length, 1);
  assertEquals(groups[0].row_ids, ["a", "b", "c"]);
  assertEquals(groups[0].payload.changes.map((c) => c.to), ["11:00", "10:30", "19:00"]);
  // Dezelfde toelichting twee keer op een dag staat één keer in de mail.
  assertEquals(groups[0].notes, ["Keuken sluit later."]);
});

Deno.test("groupPendingChanges: andere ontvanger, ander dossier of andere soort is een andere groep", () => {
  const rows = [
    row({ id: "1" }),
    row({ id: "2", recipient_email: "ANNA@example.com " }), // zelfde adres, andere spelling
    row({ id: "3", request_id: "req-2" }),
    row({ id: "4", recipient_kind: "partner", recipient_email: "post@wadgids.nl", partner_id: "wadgids" }),
  ];
  const groups = groupPendingChanges(rows);
  assertEquals(groups.length, 3);
  assertEquals(groups[0].row_ids, ["1", "2"]);
  assertEquals(digestGroupKey(rows[0]), digestGroupKey(rows[1]));
  assertEquals(groups.find((g) => g.recipient_kind === "partner")?.partner_id, "wadgids");
});

Deno.test("groupPendingChanges: klantwijziging op dezelfde dag → actor klant, testprefix blijft", () => {
  const groups = groupPendingChanges([
    row({ id: "1", payload: basePayload({ subject_prefix: "[TEST] " }) }),
    row({ id: "2", created_at: "2026-11-21T10:00:00Z", payload: basePayload({ actor: "klant" }) }),
  ]);
  assertEquals(groups[0].payload.actor, "klant");
  assertEquals(groups[0].payload.subject_prefix, "[TEST] ");
});

Deno.test("renderChangeLine: één regel per wijziging, ontsmet, zonder pijl bij toegevoegd", () => {
  const l1 = renderChangeLine({ item: "Diner <b>x</b>", label: "Tijd", from: "18:00", to: "19:00" });
  assertStringIncludes(l1, "<strong>Diner &lt;b&gt;x&lt;/b&gt;</strong> — Tijd: 18:00 → 19:00");
  const l2 = renderChangeLine({ item: "Fietsen", label: "Toegevoegd", from: null, to: "Fietsen" });
  assertStringIncludes(l2, "<strong>Fietsen</strong> — Toegevoegd</li>");
  assert(!l2.includes("→"));
  const l3 = renderChangeLine({ item: "Diner", label: "Opmerking", from: null, to: "Vegetarisch" });
  assertStringIncludes(l3, "Opmerking: — → Vegetarisch");
  const l4 = renderChangeLine({ item: "Diner", label: "Tijd gewijzigd", from: "18:00", to: "19:00", note: "Je eerdere voorstel (18:00) vervalt." });
  assertStringIncludes(l4, "Je eerdere voorstel (18:00) vervalt.");
});

Deno.test("buildChangeDigestEmail: klant krijgt Beste/u, kop met referentie, knop en Reply-To", () => {
  const [group] = groupPendingChanges([
    row({ payload: basePayload({ note: "In overleg verzet." }) }),
    row({ id: "2", created_at: "2026-11-21T10:00:00Z", payload: basePayload({ changes: [{ item: "Diner", label: "Geannuleerd", to: "Diner" }] }) }),
  ]);
  const mail = buildChangeDigestEmail(group);
  assertEquals(mail.subject, "Wijzigingen in uw programma (BV-2611-0001)");
  assertStringIncludes(mail.html, "Wijzigingen in uw programma BV-2611-0001</h2>");
  assertStringIncludes(mail.html, "<p>Beste Anna &amp; Bram,</p>");
  assertStringIncludes(mail.html, "uw programma bijgewerkt (2 wijzigingen)");
  assertStringIncludes(mail.html, "Toelichting van Bureau Vlieland:</strong><br>In overleg verzet.");
  assertStringIncludes(mail.html, 'href="https://bureauvlieland.nl/mijn-programma/tok"');
  assertStringIncludes(mail.html, "Bekijk uw programma</a>");
  assert(!mail.html.includes("aanbieders zijn geïnformeerd"), "bureau-publicatie belooft geen partnerreactie");
  assert(!/\bje\b|\bjouw\b/i.test(mail.html.replace(/Vlieland/g, "")), "klantmail tutoyeert");
  assertEquals(mail.replyTo?.Email, "reply+BV-2611-0001@reply.bureauvlieland.nl");
  assert(!mail.html.includes("<html"), "geen eigen skelet; de wrapper doet dat");
});

Deno.test("buildChangeDigestEmail: klantwijziging meldt dat aanbieders zijn geïnformeerd", () => {
  const [group] = groupPendingChanges([row({ payload: basePayload({ actor: "klant", subject_prefix: "[TEST] " }) })]);
  const mail = buildChangeDigestEmail(group);
  assertEquals(mail.subject, "[TEST] Wijzigingen in uw programma (BV-2611-0001)");
  assertStringIncludes(mail.html, "De betrokken aanbieders zijn geïnformeerd");
  assertStringIncludes(mail.html, "(één wijziging)");
});

Deno.test("buildChangeDigestEmail: partner krijgt Hoi/je, klantnaam, Aan zet en portaalknop", () => {
  const [group] = groupPendingChanges([
    row({
      recipient_kind: "partner",
      recipient_email: "post@wadgids.nl",
      partner_id: "wadgids",
      payload: basePayload({
        recipient_name: "Wadgids <script>",
        customer_label: "Anna & Bram",
        portal_url: "https://bureauvlieland.nl/partner/dashboard?tab=projecten&q=BV-2611-0001",
        dates: "zaterdag 6 december 2026",
        number_of_people: 12,
      }),
    }),
  ]);
  const mail = buildChangeDigestEmail(group);
  assertEquals(mail.subject, "Wijzigingen in jouw programma — Anna & Bram (BV-2611-0001)");
  assertStringIncludes(mail.html, "Wijzigingen in jouw programma BV-2611-0001</h2>");
  assertStringIncludes(mail.html, "<p>Hoi Wadgids &lt;script&gt;,</p>");
  assertStringIncludes(mail.html, "programma van <strong>Anna &amp; Bram</strong>");
  assertStringIncludes(mail.html, "<strong>Aan zet:</strong>");
  assertStringIncludes(mail.html, "Open het partnerportaal</a>");
  assertStringIncludes(mail.html, "<strong>Datum(s):</strong> zaterdag 6 december 2026");
  assertStringIncludes(mail.html, "<strong>Aantal personen:</strong> 12");
  assert(!/\bu\b|\buw\b/.test(mail.html), "partnermail vousvoyeert");
  assertEquals(digestEmailType(group.recipient_kind), "item_changes_partner");
  assertEquals(digestEmailType("customer"), "item_changes_customer");
});

Deno.test("buildChangeDigestEmail: zonder referentie geen haakjes en geen Reply-To", () => {
  const [group] = groupPendingChanges([row({ payload: basePayload({ reference_number: null }) })]);
  const mail = buildChangeDigestEmail(group);
  assertEquals(mail.subject, "Wijzigingen in uw programma");
  assertStringIncludes(mail.html, "Wijzigingen in uw programma</h2>");
  assertEquals(mail.replyTo, undefined);
});

Deno.test("skipReasonFor: geannuleerd, verwijderd of gearchiveerd dossier wordt overgeslagen", () => {
  const live = { id: "r", status: "active", cancelled_at: null, archived_at: null };
  assertEquals(skipReasonFor(live), null);
  assertEquals(skipReasonFor(undefined), "request_missing");
  assertEquals(skipReasonFor({ ...live, status: "cancelled" }), "request_cancelled");
  assertEquals(skipReasonFor({ ...live, cancelled_at: "2026-11-21T10:00:00Z" }), "request_cancelled");
  assertEquals(skipReasonFor({ ...live, status: "deleted" }), "request_deleted");
  assertEquals(skipReasonFor({ ...live, archived_at: "2026-11-21T10:00:00Z" }), "request_archived");
});
