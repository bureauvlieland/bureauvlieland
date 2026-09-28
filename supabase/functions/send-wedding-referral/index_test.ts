import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { EmailLogEntry } from "../_shared/email-logger.ts";
import type { MailjetMessage } from "../_shared/mailjet-send.ts";
import {
  addMonthsIso,
  BodySchema,
  buildReferralMessage,
  handleWeddingReferral,
  plainTextToHtml,
  referralAddressFor,
  type Db,
  type HandlerContext,
  type ReferralInput,
} from "./index.ts";

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
  assertEquals(sent.length, 1);
  assertEquals(sent[0].Cc?.[0].Email, "info@paal50.nl");
  assertStringIncludes(String(sent[0].HTMLPart), "paal50.nl/bruiloften");

  assertEquals(logged.length, 1);
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
  assertEquals(rij.referral_email_log_id, "log-1");
  assertEquals(rij.created_by, "admin-1");
  assertEquals(result.body.referralId, rij.id);
  assertEquals(result.body.emailLogId, "log-1");
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
