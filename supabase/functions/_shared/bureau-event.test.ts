import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  BUREAU_EVENT_AUTO_TYPES,
  buildBureauEventHtml,
  buildBureauEventMail,
  buildBureauEventTodo,
  bureauEventIdempotencyKey,
  recordBureauEvent,
  type BureauEventInput,
} from "./bureau-event.ts";

const request = {
  id: "req-1",
  reference_number: "BV-2611-0001",
  customer_name: "Wim Haze",
  customer_company: "Haze BV",
};
const partner = { id: "vliehors", name: "Vliehors Expres" };

Deno.test("partner bevestigt: taak partner_status_update, normale prioriteit, prijs in NL-notatie", () => {
  const todo = buildBureauEventTodo({
    kind: "partner_item_confirmed",
    entityId: "item-1",
    request,
    partner,
    itemName: "Vliehors Expres Exclusief",
    quotedPrice: 750,
  });
  assertEquals(todo.auto_type, "partner_status_update");
  assertEquals(todo.auto_entity_id, "item-1");
  assertEquals(todo.priority, "normal");
  assertEquals(todo.related_partner_id, "vliehors");
  assertStringIncludes(todo.title, "Vliehors Expres reageert op \"Vliehors Expres Exclusief\" — bevestigd");
  assertStringIncludes(todo.description, "Haze BV (BV-2611-0001)");
  assertStringIncludes(todo.description, "750,00");
  assert(!todo.description.includes("750.00"), "geen punt als decimaalteken");
});

Deno.test("niet beschikbaar is hoog; alternatief noemt het voorstel", () => {
  const unavailable = buildBureauEventTodo({ kind: "partner_item_unavailable", entityId: "i", request, partner, itemName: "X" });
  assertEquals(unavailable.priority, "high");
  const alt = buildBureauEventTodo({
    kind: "partner_item_alternative", entityId: "i", request, partner, itemName: "X",
    proposedDate: "12 juni", proposedTime: "14:00",
  });
  assertStringIncludes(alt.description, "Voorstel: 12 juni 14:00");
});

Deno.test("uitgevoerd, akkoord en getekend hebben elk een eigen taaktype", () => {
  assertEquals(buildBureauEventTodo({ kind: "partner_item_executed", entityId: "i", request, partner, itemName: "X" }).auto_type, "partner_item_executed");
  assertEquals(buildBureauEventTodo({ kind: "customer_quote_accepted", entityId: "req-1", request }).auto_type, "customer_quote_accepted");
  const signed = buildBureauEventTodo({ kind: "customer_terms_signed", entityId: "req-1", request, reservationNames: "Zeiltocht" });
  assertEquals(signed.auto_type, "customer_terms_signed");
  assertStringIncludes(signed.description, "onder voorbehoud van: Zeiltocht");
  assertEquals(BUREAU_EVENT_AUTO_TYPES.size, 4);
});

Deno.test("mail: partnerreactie en klantacties mailen, uitgevoerd niet", () => {
  const confirmed = buildBureauEventMail({ kind: "partner_item_confirmed", entityId: "i", request, partner, itemName: "Tocht", quotedPrice: 227.5 });
  assert(confirmed);
  assertEquals(confirmed.email_type, "partner_item_response_bureau");
  assertEquals(confirmed.subject, 'Partner Vliehors Expres: "Tocht" bevestigd (BV-2611-0001)');
  assert(confirmed.rows.some(([l, v]) => l === "Prijs (excl. btw)" && v.includes("227,50")));
  assertStringIncludes(confirmed.actionLine, "Aan zet");

  assertEquals(buildBureauEventMail({ kind: "partner_item_executed", entityId: "i", request, partner, itemName: "Tocht" }), null);

  const accepted = buildBureauEventMail({ kind: "customer_quote_accepted", entityId: "req-1", request });
  assertEquals(accepted?.email_type, "quote_accepted_bureau");
  assertEquals(accepted?.subject, "Akkoord van Haze BV op het voorstel (BV-2611-0001)");

  const signed = buildBureauEventMail({ kind: "customer_terms_signed", entityId: "req-1", request });
  assertEquals(signed?.email_type, "terms_signed_bureau");
  assertEquals(signed?.subject, "Haze BV heeft getekend (BV-2611-0001)");
});

Deno.test("html ontsmet vrije tekst en linkt naar het project", () => {
  const mail = buildBureauEventMail({
    kind: "partner_item_unavailable", entityId: "i", request, partner, itemName: "Tocht",
    note: "<script>alert(1)</script> vol",
  })!;
  const html = buildBureauEventHtml(mail, "https://bureauvlieland.nl/admin/aanvragen/req-1");
  assert(!html.includes("<script>"));
  assertStringIncludes(html, "&lt;script&gt;");
  assertStringIncludes(html, "/admin/aanvragen/req-1");
});

Deno.test("idempotency-sleutel: zelfde gebeurtenis zelfde sleutel, andere versie andere sleutel", () => {
  const base: BureauEventInput = { kind: "partner_item_confirmed", entityId: "i", request, partner };
  assertEquals(bureauEventIdempotencyKey(base), bureauEventIdempotencyKey({ ...base }));
  assert(bureauEventIdempotencyKey(base) !== bureauEventIdempotencyKey({ ...base, versionKey: "confirmed-2026-11-22" }));
});

// ---- recordBureauEvent tegen een mini-mock -------------------------------

type Row = Record<string, unknown>;

function makeMock(opts: { openTodos: Row[]; sentKeys: string[] }) {
  const inserted: Row[] = [];
  const updated: Row[] = [];
  function builder(table: string) {
    const filters: Array<[string, unknown]> = [];
    const b: Record<string, unknown> = {};
    const chain = () => b;
    Object.assign(b, {
      select: chain,
      eq: (c: string, v: unknown) => { filters.push([c, v]); return b; },
      in: chain,
      order: chain,
      limit: chain,
      insert: (row: Row) => { inserted.push({ table, ...row }); return Promise.resolve({ error: null }); },
      update: (patch: Row) => ({ eq: (_c: string, id: unknown) => { updated.push({ table, id, ...patch }); return Promise.resolve({ error: null }); } }),
      then: (resolve: (v: unknown) => unknown) => {
        if (table === "admin_todos") return Promise.resolve({ data: opts.openTodos, error: null }).then(resolve);
        if (table === "email_log") {
          const key = filters.find(([c]) => c === "idempotency_key")?.[1];
          const hit = opts.sentKeys.includes(String(key));
          return Promise.resolve({ data: hit ? [{ id: "log" }] : [], error: null }).then(resolve);
        }
        if (table === "app_settings") return Promise.resolve({ data: [], error: null }).then(resolve);
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    });
    return b;
  }
  return { from: builder, inserted, updated };
}

Deno.test("recordBureauEvent: nieuwe gebeurtenis maakt een taak; bestaande open taak wordt bijgewerkt", async () => {
  const fresh = makeMock({ openTodos: [], sentKeys: ["bureau-event-partner_item_executed-i-v1"] });
  const r1 = await recordBureauEvent(fresh, { kind: "partner_item_executed", entityId: "i", request, partner, itemName: "Tocht" });
  assertEquals(r1.todo, "created");
  assertEquals(r1.mail, "none");
  assertEquals(fresh.inserted.length, 1);
  assertEquals(fresh.inserted[0].status, "todo");

  const existing = makeMock({ openTodos: [{ id: "todo-9" }], sentKeys: [] });
  const r2 = await recordBureauEvent(existing, { kind: "partner_item_executed", entityId: "i", request, partner, itemName: "Tocht" });
  assertEquals(r2.todo, "updated");
  assertEquals(existing.inserted.length, 0);
  assertEquals(existing.updated[0].id, "todo-9");
});

Deno.test("recordBureauEvent: al gemailde gebeurtenis mailt niet opnieuw", async () => {
  const mock = makeMock({ openTodos: [], sentKeys: ["bureau-event-customer_quote_accepted-req-1-v1"] });
  const r = await recordBureauEvent(mock, { kind: "customer_quote_accepted", entityId: "req-1", request });
  assertEquals(r.todo, "created");
  assertEquals(r.mail, "skipped");
});
