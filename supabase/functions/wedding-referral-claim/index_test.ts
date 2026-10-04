import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { BodySchema, claimState, handleClaim, type ClaimInput, type Db } from "./index.ts";

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
  const drie = await handleClaim(status(), { db: makeStub(winkel()).db, now: DRIE_DAGEN_LATER });
  assertEquals(drie.status, 200);
  assertEquals((drie.body.view as { state: string }).state, "open");
  assertEquals((drie.body.view as { deadline: string }).deadline, "2026-10-05");
  assertEquals((drie.body.view as { partnerName: string }).partnerName, "Paal 50");
  assertEquals((drie.body.view as { coupleNames: string }).coupleNames, "Anna & Bram");

  const laatste = await handleClaim(status(), { db: makeStub(winkel()).db, now: LAATSTE_DAG });
  assertEquals((laatste.body.view as { state: string }).state, "open");
});

Deno.test("status: na vijf werkdagen is de link verlopen", async () => {
  const r = await handleClaim(status(), { db: makeStub(winkel()).db, now: VERLOPEN });
  assertEquals(r.status, 200);
  assertEquals((r.body.view as { state: string }).state, "expired");
});

Deno.test("status: een onbekend token geeft 404 en laat niets los", async () => {
  const r = await handleClaim(BodySchema.parse({ action: "status", token: "ffffffffffffffffffffffffffffffff" }), { db: makeStub(winkel()).db, now: DRIE_DAGEN_LATER });
  assertEquals(r.status, 404);
  assertEquals(r.body, { error: "not_found" });
});

Deno.test("melden: legt 'al bekend' vast met datum, opmerking, tijdstip en herkomst, en maakt een taak", async () => {
  const stub = makeStub(winkel());
  const r = await handleClaim(meld(), { db: stub.db, now: DRIE_DAGEN_LATER });
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
  const opTijd = makeStub(winkel());
  const ok = await handleClaim(meld(), { db: opTijd.db, now: LAATSTE_DAG });
  assertEquals(ok.status, 200);
  assertEquals(opTijd.store.wedding_referrals[0].partner_claim, "already_known");

  const telaat = makeStub(winkel());
  const r = await handleClaim(meld(), { db: telaat.db, now: VERLOPEN });
  assertEquals(r.status, 410);
  assertEquals(r.body.error, "expired");
  assertEquals((r.body.view as { state: string }).state, "expired");
  assertEquals(telaat.store.wedding_referrals[0].partner_claim, "none");
  assertEquals(telaat.store.admin_todos, undefined);
});

Deno.test("melden: een tweede keer overschrijft niets en maakt geen tweede taak", async () => {
  const stub = makeStub(winkel());
  await handleClaim(meld(), { db: stub.db, now: DRIE_DAGEN_LATER });
  const tweede = await handleClaim(meld({ firstContactAt: "2026-08-01", note: "Andere opmerking" }), { db: stub.db, now: DRIE_DAGEN_LATER });
  assertEquals(tweede.status, 200);
  assertEquals((tweede.body.view as { state: string }).state, "reported");
  assertEquals((tweede.body.view as { firstContactAt: string }).firstContactAt, "2026-09-10");
  assertEquals(stub.store.wedding_referrals[0].partner_claim_first_contact_at, "2026-09-10");
  assertEquals(stub.store.admin_todos.length, 1);
});

Deno.test("melden: een gemelde doorverwijzing blijft 'gemeld', ook ná de termijn", async () => {
  const stub = makeStub(winkel({ partner_claim: "already_known", partner_claim_first_contact_at: "2026-09-10" }));
  const r = await handleClaim(status(), { db: stub.db, now: VERLOPEN });
  assertEquals((r.body.view as { state: string }).state, "reported");
});

Deno.test("melden: de datum van het eerste contact is verplicht, echt en vóór de doorverwijzing", async () => {
  const zonder = await handleClaim(meld({ firstContactAt: "" }), { db: makeStub(winkel()).db, now: DRIE_DAGEN_LATER });
  assertEquals(zonder.status, 400);
  assertStringIncludes(String(zonder.body.error), "datum");

  const onzin = await handleClaim(meld({ firstContactAt: "2026-02-30" }), { db: makeStub(winkel()).db, now: DRIE_DAGEN_LATER });
  assertEquals(onzin.status, 400);
  assertStringIncludes(String(onzin.body.error), "geldige datum");

  const stub = makeStub(winkel());
  const later = await handleClaim(meld({ firstContactAt: "2026-09-29" }), { db: stub.db, now: DRIE_DAGEN_LATER });
  assertEquals(later.status, 400);
  assertStringIncludes(String(later.body.error), "vóór onze doorverwijzing van 28 september 2026");
  assertEquals(stub.store.wedding_referrals[0].partner_claim, "none");

  // dezelfde dag als de doorverwijzing mag wel
  const zelfde = await handleClaim(meld({ firstContactAt: "2026-09-28" }), { db: makeStub(winkel()).db, now: DRIE_DAGEN_LATER });
  assertEquals(zelfde.status, 200);
});

Deno.test("melden: de opmerking is optioneel", async () => {
  const stub = makeStub(winkel());
  const r = await handleClaim(BodySchema.parse({ action: "report", token: TOKEN, firstContactAt: "2026-09-10" }), { db: stub.db, now: DRIE_DAGEN_LATER });
  assertEquals(r.status, 200);
  assertEquals(stub.store.wedding_referrals[0].partner_claim_note, "");
  assertEquals(String(stub.store.admin_todos[0].description).includes("Opmerking:"), false);
});
