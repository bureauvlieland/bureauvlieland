import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { EmailLogEntry } from "../_shared/email-logger.ts";
import { replaceVariables, type TemplateVariables } from "../_shared/email-templates.ts";
import type { MailjetMessage } from "../_shared/mailjet-send.ts";
import {
  addMonthsIso,
  BodySchema,
  buildPartnerMessage,
  buildReferralMessage,
  composeRequestText,
  handleWeddingReferral,
  overnightSummary,
  partnerGreeting,
  plainTextToHtml,
  referralAddressFor,
  textToTemplateHtml,
  type Db,
  type HandlerContext,
  type ReferralInput,
} from "./index.ts";

// ── De echte sjablonen uit de migratie ───────────────────────────────────
// De tests renderen de mails met de tekst en de placeholders uit de migratie,
// zodat een typfout in het sjabloon of een ontbrekende variabele hier opvalt.

const MIGRATIE = new URL("../../migrations/20261004100000_bruiloftsdoorverwijzing-partnermail.sql", import.meta.url);

function laadSjabloon(id: string): { subject: string; body: string } {
  const sql = Deno.readTextFileSync(MIGRATIE);
  const re = new RegExp(`'${id}',\\s*'(?:[^']|'')*',\\s*'(?:[^']|'')*',\\s*'((?:[^']|'')*)',\\s*\\$body\\$([\\s\\S]*?)\\$body\\$`);
  const m = sql.match(re);
  if (!m) throw new Error(`Sjabloon ${id} niet gevonden in ${MIGRATIE.pathname}`);
  return { subject: m[1].replaceAll("''", "'"), body: m[2] };
}

const PARTNER_SJABLOON = laadSjabloon("wedding_referral_partner");
const KLANT_SJABLOON = laadSjabloon("wedding_referral_customer");

// Zoals getRenderedTemplate: de tekst met de (ontsmette) waarden, het onderwerp
// met de platte waarden.
const render = (tpl: { subject: string; body: string }, vars: object, subjectVars: object = vars) => ({
  subject: replaceVariables(tpl.subject, subjectVars as TemplateVariables),
  body: replaceVariables(tpl.body, vars as TemplateVariables),
});

const TOKEN = "0123456789abcdef0123456789abcdef";

// ── Kleine Supabase-stub ─────────────────────────────────────────────────
// Ondersteunt wat de handler gebruikt: select/eq/order/limit/maybeSingle,
// insert(...).select().single(), update(...).eq(). Data uit `store[tabel]`.

type Row = Record<string, unknown>;

function makeStub(store: Record<string, Row[]>) {
  const calls: { table: string; op: string; payload?: unknown }[] = [];
  const from = (table: string) => {
    const state = { op: "select", filters: [] as ((r: Row) => boolean)[], payload: undefined as unknown, single: false };
    const exec = () => {
      const rows = (store[table] ||= []);
      if (state.op === "insert") {
        const row: Row = { id: crypto.randomUUID(), created_at: "2026-09-28T10:00:00Z", ...(state.payload as Row) };
        rows.push(row);
        calls.push({ table, op: "insert", payload: row });
        return { data: state.single ? row : [row], error: null };
      }
      const hit = rows.filter((r) => state.filters.every((f) => f(r)));
      if (state.op === "update") {
        for (const r of hit) Object.assign(r, state.payload as Row);
        calls.push({ table, op: "update", payload: state.payload });
        return { data: hit, error: null };
      }
      return { data: state.single ? hit[0] ?? null : hit, error: null };
    };
    const builder = {
      select: () => builder,
      insert: (payload: Row) => ((state.op = "insert"), (state.payload = payload), builder),
      update: (payload: Row) => ((state.op = "update"), (state.payload = payload), builder),
      eq: (col: string, val: unknown) => (state.filters.push((r) => r[col] === val), builder),
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => ((state.single = true), builder),
      single: () => ((state.single = true), builder),
      then: (resolve?: ((v: never) => unknown) | null, reject?: ((e: unknown) => unknown) | null) =>
        Promise.resolve(exec() as never).then(resolve ?? undefined, reject ?? undefined),
    };
    return builder;
  };
  return { db: { from } as unknown as Db, calls, store };
}

const partner = (extra: Row = {}): Row => ({
  id: "paal-50",
  name: "Paal 50",
  email: "login@paal50.nl",
  contact_email: "info@paal50.nl",
  wedding_referral_email: null,
  booking_contact_name: "Marlies de Boer",
  receives_wedding_referrals: true,
  is_active: true,
  ...extra,
});

const invoer = (extra: Partial<ReferralInput> = {}): ReferralInput =>
  BodySchema.parse({
    partnerId: "paal-50",
    coupleNames: "Anna & Bram",
    coupleEmail: "anna@example.com",
    couplePhone: "0612345678",
    requestedAt: "2026-09-20",
    expectedWeddingDate: "2027-06-01",
    expectedWeddingPrecision: "month",
    estimatedGuests: 80,
    notes: "Belt zelf terug",
    priorContactNote: "Nog met niemand gesproken",
    subject: "Uw bruiloft op Vlieland",
    body: "Beste Anna & Bram,\n\nWij verwijzen u door naar Paal 50: https://paal50.nl/bruiloften",
    origin: "https://bureauvlieland.nl",
    ...extra,
  });

function context(store: Record<string, Row[]>, overrides: Partial<HandlerContext> = {}) {
  const stub = makeStub(store);
  const sent: MailjetMessage[] = [];
  const logged: EmailLogEntry[] = [];
  const ctx: HandlerContext = {
    db: stub.db,
    userId: "admin-1",
    now: new Date("2026-09-28T10:00:00Z"),
    send: async (message, idempotencyKey) => {
      sent.push(message);
      // De logger schrijft in productie zelf de email_log-rij; hier simuleren we dat via `log`.
      void idempotencyKey;
      return { ok: true, messageId: "mj-1", messageIds: ["mj-1"], raw: null };
    },
    log: async (entry) => {
      logged.push(entry);
      (store.email_log ||= []).push({ id: `log-${logged.length}`, idempotency_key: entry.idempotency_key ?? null, created_at: "2026-09-28T10:00:01Z" });
    },
    wrap: async (inner) => `<html>${inner}</html>`,
    renderPartnerTemplate: async (vars, onderwerp) => {
      const r = render(PARTNER_SJABLOON, vars, onderwerp);
      return { subject: r.subject, body: `<html>${r.body}</html>` };
    },
    newToken: () => TOKEN,
    ...overrides,
  };
  return { ctx, stub, sent, logged };
}

Deno.test("BodySchema: partner, namen, e-mail, datum aanvraag, onderwerp en tekst zijn verplicht", () => {
  assertEquals(BodySchema.safeParse({}).success, false);
  assertEquals(BodySchema.safeParse({ ...invoer(), coupleEmail: "geen-adres" }).success, false);
  assertEquals(BodySchema.safeParse({ ...invoer(), requestedAt: "20-09-2026" }).success, false);
  const parsed = BodySchema.parse({ partnerId: "p", coupleNames: "A", coupleEmail: "a@b.nl", requestedAt: "2026-01-01", subject: "s", body: "b" });
  assertEquals(parsed.expectedWeddingPrecision, "day");
  assertEquals(parsed.notes, "");
  assertEquals(parsed.priorContactNote, "");
});

Deno.test("referralAddressFor: apart adres, anders contactadres, anders loginadres", () => {
  assertEquals(referralAddressFor({ email: "login@p.nl", contact_email: "contact@p.nl", wedding_referral_email: "bruiloft@p.nl" }), "bruiloft@p.nl");
  assertEquals(referralAddressFor({ email: "login@p.nl", contact_email: "contact@p.nl", wedding_referral_email: "  " }), "contact@p.nl");
  assertEquals(referralAddressFor({ email: "login@p.nl", contact_email: null, wedding_referral_email: null }), "login@p.nl");
});

Deno.test("addMonthsIso: 18 maanden later, eind van de maand blijft binnen de maand", () => {
  assertEquals(addMonthsIso("2026-09-28", 18), "2028-03-28");
  assertEquals(addMonthsIso("2026-08-31", 18), "2028-02-29");
  assertEquals(addMonthsIso("2026-12-31", 2), "2027-02-28");
});

Deno.test("plainTextToHtml: ontsmet, regeleinden en klikbare links", () => {
  const html = plainTextToHtml("Beste <Anna>,\nZie https://paal50.nl/bruiloften.");
  assertStringIncludes(html, "Beste &lt;Anna&gt;,<br>");
  assertStringIncludes(html, '<a href="https://paal50.nl/bruiloften"');
  assertEquals(html.includes("bruiloften.</a>"), false);
});

Deno.test("buildReferralMessage: bruidspaar in To, partner in Cc, reply-to bij een project", () => {
  const { message, cc, testMode } = buildReferralMessage({
    coupleEmail: "anna@example.com",
    coupleNames: "Anna & Bram",
    partner: partner() as never,
    subject: "Uw bruiloft",
    html: "<p>x</p>",
    origin: "https://bureauvlieland.nl",
    referenceNumber: "BV-2609-0012",
  });
  assertEquals(testMode, false);
  assertEquals(cc, "info@paal50.nl");
  assertEquals(message.To, [{ Email: "anna@example.com", Name: "Anna & Bram" }]);
  assertEquals(message.Cc, [{ Email: "info@paal50.nl", Name: "Paal 50" }]);
  assertEquals(message.ReplyTo?.Email, "reply+BV-2609-0012@reply.bureauvlieland.nl");
  assertEquals(message.Subject, "Uw bruiloft");
});

Deno.test("buildReferralMessage: in testmodus naar het testadres, zonder cc, met [TEST]", () => {
  const { message, cc, testMode } = buildReferralMessage({
    coupleEmail: "anna@example.com",
    coupleNames: "Anna & Bram",
    partner: partner() as never,
    subject: "Uw bruiloft",
    html: "<p>x</p>",
    origin: "https://deploy-preview-77--bureauvlieland.netlify.app",
  });
  assertEquals(testMode, true);
  assertEquals(cc, null);
  assertEquals(message.Cc, undefined);
  assertEquals(message.To[0].Email, "erwin@bureauvlieland.nl");
  assertEquals(message.Subject, "[TEST] Uw bruiloft");
  assertEquals(message.ReplyTo, undefined);
});

Deno.test("handler: verstuurt, logt, maakt de doorverwijzing met vervaldatum en koppelt de mail", async () => {
  const { ctx, stub, sent, logged } = context({ partners: [partner()] });
  const result = await handleWeddingReferral(invoer(), ctx);
  assertEquals(result.status, 200, JSON.stringify(result.body));
  assertEquals(sent.length, 2);
  assertEquals(sent[0].Cc?.[0].Email, "info@paal50.nl");
  assertStringIncludes(String(sent[0].HTMLPart), "paal50.nl/bruiloften");

  assertEquals(logged.length, 2);
  assertEquals(logged[0].status, "sent");
  assertEquals(logged[0].related_partner_id, "paal-50");
  assertEquals(logged[0].metadata.cc, "info@paal50.nl");
  assertEquals(logged[0].idempotency_key, "wedding-referral-anna@example.com-paal-50");

  const rij = stub.store.wedding_referrals[0];
  assertEquals(rij.partner_id, "paal-50");
  assertEquals(rij.couple_names, "Anna & Bram");
  assertEquals(rij.referred_at, "2026-09-28");
  assertEquals(rij.expires_at, "2028-03-28");
  assertEquals(rij.expected_wedding_date, "2027-06-01");
  assertEquals(rij.expected_wedding_precision, "month");
  assertEquals(rij.estimated_guests, 80);
  assertEquals(rij.status, "referred");
  assertEquals(rij.prior_contact_note, "Nog met niemand gesproken");
  assertEquals(rij.referral_email_log_id, "log-1");
  assertEquals(rij.partner_email_log_id, "log-2");
  assertEquals(rij.claim_token, TOKEN);
  assertEquals(rij.created_by, "admin-1");
  assertEquals(result.body.referralId, rij.id);
  assertEquals(result.body.emailLogId, "log-1");
  assertEquals(result.body.partnerMail, "sent");
  assertEquals(result.body.partnerEmailLogId, "log-2");
});

Deno.test("handler: weigert een partner zonder de instelling, of een onbekende partner", async () => {
  const uit = await handleWeddingReferral(invoer(), context({ partners: [partner({ receives_wedding_referrals: false })] }).ctx);
  assertEquals(uit.status, 400);
  assertStringIncludes(String(uit.body.error), "ontvangt geen bruiloftsdoorverwijzingen");
  const onbekend = await handleWeddingReferral(invoer({ partnerId: "bestaat-niet" }), context({ partners: [partner()] }).ctx);
  assertEquals(onbekend.status, 404);
});

Deno.test("handler: sales-inboxmail gaat op verwerkt met een notitie", async () => {
  const inboxId = "22222222-2222-4222-8222-222222222222";
  const { ctx, stub } = context({ partners: [partner()], sales_inbox: [{ id: inboxId, status: "new", notes: "Eerder gebeld" }] });
  const result = await handleWeddingReferral(invoer({ salesInboxId: inboxId }), ctx);
  assertEquals(result.status, 200);
  const inbox = stub.store.sales_inbox[0];
  assertEquals(inbox.status, "processed");
  assertEquals(inbox.processed_by, "admin-1");
  assertEquals(inbox.notes, "Eerder gebeld\nDoorverwezen naar Paal 50 op 2026-09-28 (bruiloft).");
  assertEquals(stub.store.wedding_referrals[0].sales_inbox_id, inboxId);
});

Deno.test("handler: bij een project komt de mail in het communicatiedossier en gaat reply-to naar het project", async () => {
  const requestId = "11111111-1111-4111-8111-111111111111";
  const { ctx, stub, sent } = context({ partners: [partner()], program_requests: [{ id: requestId, reference_number: "BV-2609-0012" }] });
  const result = await handleWeddingReferral(invoer({ requestId }), ctx);
  assertEquals(result.status, 200);
  assertEquals(sent[0].ReplyTo?.Email, "reply+BV-2609-0012@reply.bureauvlieland.nl");
  assertEquals(sent[1].ReplyTo?.Email, "reply+BV-2609-0012@reply.bureauvlieland.nl");
  const comm = stub.store.project_communications[0];
  assertEquals(comm.request_id, requestId);
  assertEquals(comm.communication_type, "email_out");
  assertStringIncludes(String(comm.content), "cc: info@paal50.nl");
  assertEquals(stub.store.wedding_referrals[0].request_id, requestId);
});

Deno.test("handler: mislukte verzending wordt als failed gelogd en maakt geen doorverwijzing", async () => {
  const { ctx, stub, logged } = context({ partners: [partner()] }, { send: async () => ({ ok: false, error: "HTTP 500" }) });
  const result = await handleWeddingReferral(invoer(), ctx);
  assertEquals(result.status, 502);
  assertEquals(logged[0].status, "failed");
  assertEquals(stub.store.wedding_referrals, undefined);
});

Deno.test("handler: een geblokkeerd adres geeft een duidelijke fout en geen doorverwijzing", async () => {
  const { ctx, stub } = context({ partners: [partner()] }, {
    send: async () => ({ ok: true, messageId: null, messageIds: [], raw: null, skipped: "suppressed", suppressedRecipient: { email: "anna@example.com", reason: "bounce" } }),
  });
  const result = await handleWeddingReferral(invoer(), ctx);
  assertEquals(result.status, 400);
  assertStringIncludes(String(result.body.error), "suppressielijst");
  assertEquals(stub.store.wedding_referrals, undefined);
});

// ── Mail aan het bruidspaar: het sjabloon uit de migratie ────────────────

Deno.test("sjabloon bruidspaar: onderwerp en tekst zoals afgesproken, met alles ingevuld", () => {
  const r = render(KLANT_SJABLOON, { voornaam: "Anna en Bram", trouwdatum: "12 juni 2027", partner_naam: "Paal 50", aantal_gasten: "80", partner_email: "info@paal50.nl" });
  assertEquals(r.subject, "Uw bruiloft op Vlieland");
  assertStringIncludes(r.body, "Beste Anna en Bram,");
  assertStringIncludes(r.body, "voor uw bruiloft op 12 juni 2027! Een mooiere plek om elkaar het jawoord te geven");
  assertStringIncludes(r.body, "Voor bruiloften werken wij samen met Paal 50, die u graag verder helpt.");
  assertStringIncludes(r.body, "inclusief de ongeveer 80 gasten waar u op rekent, en hen in deze mail meegenomen.");
  assertStringIncludes(r.body, "U kunt Paal 50 ook zelf bereiken via info@paal50.nl.");
  assertStringIncludes(r.body, "Veel plezier met de voorbereidingen!");
  assertStringIncludes(r.body, "Het team van Bureau Vlieland");
  assertEquals(r.body.includes("{{"), false);
});

Deno.test("sjabloon bruidspaar: zonder datum en aantal gasten blijft de tekst heel", () => {
  const r = render(KLANT_SJABLOON, { voornaam: "Anna", trouwdatum: "", partner_naam: "Paal 50", aantal_gasten: "", partner_email: "info@paal50.nl" });
  assertStringIncludes(r.body, "voor uw bruiloft! Een mooiere plek");
  assertStringIncludes(r.body, "aan hen doorgegeven en hen in deze mail meegenomen.");
  assertEquals(r.body.includes("ongeveer"), false);
  assertEquals(r.body.includes("{{"), false);
});

// ── Mail aan de partner ──────────────────────────────────────────────────

const ALLE_PARTNERVELDEN = {
  partner_contactpersoon: "Marlies",
  naam_klant: "Anna &amp; Bram",
  email_klant: "anna@example.com",
  telefoon_klant: "0612345678",
  trouwdatum: "12 juni 2027",
  aantal_gasten: "80",
  overnachtingen: "2 nachten, van 11 juni 2027 tot 13 juni 2027",
  aanvraagtekst: "Wij willen graag trouwen op het strand.",
  uiterlijk_datum: "5 oktober 2026",
  al_bekend_link: `https://bureauvlieland.nl/doorverwijzing/${TOKEN}`,
};

Deno.test("sjabloon partner: tekst, alle gegevens en de link zoals afgesproken", () => {
  const r = render(PARTNER_SJABLOON, ALLE_PARTNERVELDEN, { naam_klant: "Anna & Bram", trouwdatum: "12 juni 2027" });
  assertEquals(r.subject, "Nieuwe bruiloftsaanvraag: Anna & Bram, 12 juni 2027");
  assertStringIncludes(r.body, "Hoi Marlies,");
  assertStringIncludes(r.body, "Zojuist heb ik Anna &amp; Bram met jullie in contact gebracht; jullie staan in cc bij die mail.");
  assertStringIncludes(r.body, "zodat je meteen goed beslagen ten ijs komt.");
  for (const [label, waarde] of [
    ["Naam:", "Anna &amp; Bram"],
    ["E-mail:", "anna@example.com"],
    ["Telefoon:", "0612345678"],
    ["Gewenste datum:", "12 juni 2027"],
    ["Aantal gasten:", "80"],
    ["Overnachtingen:", "2 nachten, van 11 juni 2027 tot 13 juni 2027"],
  ]) {
    assertStringIncludes(r.body, label);
    assertStringIncludes(r.body, waarde);
  }
  assertStringIncludes(r.body, "Aanvraag zoals ingevuld:");
  assertStringIncludes(r.body, "Wij willen graag trouwen op het strand.");
  assertStringIncludes(r.body, "binnen vijf werkdagen (uiterlijk 5 oktober 2026)");
  assertStringIncludes(r.body, `href="https://bureauvlieland.nl/doorverwijzing/${TOKEN}"`);
  assertStringIncludes(r.body, "Dit bruidspaar was al bij ons bekend");
  assertStringIncludes(r.body, "Hoor ik niets, dan noteer ik hem als doorverwijzing van Bureau Vlieland.");
  assertStringIncludes(r.body, "Erwin Soolsma");
  assertEquals(r.body.includes("{{"), false);
});

Deno.test("sjabloon partner: lege velden worden weggelaten, niet leeg getoond", () => {
  const leeg = { ...ALLE_PARTNERVELDEN, telefoon_klant: "", trouwdatum: "", aantal_gasten: "", overnachtingen: "", aanvraagtekst: "" };
  const r = render(PARTNER_SJABLOON, leeg, { naam_klant: "Anna & Bram", trouwdatum: "" });
  assertEquals(r.subject, "Nieuwe bruiloftsaanvraag: Anna & Bram");
  for (const label of ["Telefoon:", "Gewenste datum:", "Aantal gasten:", "Overnachtingen:", "Aanvraag zoals ingevuld:"]) {
    assertEquals(r.body.includes(label), false, `${label} hoort er niet te staan`);
  }
  assertStringIncludes(r.body, "Naam:");
  assertStringIncludes(r.body, "E-mail:");
  assertEquals(r.body.includes("{{"), false);
});

Deno.test("composeRequestText: vrije tekst eerst, dan de overige velden, lege velden vallen weg", () => {
  assertEquals(
    composeRequestText({
      free: ["  Wij willen trouwen.  ", null, "Wij willen trouwen.", "Graag strand."],
      fields: [["Organisatie", "Familie Jansen"], ["Budget", ""], ["Bron", null], ["Groepssituatie", "Komt vanaf de wal"]],
    }),
    "Wij willen trouwen.\n\nGraag strand.\n\nOrganisatie: Familie Jansen\nGroepssituatie: Komt vanaf de wal",
  );
  assertEquals(composeRequestText({ free: [null, "  "], fields: [["Budget", ""]] }), "");
  assertEquals(composeRequestText({ free: ["x".repeat(9000)], fields: [] }).length, 8001);
});

Deno.test("textToTemplateHtml: ontsmet de tekst van de klant en zet regeleinden om", () => {
  assertEquals(textToTemplateHtml("Hoi <script>alert(1)</script>\nTot ziens & {{naam}}"), "Hoi &lt;script&gt;alert(1)&lt;/script&gt;<br>Tot ziens &amp; {{naam}}");
});

Deno.test("overnightSummary: nachten en data, of leeg zonder geldig verblijf", () => {
  assertEquals(overnightSummary("2027-06-11", "2027-06-13"), "2 nachten, van 11 juni 2027 tot 13 juni 2027");
  assertEquals(overnightSummary("2027-06-11", "2027-06-12"), "1 nacht, van 11 juni 2027 tot 12 juni 2027");
  assertEquals(overnightSummary("2027-06-11", "2027-06-11"), "");
  assertEquals(overnightSummary(null, "2027-06-13"), "");
});

Deno.test("partnerGreeting: voornaam van de contactpersoon, anders de naam van de partner", () => {
  assertEquals(partnerGreeting({ name: "Paal 50", booking_contact_name: "Marlies de Boer" }), "Marlies");
  assertEquals(partnerGreeting({ name: "Paal 50", booking_contact_name: "  " }), "Paal 50");
  assertEquals(partnerGreeting({ name: "Paal 50", booking_contact_name: null }), "Paal 50");
});

Deno.test("buildPartnerMessage: naar het doorverwijsadres, zonder cc; in testmodus naar het testadres", () => {
  const echt = buildPartnerMessage({ partner: partner() as never, subject: "Nieuwe bruiloftsaanvraag", html: "<p>x</p>", origin: "https://bureauvlieland.nl", referenceNumber: "BV-2609-0012" });
  assertEquals(echt.to, "info@paal50.nl");
  assertEquals(echt.testMode, false);
  assertEquals(echt.message.To, [{ Email: "info@paal50.nl", Name: "Paal 50" }]);
  assertEquals(echt.message.Cc, undefined);
  assertEquals(echt.message.Subject, "Nieuwe bruiloftsaanvraag");

  const apart = buildPartnerMessage({ partner: partner({ wedding_referral_email: "bruiloften@paal50.nl" }) as never, subject: "s", html: "x", origin: "https://bureauvlieland.nl" });
  assertEquals(apart.to, "bruiloften@paal50.nl");

  const test = buildPartnerMessage({ partner: partner() as never, subject: "Nieuwe bruiloftsaanvraag", html: "x", origin: "https://deploy-preview-77--bureauvlieland.netlify.app" });
  assertEquals(test.to, "erwin@bureauvlieland.nl");
  assertEquals(test.testMode, true);
  assertEquals(test.message.Subject, "[TEST] Nieuwe bruiloftsaanvraag");
});

// ── De handler verstuurt beide mails ─────────────────────────────────────

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

Deno.test("handler: bruidspaar en partner krijgen allebei een mail, met de juiste ontvangers en gegevens", async () => {
  const { ctx, stub, sent, logged } = context({
    partners: [partner()],
    program_requests: [
      {
        id: PROJECT_ID,
        reference_number: "BV-2609-0012",
        customer_company: "Familie de Vries",
        general_notes: "Wij willen graag trouwen\nop het strand <b>zonder</b> tent.",
        program_description: "Diner voor 80 personen",
        group_situation: "vanaf_wal",
        selected_dates: ["2027-06-12"],
      },
    ],
    accommodation_requests: [
      { linked_program_id: PROJECT_ID, arrival_date: "2027-06-11", departure_date: "2027-06-13", special_requests: "Graag een rustige kamer", status: "pending" },
      { linked_program_id: PROJECT_ID, arrival_date: "2027-07-01", departure_date: "2027-07-05", special_requests: null, status: "cancelled" },
    ],
  });
  const result = await handleWeddingReferral(invoer({ requestId: PROJECT_ID, expectedWeddingDate: "2027-06-12", expectedWeddingPrecision: "day" }), ctx);
  assertEquals(result.status, 200, JSON.stringify(result.body));
  assertEquals(sent.length, 2);

  // 1. bruidspaar: To = bruidspaar, Cc = partner
  assertEquals(sent[0].To[0].Email, "anna@example.com");
  assertEquals(sent[0].Cc?.[0].Email, "info@paal50.nl");

  // 2. partner: To = doorverwijsadres, geen cc
  const m = sent[1];
  assertEquals(m.To, [{ Email: "info@paal50.nl", Name: "Paal 50" }]);
  assertEquals(m.Cc, undefined);
  // Het onderwerp is platte tekst: een & blijft een &, ook al is de naam in de tekst ontsmet.
  assertEquals(m.Subject, "Nieuwe bruiloftsaanvraag: Anna & Bram, 12 juni 2027");
  const html = String(m.HTMLPart);
  assertStringIncludes(html, "Anna &amp; Bram");
  assertStringIncludes(html, "Hoi Marlies,");
  assertStringIncludes(html, "anna@example.com");
  assertStringIncludes(html, "0612345678");
  assertStringIncludes(html, "12 juni 2027");
  assertStringIncludes(html, "Aantal gasten:");
  assertStringIncludes(html, "2 nachten, van 11 juni 2027 tot 13 juni 2027");
  assertStringIncludes(html, "Wij willen graag trouwen<br>op het strand &lt;b&gt;zonder&lt;/b&gt; tent.");
  assertStringIncludes(html, "Diner voor 80 personen");
  assertStringIncludes(html, "Organisatie: Familie de Vries");
  assertStringIncludes(html, "Groepssituatie: Komt vanaf de wal");
  assertStringIncludes(html, "Wensen logies: Graag een rustige kamer");
  assertStringIncludes(html, "uiterlijk 5 oktober 2026");
  assertStringIncludes(html, `href="https://bureauvlieland.nl/doorverwijzing/${TOKEN}"`);
  assertEquals(html.includes("{{"), false);

  // de interne notities horen niet bij de partner
  assertEquals(html.includes("Belt zelf terug"), false);
  assertEquals(html.includes("Nog met niemand gesproken"), false);

  // beide mails zijn gelogd en aan de doorverwijzing gekoppeld
  assertEquals(logged.map((l) => [l.email_type, l.recipient_email, l.status]), [
    ["wedding_referral_customer", "anna@example.com", "sent"],
    ["wedding_referral_partner", "info@paal50.nl", "sent"],
  ]);
  assertEquals(logged[1].related_partner_id, "paal-50");
  assertEquals(logged[1].related_request_id, PROJECT_ID);
  assertEquals(logged[1].idempotency_key, "wedding-referral-partner-anna@example.com-paal-50");
  assertEquals(stub.store.wedding_referrals[0].partner_email_log_id, "log-2");
});

Deno.test("handler: zonder telefoon, datum, gasten en verblijf valt dat uit de partnermail weg", async () => {
  const { ctx, sent } = context({ partners: [partner()] });
  const result = await handleWeddingReferral(
    invoer({ couplePhone: null, expectedWeddingDate: null, estimatedGuests: null }),
    ctx,
  );
  assertEquals(result.status, 200);
  const html = String(sent[1].HTMLPart);
  assertEquals(sent[1].Subject, "Nieuwe bruiloftsaanvraag: Anna & Bram");
  for (const label of ["Telefoon:", "Gewenste datum:", "Aantal gasten:", "Overnachtingen:", "Aanvraag zoals ingevuld:"]) {
    assertEquals(html.includes(label), false, `${label} hoort er niet te staan`);
  }
  assertStringIncludes(html, "Naam:");
});

Deno.test("handler: bij een sales-inboxmail gaat de volledige mailtekst mee aan de partner", async () => {
  const inboxId = "22222222-2222-4222-8222-222222222222";
  const { ctx, sent } = context({
    partners: [partner()],
    sales_inbox: [
      {
        id: inboxId,
        status: "new",
        notes: null,
        body_text: "Goedemiddag,\n\nWij zoeken een plek voor onze bruiloft in juni.\nGroet, Anna",
        scan_result: { customer_company: null, budget_indication: "ca. 5000 euro", source: "Google" },
      },
    ],
  });
  const result = await handleWeddingReferral(invoer({ salesInboxId: inboxId }), ctx);
  assertEquals(result.status, 200);
  const html = String(sent[1].HTMLPart);
  assertStringIncludes(html, "Goedemiddag,<br><br>Wij zoeken een plek voor onze bruiloft in juni.<br>Groet, Anna");
  assertStringIncludes(html, "Budget: ca. 5000 euro");
  assertStringIncludes(html, "Bron: Google");
  assertEquals(html.includes("Organisatie:"), false);
});

Deno.test("handler: in testmodus gaan beide mails naar het testadres, zonder cc", async () => {
  const { ctx, sent } = context({ partners: [partner()] });
  const result = await handleWeddingReferral(invoer({ origin: "https://deploy-preview-77--bureauvlieland.netlify.app" }), ctx);
  assertEquals(result.status, 200);
  assertEquals(sent[0].To[0].Email, "erwin@bureauvlieland.nl");
  assertEquals(sent[0].Cc, undefined);
  assertEquals(sent[1].To[0].Email, "erwin@bureauvlieland.nl");
  assertEquals(sent[1].Cc, undefined);
  assertEquals(sent[1].Subject, "[TEST] Nieuwe bruiloftsaanvraag: Anna & Bram, juni 2027");
});

Deno.test("handler: een mislukte partnermail laat de doorverwijzing staan en meldt het", async () => {
  let aantal = 0;
  const { ctx, stub, logged } = context({ partners: [partner()] }, {
    send: async () => {
      aantal += 1;
      return aantal === 1 ? { ok: true, messageId: "mj-1", messageIds: ["mj-1"], raw: null } : { ok: false, error: "HTTP 500" };
    },
  });
  const result = await handleWeddingReferral(invoer(), ctx);
  assertEquals(result.status, 200);
  assertEquals(result.body.partnerMail, "failed");
  assertStringIncludes(String(result.body.partnerMailError), "HTTP 500");
  assertEquals(stub.store.wedding_referrals.length, 1);
  assertEquals(stub.store.wedding_referrals[0].partner_email_log_id, undefined);
  assertEquals(logged.map((l) => [l.email_type, l.status]), [
    ["wedding_referral_customer", "sent"],
    ["wedding_referral_partner", "failed"],
  ]);
});

Deno.test("handler: een partner op de suppressielijst krijgt geen mail, de doorverwijzing blijft", async () => {
  let aantal = 0;
  const { ctx, stub } = context({ partners: [partner()] }, {
    send: async () => {
      aantal += 1;
      return aantal === 1
        ? { ok: true, messageId: "mj-1", messageIds: ["mj-1"], raw: null }
        : { ok: true, messageId: null, messageIds: [], raw: null, skipped: "suppressed", suppressedRecipient: { email: "info@paal50.nl", reason: "bounce" } };
    },
  });
  const result = await handleWeddingReferral(invoer(), ctx);
  assertEquals(result.status, 200);
  assertEquals(result.body.partnerMail, "suppressed");
  assertStringIncludes(String(result.body.partnerMailError), "suppressielijst");
  assertEquals(stub.store.wedding_referrals.length, 1);
});

Deno.test("handler: ontbreekt het partnersjabloon, dan geen partnermail maar wel de doorverwijzing", async () => {
  const { ctx, stub, sent } = context({ partners: [partner()] }, { renderPartnerTemplate: async () => null });
  const result = await handleWeddingReferral(invoer(), ctx);
  assertEquals(result.status, 200);
  assertEquals(result.body.partnerMail, "failed");
  assertStringIncludes(String(result.body.partnerMailError), "wedding_referral_partner");
  assertEquals(sent.length, 1);
  assertEquals(stub.store.wedding_referrals.length, 1);
});

Deno.test("handler: rond middernacht telt de Nederlandse dag als datum doorverwezen", async () => {
  // 22:30 UTC op 28 september is 00:30 op 29 september in Nederland.
  const { ctx, stub } = context({ partners: [partner()] }, { now: new Date("2026-09-28T22:30:00Z") });
  const result = await handleWeddingReferral(invoer(), ctx);
  assertEquals(result.status, 200);
  assertEquals(stub.store.wedding_referrals[0].referred_at, "2026-09-29");
  assertEquals(stub.store.wedding_referrals[0].expires_at, "2028-03-29");
});

Deno.test("handler: een naam met regeleinden geeft een onderwerp op één regel", async () => {
  const { ctx, sent } = context({ partners: [partner()] });
  const result = await handleWeddingReferral(invoer({ coupleNames: "Anna\nBram" }), ctx);
  assertEquals(result.status, 200);
  assertEquals(sent[1].Subject, "Nieuwe bruiloftsaanvraag: Anna Bram, juni 2027");
});

Deno.test("handler: dubbel klikken geeft geen tweede doorverwijzing en geen tweede partnermail", async () => {
  const store: Record<string, Row[]> = { partners: [partner()] };
  const eerste = context(store);
  const een = await handleWeddingReferral(invoer(), eerste.ctx);
  assertEquals(een.status, 200);
  assertEquals(eerste.sent.length, 2);

  // Tweede klik: de idempotentiecontrole meldt dat de mail aan het bruidspaar al is verstuurd.
  const tweede = context(store, {
    send: async () => ({ ok: true, messageId: "mj-1", messageIds: ["mj-1"], raw: null, skipped: "duplicate" }),
  });
  const twee = await handleWeddingReferral(invoer(), tweede.ctx);
  assertEquals(twee.status, 200);
  assertEquals(twee.body.duplicate, true);
  assertEquals(twee.body.referralId, een.body.referralId);
  assertEquals(store.wedding_referrals.length, 1);
  assertEquals(tweede.sent.length, 0);
});

Deno.test("handler: stond de mail al als verstuurd maar bestaat de doorverwijzing niet, dan wordt die alsnog aangemaakt", async () => {
  const verstuurd: MailjetMessage[] = [];
  const { ctx, stub } = context(
    { partners: [partner()] },
    {
      send: async (m) => {
        verstuurd.push(m);
        return { ok: true, messageId: "mj-1", messageIds: ["mj-1"], raw: null, skipped: m.Cc ? "duplicate" : undefined };
      },
    },
  );
  const result = await handleWeddingReferral(invoer(), ctx);
  assertEquals(result.status, 200);
  assertEquals(stub.store.wedding_referrals.length, 1);
  assertEquals(result.body.partnerMail, "sent");
  assertEquals(verstuurd.length, 2);
});

Deno.test("handler: de link in de partnermail is ontsmet", async () => {
  const { ctx, sent } = context({ partners: [partner()] });
  await handleWeddingReferral(invoer({ origin: 'http://localhost:8080/"><b>' }), ctx);
  const html = String(sent[1].HTMLPart);
  assertEquals(html.includes('"><b>'), false);
  assertStringIncludes(html, "doorverwijzing/" + TOKEN);
});
