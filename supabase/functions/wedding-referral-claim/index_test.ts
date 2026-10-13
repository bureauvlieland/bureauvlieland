import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { BodySchema, BUREAU_MAIL_TYPE, bureauMailHtml, bureauMailSubject, claimState, handleClaim, type ClaimContext, type ClaimInput, type Db } from "./index.ts";
import type { MailjetMessage } from "../_shared/mailjet-send.ts";
import type { EmailLogEntry } from "../_shared/email-logger.ts";

// ── Kleine Supabase-stub ─────────────────────────────────────────────────
// Ondersteunt wat de handler gebruikt: select/eq/maybeSingle,
// insert(...), update(...).eq(...).eq(...).select(). Data uit `store[tabel]`.

type Row = Record<string, unknown>;

function makeStub(store: Record<string, Row[]>) {
  const from = (table: string) => {
    const state = { op: "select", filters: [] as ((r: Row) => boolean)[], payload: undefined as unknown, single: false };
    const exec = () => {
      const rows = (store[table] ||= []);
      if (state.op === "insert") {
        rows.push({ id: crypto.randomUUID(), ...(state.payload as Row) });
        return { data: null, error: null };
      }
      const hit = rows.filter((r) => state.filters.every((f) => f(r)));
      if (state.op === "update") {
        for (const r of hit) Object.assign(r, state.payload as Row);
        return { data: hit, error: null };
      }
      return { data: state.single ? hit[0] ?? null : hit, error: null };
    };
    const builder = {
      select: () => builder,
      insert: (payload: Row) => ((state.op = "insert"), (state.payload = payload), builder),
      update: (payload: Row) => ((state.op = "update"), (state.payload = payload), builder),
      eq: (col: string, val: unknown) => (state.filters.push((r) => r[col] === val), builder),
      maybeSingle: () => ((state.single = true), builder),
      then: (resolve?: ((v: never) => unknown) | null, reject?: ((e: unknown) => unknown) | null) =>
        Promise.resolve(exec() as never).then(resolve ?? undefined, reject ?? undefined),
    };
    return builder;
  };
  return { db: { from } as unknown as Db, store };
}

const TOKEN = "0123456789abcdef0123456789abcdef";

// Doorverwezen op maandag 28 september 2026: vijf werkdagen later is maandag 5 oktober.
const doorverwijzing = (extra: Row = {}): Row => ({
  id: "ref-1",
  request_id: "11111111-1111-4111-8111-111111111111",
  partner_id: "paal-50",
  couple_names: "Anna & Bram",
  referred_at: "2026-09-28",
  claim_token: TOKEN,
  partner_claim: "none",
  partner_claim_reported_at: null,
  partner_claim_first_contact_at: null,
  partner_claim_note: "",
  ...extra,
});

const winkel = (extra: Row = {}): Record<string, Row[]> => ({
  wedding_referrals: [doorverwijzing(extra)],
  partners: [{ id: "paal-50", name: "Paal 50" }],
});

/** Context met een mail-stub: `sent` en `logged` vangen de bureaumail op. */
function context(store: Record<string, Row[]>, now: Date, overrides: Partial<ClaimContext> = {}) {
  const stub = makeStub(store);
  const sent: MailjetMessage[] = [];
  const logged: EmailLogEntry[] = [];
  const ctx: ClaimContext = {
    db: stub.db,
    now,
    send: async (message) => {
      sent.push(message);
      return { ok: true, messageId: "mj-1", messageIds: ["mj-1"], raw: null };
    },
    log: async (entry) => {
      logged.push(entry);
    },
    ...overrides,
  };
  return { ctx, stub, store: stub.store, sent, logged };
}

const status = (): ClaimInput => BodySchema.parse({ action: "status", token: TOKEN });
const meld = (extra: Row = {}): ClaimInput => BodySchema.parse({ action: "report", token: TOKEN, firstContactAt: "2026-09-10", note: "Mail van 10 september", ...extra });

// Maandag 5 oktober 2026, 23:30 Nederlandse tijd = 21:30 UTC: nog de laatste dag.
const LAATSTE_DAG = new Date("2026-10-05T21:30:00Z");
// Dinsdag 6 oktober, 00:30 Nederlandse tijd = 22:30 UTC: verlopen.
const VERLOPEN = new Date("2026-10-05T22:30:00Z");
const DRIE_DAGEN_LATER = new Date("2026-10-01T09:00:00Z");

Deno.test("schema: een token is verplicht, 'report' neemt een datum en een opmerking", () => {
  assertEquals(BodySchema.safeParse({}).success, false);
  assertEquals(BodySchema.safeParse({ action: "status", token: "kort" }).success, false);
  assertEquals(BodySchema.safeParse({ action: "verwijder", token: TOKEN }).success, false);
  const r = BodySchema.parse({ action: "report", token: TOKEN });
  assertEquals(r.action === "report" && r.firstContactAt, "");
  assertEquals(r.action === "report" && r.note, "");
});

Deno.test("claimState: open tot en met de vijfde werkdag, daarna verlopen; gemeld blijft gemeld", () => {
  const open = { partner_claim: "none", referred_at: "2026-09-28" };
  assertEquals(claimState(open, "2026-09-28"), "open");
  assertEquals(claimState(open, "2026-10-05"), "open");
  assertEquals(claimState(open, "2026-10-06"), "expired");
  assertEquals(claimState({ ...open, partner_claim: "already_known" }, "2026-10-06"), "reported");
});

Deno.test("status: de link werkt binnen vijf werkdagen, ook op de laatste dag tot middernacht Nederlandse tijd", async () => {
  const drie = await handleClaim(status(), context(winkel(), DRIE_DAGEN_LATER).ctx);
  assertEquals(drie.status, 200);
  assertEquals((drie.body.view as { state: string }).state, "open");
  assertEquals((drie.body.view as { deadline: string }).deadline, "2026-10-05");
  assertEquals((drie.body.view as { partnerName: string }).partnerName, "Paal 50");
  assertEquals((drie.body.view as { coupleNames: string }).coupleNames, "Anna & Bram");

  const laatste = await handleClaim(status(), context(winkel(), LAATSTE_DAG).ctx);
  assertEquals((laatste.body.view as { state: string }).state, "open");
});

Deno.test("status: na vijf werkdagen is de link verlopen", async () => {
  const r = await handleClaim(status(), context(winkel(), VERLOPEN).ctx);
  assertEquals(r.status, 200);
  assertEquals((r.body.view as { state: string }).state, "expired");
});

Deno.test("status: een onbekend token geeft 404 en laat niets los", async () => {
  const r = await handleClaim(BodySchema.parse({ action: "status", token: "ffffffffffffffffffffffffffffffff" }), context(winkel(), DRIE_DAGEN_LATER).ctx);
  assertEquals(r.status, 404);
  assertEquals(r.body, { error: "not_found" });
});

Deno.test("melden: legt 'al bekend' vast met datum, opmerking, tijdstip en herkomst, en maakt een taak", async () => {
  const stub = context(winkel(), DRIE_DAGEN_LATER);
  const r = await handleClaim(meld(), stub.ctx);
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals((r.body.view as { state: string }).state, "reported");

  const rij = stub.store.wedding_referrals[0];
  assertEquals(rij.partner_claim, "already_known");
  assertEquals(rij.partner_claim_first_contact_at, "2026-09-10");
  assertEquals(rij.partner_claim_note, "Mail van 10 september");
  assertEquals(rij.partner_claim_reported_at, "2026-10-01");
  assertEquals(rij.partner_claim_submitted_at, "2026-10-01T09:00:00.000Z");
  assertEquals(rij.partner_claim_source, "link");

  assertEquals(stub.store.admin_todos.length, 1);
  const taak = stub.store.admin_todos[0];
  assertEquals(taak.title, "Paal 50 meldt: Anna & Bram was al bekend");
  assertEquals(taak.auto_type, "wedding_referral_claim");
  assertEquals(taak.auto_entity_id, "ref-1");
  assertEquals(taak.related_partner_id, "paal-50");
  assertStringIncludes(String(taak.description), "10 september 2026");
  assertStringIncludes(String(taak.description), "Mail van 10 september");
});

Deno.test("melden: op de laatste dag kan het nog, daarna niet meer en blijft alles zoals het was", async () => {
  const opTijd = context(winkel(), LAATSTE_DAG);
  const ok = await handleClaim(meld(), opTijd.ctx);
  assertEquals(ok.status, 200);
  assertEquals(opTijd.store.wedding_referrals[0].partner_claim, "already_known");

  const telaat = context(winkel(), VERLOPEN);
  const r = await handleClaim(meld(), telaat.ctx);
  assertEquals(r.status, 410);
  assertEquals(r.body.error, "expired");
  assertEquals((r.body.view as { state: string }).state, "expired");
  assertEquals(telaat.store.wedding_referrals[0].partner_claim, "none");
  assertEquals(telaat.store.admin_todos, undefined);
});

Deno.test("melden: een tweede keer overschrijft niets en maakt geen tweede taak", async () => {
  const stub = context(winkel(), DRIE_DAGEN_LATER);
  await handleClaim(meld(), stub.ctx);
  const tweede = await handleClaim(meld({ firstContactAt: "2026-08-01", note: "Andere opmerking" }), stub.ctx);
  assertEquals(tweede.status, 200);
  assertEquals((tweede.body.view as { state: string }).state, "reported");
  assertEquals((tweede.body.view as { firstContactAt: string }).firstContactAt, "2026-09-10");
  assertEquals(stub.store.wedding_referrals[0].partner_claim_first_contact_at, "2026-09-10");
  assertEquals(stub.store.admin_todos.length, 1);
});

Deno.test("melden: een gemelde doorverwijzing blijft 'gemeld', ook ná de termijn", async () => {
  const stub = context(winkel({ partner_claim: "already_known", partner_claim_first_contact_at: "2026-09-10" }), VERLOPEN);
  const r = await handleClaim(status(), stub.ctx);
  assertEquals((r.body.view as { state: string }).state, "reported");
});

Deno.test("melden: de datum van het eerste contact is verplicht, echt en vóór de doorverwijzing", async () => {
  const zonder = await handleClaim(meld({ firstContactAt: "" }), context(winkel(), DRIE_DAGEN_LATER).ctx);
  assertEquals(zonder.status, 400);
  assertStringIncludes(String(zonder.body.error), "datum");

  const onzin = await handleClaim(meld({ firstContactAt: "2026-02-30" }), context(winkel(), DRIE_DAGEN_LATER).ctx);
  assertEquals(onzin.status, 400);
  assertStringIncludes(String(onzin.body.error), "geldige datum");

  const stub = context(winkel(), DRIE_DAGEN_LATER);
  const later = await handleClaim(meld({ firstContactAt: "2026-09-29" }), stub.ctx);
  assertEquals(later.status, 400);
  assertStringIncludes(String(later.body.error), "vóór onze doorverwijzing van 28 september 2026");
  assertEquals(stub.store.wedding_referrals[0].partner_claim, "none");

  // dezelfde dag als de doorverwijzing mag wel
  const zelfde = await handleClaim(meld({ firstContactAt: "2026-09-28" }), context(winkel(), DRIE_DAGEN_LATER).ctx);
  assertEquals(zelfde.status, 200);
});

Deno.test("melden: de opmerking is optioneel", async () => {
  const stub = context(winkel(), DRIE_DAGEN_LATER);
  const r = await handleClaim(BodySchema.parse({ action: "report", token: TOKEN, firstContactAt: "2026-09-10" }), stub.ctx);
  assertEquals(r.status, 200);
  assertEquals(stub.store.wedding_referrals[0].partner_claim_note, "");
  assertEquals(String(stub.store.admin_todos[0].description).includes("Opmerking:"), false);
});

// ── Bureaumail ───────────────────────────────────────────────────────────

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const metProject = (extra: Row = {}): Record<string, Row[]> => ({
  ...winkel(extra),
  program_requests: [{ id: PROJECT_ID, reference_number: "BV-2606-0029", customer_name: "Karlijn Smit" }],
});

Deno.test("melden: het bureau krijgt een mail, gelogd op project en partner en in het communicatiedossier", async () => {
  const c = context(metProject(), DRIE_DAGEN_LATER);
  const r = await handleClaim(meld(), c.ctx);
  assertEquals(r.status, 200, JSON.stringify(r.body));

  assertEquals(c.sent.length, 1);
  const mail = c.sent[0];
  assertEquals(mail.To[0].Email, "hallo@bureauvlieland.nl");
  assertEquals(mail.Subject, "Al bekend gemeld — Paal 50 over Anna & Bram (BV-2606-0029)");
  assertStringIncludes(mail.HTMLPart ?? "", "Karlijn Smit");
  assertStringIncludes(mail.HTMLPart ?? "", "10 september 2026");
  assertStringIncludes(mail.HTMLPart ?? "", "Mail van 10 september");
  assertStringIncludes(mail.HTMLPart ?? "", "https://bureauvlieland.nl/admin/bruiloften");
  assertStringIncludes(mail.HTMLPart ?? "", `https://bureauvlieland.nl/admin/aanvragen/${PROJECT_ID}`);

  assertEquals(c.logged.length, 1);
  const log = c.logged[0];
  assertEquals(log.email_type, BUREAU_MAIL_TYPE);
  assertEquals(log.status, "sent");
  assertEquals(log.related_request_id, PROJECT_ID);
  assertEquals(log.related_partner_id, "paal-50");
  assertEquals(log.mailjet_message_id, "mj-1");
  assertEquals(log.idempotency_key, "wedding-referral-claim-bureau-ref-1");
  assertEquals(log.metadata.template_name, BUREAU_MAIL_TYPE);
  assertEquals(typeof log.metadata.actor, "string");

  assertEquals(c.store.project_communications.length, 1);
  const dossier = c.store.project_communications[0];
  assertEquals(dossier.request_id, PROJECT_ID);
  assertEquals(dossier.direction, "outbound");
  assertEquals(dossier.subject, mail.Subject);
  assertStringIncludes(String(dossier.content), "Paal 50 meldt via de link dat Anna & Bram al bekend was.");
  assertStringIncludes(String(dossier.content), "Mail van 10 september");
});

Deno.test("melden: zonder project (sales-inboxmail) gaat de mail wel, zonder projectkoppeling of dossierregel", async () => {
  const c = context(winkel({ request_id: null }), DRIE_DAGEN_LATER);
  const r = await handleClaim(meld(), c.ctx);
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals(c.sent.length, 1);
  assertEquals(c.sent[0].Subject, "Al bekend gemeld — Paal 50 over Anna & Bram");
  assertEquals(String(c.sent[0].HTMLPart).includes("/admin/aanvragen/"), false);
  assertEquals(c.logged[0].related_request_id, undefined);
  assertEquals(c.store.project_communications, undefined);
});

Deno.test("melden: een mislukte bureaumail houdt de melding en de taak overeind en staat als failed in het log", async () => {
  const c = context(metProject(), DRIE_DAGEN_LATER, { send: async () => ({ ok: false, error: "HTTP 500" }) });
  const r = await handleClaim(meld(), c.ctx);
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals(c.store.wedding_referrals[0].partner_claim, "already_known");
  assertEquals(c.store.admin_todos.length, 1);
  assertEquals(c.logged.length, 1);
  assertEquals(c.logged[0].status, "failed");
  assertEquals(c.logged[0].error_message, "HTTP 500");
  assertEquals(c.logged[0].metadata.failure, true);
  assertEquals(c.store.project_communications, undefined);

  const gooit = context(metProject(), DRIE_DAGEN_LATER, { send: async () => { throw new Error("netwerk weg"); } });
  const r2 = await handleClaim(meld(), gooit.ctx);
  assertEquals(r2.status, 200, JSON.stringify(r2.body));
  assertEquals(gooit.logged[0].status, "failed");
  assertEquals(gooit.logged[0].error_message, "netwerk weg");
});

Deno.test("melden: geen mail bij alleen status, bij een verlopen link of bij een tweede melding", async () => {
  const alleenStatus = context(metProject(), DRIE_DAGEN_LATER);
  await handleClaim(status(), alleenStatus.ctx);
  assertEquals(alleenStatus.sent.length, 0);

  const verlopen = context(metProject(), VERLOPEN);
  await handleClaim(meld(), verlopen.ctx);
  assertEquals(verlopen.sent.length, 0);

  const tweemaal = context(metProject(), DRIE_DAGEN_LATER);
  await handleClaim(meld(), tweemaal.ctx);
  await handleClaim(meld(), tweemaal.ctx);
  assertEquals(tweemaal.sent.length, 1);
  assertEquals(tweemaal.logged.length, 1);
});

Deno.test("bureaumail: in testmodus naar het testadres met [TEST], en HTML in de opmerking wordt onschadelijk gemaakt", async () => {
  const c = context(metProject(), DRIE_DAGEN_LATER, { origin: "http://localhost:5173" });
  await handleClaim(meld({ note: "<script>alert(1)</script> & co" }), c.ctx);
  assertEquals(c.sent[0].To[0].Email, "erwin@bureauvlieland.nl");
  assertEquals(c.sent[0].Subject, "[TEST] Al bekend gemeld — Paal 50 over Anna & Bram (BV-2606-0029)");
  assertStringIncludes(c.sent[0].HTMLPart ?? "", "http://localhost:5173/admin/bruiloften");
  assertEquals(String(c.sent[0].HTMLPart).includes("<script>"), false);
  assertStringIncludes(c.sent[0].HTMLPart ?? "", "&lt;script&gt;alert(1)&lt;/script&gt; &amp; co");

  const subject = bureauMailSubject({ partnerName: "", referral: { couple_names: "X & Y" } as never, project: null });
  assertEquals(subject, "Al bekend gemeld — Partner over X & Y");
  assertStringIncludes(bureauMailHtml({ referral: { id: "r", request_id: null, partner_id: "p", couple_names: "X & Y", referred_at: "2026-09-28" }, partnerName: "", firstContactAt: "2026-09-10", reportedAt: "2026-10-01", note: "", project: null }), "X &amp; Y");
});
