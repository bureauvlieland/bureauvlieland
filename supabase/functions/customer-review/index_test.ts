import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { formatDateNL } from "../_shared/email-templates.ts";
import { ClickedSchema, SubmitSchema, handleReview, isLowRating, programDateLabel } from "./index.ts";

// ── Kleine Supabase-stub ─────────────────────────────────────────────────
//
// Ondersteunt precies wat handleReview gebruikt:
//   from(t).select(...).eq(...).maybeSingle()
//   from(t).select(...).in(...)
//   from(t).insert(row)[.select(...).single()]
//   from(t).update(patch).eq(...).is(...)
// Data komt uit `store[tabel]`; een builder is thenable.

type Row = Record<string, unknown>;

function makeStub(store: Record<string, Row[]>) {
  const calls: { table: string; op: string; payload?: unknown }[] = [];
  const from = (table: string) => {
    const state = {
      op: "select",
      filters: [] as ((r: Row) => boolean)[],
      payload: undefined as unknown,
      single: false,
    };
    const exec = () => {
      const rows = (store[table] ||= []);
      if (state.op === "insert") {
        const row: Row = { id: crypto.randomUUID(), created_at: "2026-09-22T10:00:00Z", ...(state.payload as Row) };
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
      insert: (payload: Row) => {
        state.op = "insert";
        state.payload = payload;
        return builder;
      },
      update: (payload: Row) => {
        state.op = "update";
        state.payload = payload;
        return builder;
      },
      eq: (col: string, val: unknown) => {
        state.filters.push((r) => r[col] === val);
        return builder;
      },
      is: (col: string, val: unknown) => {
        state.filters.push((r) => (r[col] ?? null) === val);
        return builder;
      },
      in: (col: string, vals: unknown[]) => {
        state.filters.push((r) => vals.includes(r[col]));
        return builder;
      },
      maybeSingle: () => {
        state.single = true;
        return builder;
      },
      single: () => {
        state.single = true;
        return builder;
      },
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(exec()).then(resolve, reject),
    };
    return builder;
  };
  return { client: { from }, calls, store };
}

const TOKEN = "3f1d2c9b8a7e4f60b1c2d3e4f5a6b7c8";

const programma = (extra: Row = {}): Row => ({
  id: "11111111-1111-4111-8111-111111111111",
  review_token: TOKEN,
  reference_number: "BV-2606-0031",
  customer_name: "Ilona",
  customer_company: "Districon Group",
  selected_dates: ["2026-06-14", "2026-06-12"],
  status: "active",
  cancelled_at: null,
  ...extra,
});

const post = (body: Row, headers: Record<string, string> = {}) =>
  new Request("http://test.local/customer-review", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const beoordeling = (extra: Row = {}): Row => ({
  token: TOKEN,
  rating: 5,
  text_positive: "Alles liep perfect, geweldige hotels en activiteiten.",
  text_improve: "",
  author_name: "Ilona Norbart",
  author_role: "Officemanager",
  company: "Districon Group",
  consent_publish: true,
  consent_reference: true,
  ...extra,
});

Deno.test("schema: score 1 tot 5, naam verplicht, toestemmingen standaard uit", () => {
  assertEquals(SubmitSchema.safeParse(beoordeling({ rating: 0 })).success, false);
  assertEquals(SubmitSchema.safeParse(beoordeling({ rating: 6 })).success, false);
  assertEquals(SubmitSchema.safeParse(beoordeling({ rating: 4.5 })).success, false);
  assertEquals(SubmitSchema.safeParse(beoordeling({ author_name: "  " })).success, false);
  const parsed = SubmitSchema.parse({ token: TOKEN, rating: 4, author_name: "Rients" });
  assertEquals(parsed.consent_publish, false);
  assertEquals(parsed.consent_reference, false);
  assertEquals(parsed.text_positive, "");
  assertEquals(ClickedSchema.safeParse({ token: "kort" }).success, false);
  assertEquals(ClickedSchema.safeParse({ token: TOKEN }).success, true);
});

Deno.test("isLowRating: 3 of lager krijgt opvolging", () => {
  assertEquals(isLowRating(3), true);
  assertEquals(isLowRating(4), false);
});

Deno.test("programDateLabel: leeg, één dag, meerdere dagen gesorteerd", () => {
  assertEquals(programDateLabel(null), "");
  assertEquals(programDateLabel([]), "");
  assertEquals(programDateLabel(["2026-06-12"]), `bezoek op ${formatDateNL("2026-06-12")}`);
  assertEquals(
    programDateLabel(["2026-06-14", "2026-06-12"]),
    `bezoek van ${formatDateNL("2026-06-12")} t/m ${formatDateNL("2026-06-14")}`,
  );
});

Deno.test("handler: onbekend of geannuleerd programma geeft 404", async () => {
  const leeg = makeStub({ program_requests: [] });
  const res = await handleReview(post({ action: "context", token: TOKEN }), leeg.client);
  assertEquals(res.status, 404);

  const geannuleerd = makeStub({ program_requests: [programma({ status: "cancelled" })] });
  const res2 = await handleReview(post({ action: "context", token: TOKEN }), geannuleerd.client);
  assertEquals(res2.status, 404);
});

Deno.test("handler: context geeft programma, links en nog geen beoordeling", async () => {
  const stub = makeStub({
    program_requests: [programma()],
    app_settings: [{ id: "customer_aftersales_google_url", value: "https://g.page/r/test/review" }],
  });
  const res = await handleReview(post({ action: "context", token: TOKEN }), stub.client);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.program.reference_number, "BV-2606-0031");
  assertEquals(body.program.company, "Districon Group");
  assertStringIncludes(body.program.date_label, "bezoek van");
  assertEquals(body.review, null);
  assertEquals(body.links, { google: "https://g.page/r/test/review" });
});

Deno.test("handler: submit slaat op met toestemmingsbewijs, tweede keer 409", async () => {
  const stub = makeStub({ program_requests: [programma()] });
  const res = await handleReview(
    post({ action: "submit", ...beoordeling() }, { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
    stub.client,
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.review.rating, 5);
  assertEquals(body.review.consent_publish, true);

  const opgeslagen = stub.store.customer_reviews[0];
  assertEquals(opgeslagen.request_id, "11111111-1111-4111-8111-111111111111");
  assertEquals(opgeslagen.consent_ip, "203.0.113.7");
  assertEquals(typeof opgeslagen.consent_at, "string");
  assertEquals(opgeslagen.source, "portal");
  // 5/5: geen taak
  assertEquals((stub.store.admin_todos ?? []).length, 0);

  const nogEens = await handleReview(post({ action: "submit", ...beoordeling() }), stub.client);
  assertEquals(nogEens.status, 409);
  assertEquals((await nogEens.json()).error, "already_reviewed");
});

Deno.test("handler: lage score maakt een taak met hoge prioriteit", async () => {
  const stub = makeStub({ program_requests: [programma()] });
  const res = await handleReview(
    post({ action: "submit", ...beoordeling({ rating: 2, text_improve: "De boot was te laat en niemand wist ervan." }) }),
    stub.client,
  );
  assertEquals(res.status, 200);
  const taken = stub.store.admin_todos;
  assertEquals(taken.length, 1);
  assertEquals(taken[0].priority, "high");
  assertEquals(taken[0].auto_type, "customer_review_low");
  assertEquals(taken[0].related_request_id, "11111111-1111-4111-8111-111111111111");
  assertStringIncludes(String(taken[0].title), "Lage beoordeling (2/5) van Districon Group");
  assertStringIncludes(String(taken[0].description), "De boot was te laat");
});

Deno.test("handler: submit met ongeldige invoer geeft 400", async () => {
  const stub = makeStub({ program_requests: [programma()] });
  const res = await handleReview(post({ action: "submit", ...beoordeling({ author_name: "" }) }), stub.client);
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "invalid_review");
  assertEquals((stub.store.customer_reviews ?? []).length, 0);
});

Deno.test("handler: clicked legt de Google-klik één keer vast", async () => {
  const stub = makeStub({ program_requests: [programma()] });
  await handleReview(post({ action: "submit", ...beoordeling() }), stub.client);
  const res = await handleReview(post({ action: "clicked", token: TOKEN }), stub.client);
  assertEquals(res.status, 200);
  const review = stub.store.customer_reviews[0];
  assertEquals(typeof review.google_clicked_at, "string");
  const eerste = review.google_clicked_at;
  await handleReview(post({ action: "clicked", token: TOKEN }), stub.client);
  assertEquals(review.google_clicked_at, eerste);
});

Deno.test("handler: clicked zonder beoordeling geeft 404", async () => {
  const stub = makeStub({ program_requests: [programma()] });
  const res = await handleReview(post({ action: "clicked", token: TOKEN }), stub.client);
  assertEquals(res.status, 404);
});
