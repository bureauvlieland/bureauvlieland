import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ApproveSchema, FeedbackSchema, handleReferenceCase, publicView } from "./index.ts";

type Row = Record<string, unknown>;

function makeStub(store: Record<string, Row[]>) {
  const from = (table: string) => {
    const state = { op: "select", filters: [] as ((r: Row) => boolean)[], payload: undefined as unknown, single: false };
    const exec = () => {
      const rows = (store[table] ||= []);
      if (state.op === "insert") {
        const row: Row = { id: crypto.randomUUID(), ...(state.payload as Row) };
        rows.push(row);
        return { data: state.single ? row : [row], error: null };
      }
      const hit = rows.filter((r) => state.filters.every((f) => f(r)));
      if (state.op === "update") {
        for (const r of hit) Object.assign(r, state.payload as Row);
        return { data: state.single ? hit[0] ?? null : hit, error: null };
      }
      return { data: state.single ? hit[0] ?? null : hit, error: null };
    };
    const builder = {
      select: () => builder,
      insert: (payload: Row) => ((state.op = "insert"), (state.payload = payload), builder),
      update: (payload: Row) => ((state.op = "update"), (state.payload = payload), builder),
      eq: (col: string, val: unknown) => (state.filters.push((r) => r[col] === val), builder),
      maybeSingle: () => ((state.single = true), builder),
      single: () => ((state.single = true), builder),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(exec()).then(resolve, reject),
    };
    return builder;
  };
  return { client: { from }, store };
}

const TOKEN = "9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";

const referentie = (extra: Row = {}): Row => ({
  id: "33333333-3333-4333-8333-333333333333",
  request_id: REQUEST_ID,
  approval_token: TOKEN,
  slug: "districon-group-juni-2026",
  title: "Twee dagen Vlieland met Districon Group",
  intro: "Intro.",
  body: "Alinea 1.\n\nAlinea 2.",
  quote: "Alles liep perfect.",
  quote_author: "Ilona Norbart",
  quote_role: "Officemanager",
  company: "Districon Group",
  group_size: 24,
  program_date: "2026-06-12",
  days: 2,
  facts: [{ label: "Groepsgrootte", value: "24 personen" }],
  program: [],
  photos: [],
  block_ids: ["zeehondentocht"],
  status: "sent",
  approval_sent_at: "2026-09-22T10:00:00Z",
  approved_at: null,
  approved_name: null,
  approved_ip: null,
  feedback: null,
  feedback_at: null,
  ...extra,
});

const programma = (): Row => ({ id: REQUEST_ID, reference_number: "BV-2606-0031", customer_name: "Ilona Norbart" });

const post = (body: Row, headers: Record<string, string> = {}) =>
  new Request("http://test.local/reference-case", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

Deno.test("schema's: naam en tekst verplicht", () => {
  assertEquals(ApproveSchema.safeParse({ token: TOKEN, name: " " }).success, false);
  assertEquals(ApproveSchema.safeParse({ token: TOKEN, name: "Ilona" }).success, true);
  assertEquals(FeedbackSchema.safeParse({ token: TOKEN, text: "ok" }).success, false);
  assertEquals(FeedbackSchema.safeParse({ token: TOKEN, text: "Graag de foto van dag 2 vervangen." }).success, true);
});

Deno.test("publicView laat interne velden weg", () => {
  const view = publicView(referentie({ approved_ip: "203.0.113.7", feedback: "geheim" }) as never, { reference_number: "BV-1", customer_name: "Ilona" });
  assertEquals("approved_ip" in view, false);
  assertEquals("feedback" in view, false);
  assertEquals("approval_token" in view, false);
  assertEquals(view.reference_number, "BV-1");
});

Deno.test("context: onbekend token of verborgen pagina geeft 404", async () => {
  const leeg = makeStub({ reference_cases: [] });
  assertEquals((await handleReferenceCase(post({ action: "context", token: TOKEN }), leeg.client)).status, 404);
  const verborgen = makeStub({ reference_cases: [referentie({ status: "hidden" })], program_requests: [programma()] });
  assertEquals((await handleReferenceCase(post({ action: "context", token: TOKEN }), verborgen.client)).status, 404);
});

Deno.test("context: concept is met het token te zien (voorvertoning)", async () => {
  const stub = makeStub({ reference_cases: [referentie({ status: "draft" })], program_requests: [programma()] });
  const res = await handleReferenceCase(post({ action: "context", token: TOKEN }), stub.client);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.case.status, "draft");
  assertEquals(body.case.customer_name, "Ilona Norbart");
  assertEquals(body.case.title, "Twee dagen Vlieland met Districon Group");
});

Deno.test("approve: legt akkoord vast met naam en IP en maakt een taak", async () => {
  const stub = makeStub({ reference_cases: [referentie()], program_requests: [programma()] });
  const res = await handleReferenceCase(
    post({ action: "approve", token: TOKEN, name: "Ilona Norbart" }, { "x-forwarded-for": "203.0.113.7" }),
    stub.client,
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.case.status, "approved");
  assertEquals(body.case.approved_name, "Ilona Norbart");
  const rij = stub.store.reference_cases[0];
  assertEquals(rij.approved_ip, "203.0.113.7");
  assertEquals(typeof rij.approved_at, "string");
  const taken = stub.store.admin_todos;
  assertEquals(taken.length, 1);
  assertEquals(taken[0].auto_type, "reference_case_approved");
  assertStringIncludes(String(taken[0].title), "goedgekeurd door Ilona Norbart");

  // tweede keer: geen tweede taak, wel 200
  const nogEens = await handleReferenceCase(post({ action: "approve", token: TOKEN, name: "Ilona Norbart" }), stub.client);
  assertEquals(nogEens.status, 200);
  assertEquals((await nogEens.json()).already, true);
  assertEquals(stub.store.admin_todos.length, 1);
});

Deno.test("approve: een al gepubliceerde pagina blijft gepubliceerd", async () => {
  const stub = makeStub({ reference_cases: [referentie({ status: "published", approved_at: null })], program_requests: [programma()] });
  const res = await handleReferenceCase(post({ action: "approve", token: TOKEN, name: "Ilona" }), stub.client);
  assertEquals((await res.json()).case.status, "published");
});

Deno.test("feedback: slaat de wens op en maakt een taak met hoge prioriteit", async () => {
  const stub = makeStub({ reference_cases: [referentie()], program_requests: [programma()] });
  const res = await handleReferenceCase(post({ action: "feedback", token: TOKEN, text: "Graag onze bedrijfsnaam voluit." }), stub.client);
  assertEquals(res.status, 200);
  assertEquals(stub.store.reference_cases[0].feedback, "Graag onze bedrijfsnaam voluit.");
  const taak = stub.store.admin_todos[0];
  assertEquals(taak.priority, "high");
  assertEquals(taak.auto_type, "reference_case_feedback");
  assertStringIncludes(String(taak.description), "bedrijfsnaam voluit");
});
