import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runAutoClose } from "./index.ts";

// ── Simple chainable Supabase-client stub ────────────────────────────────
//
// Ondersteunt precies de methodes die runAutoClose gebruikt:
//   from(t).select(...).is|or|in(...).in(...)...
//   from(t).update({...}).in(...)
//
// Data komt uit `store[table]`. Filters worden gecombineerd en toegepast
// wanneer de builder wordt awaited (thenable).

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

interface QueryState {
  table: string;
  op: "select" | "update";
  filters: Filter[];
  updatePatch?: Row;
}

function buildClient(store: Record<string, Row[]>, log: string[] = []) {
  const runQuery = (state: QueryState) => {
    let rows = (store[state.table] ?? []).filter((r) => state.filters.every((f) => f(r)));
    if (state.op === "update" && state.updatePatch) {
      for (const r of rows) Object.assign(r, state.updatePatch);
      log.push(`UPDATE ${state.table} (${rows.length}) ${JSON.stringify(state.updatePatch)}`);
    }
    // return shallow clones to mimic PostgREST behaviour
    return { data: rows.map((r) => ({ ...r })), error: null };
  };

  const makeBuilder = (state: QueryState) => {
    const builder: Record<string, unknown> = {};
    const chain = (): typeof builder => builder;
    builder.select = (_cols: string) => chain();
    builder.update = (patch: Row) => {
      state.op = "update";
      state.updatePatch = patch;
      return chain();
    };
    builder.in = (col: string, values: unknown[]) => {
      const set = new Set(values);
      state.filters.push((r) => set.has(r[col]));
      return chain();
    };
    builder.is = (col: string, val: unknown) => {
      state.filters.push((r) => r[col] === val || (val === null && r[col] == null));
      return chain();
    };
    builder.neq = (col: string, val: unknown) => {
      state.filters.push((r) => r[col] !== val);
      return chain();
    };
    builder.eq = (col: string, val: unknown) => {
      state.filters.push((r) => r[col] === val);
      return chain();
    };
    // .or("a.is.null,b.neq.x") — minimal parser
    builder.or = (expr: string) => {
      const parts = expr.split(",").map((s) => s.trim());
      state.filters.push((r) => {
        return parts.some((p) => {
          const [col, op, ...rest] = p.split(".");
          const raw = rest.join(".");
          if (op === "is" && raw === "null") return r[col] == null;
          if (op === "neq") return r[col] !== raw;
          if (op === "eq") return r[col] === raw;
          return false;
        });
      });
      return chain();
    };
    // thenable so `await builder` works
    builder.then = (
      resolve: (v: { data: Row[]; error: null }) => void,
      _reject?: (e: unknown) => void,
    ) => {
      resolve(runQuery(state));
    };
    return builder;
  };

  return {
    from: (table: string) => makeBuilder({ table, op: "select", filters: [] }),
    _store: store,
    _log: log,
  };
}

// ── Test data helpers ────────────────────────────────────────────────────
function seed() {
  return {
    program_requests: [
      { id: "past-1", selected_dates: ["2026-07-01", "2026-07-02"], cancelled_at: null, completion_status: "in_progress" },
      { id: "future-1", selected_dates: ["2026-12-01"], cancelled_at: null, completion_status: "in_progress" },
      { id: "cancelled-1", selected_dates: ["2026-01-01"], cancelled_at: "2026-01-05", completion_status: "in_progress" },
      { id: "fully-inv-1", selected_dates: ["2026-01-01"], cancelled_at: null, completion_status: "fully_invoiced" },
      { id: "past-2-nodates", selected_dates: [], cancelled_at: null, completion_status: "in_progress" },
    ],
    program_request_items: [
      { id: "item-a", request_id: "past-1", status: "pending", auto_closed_reason: null },
      { id: "item-b", request_id: "past-1", status: "alternative", auto_closed_reason: null },
      { id: "item-c", request_id: "past-1", status: "confirmed", auto_closed_reason: null },
      { id: "item-d", request_id: "future-1", status: "pending", auto_closed_reason: null },
    ],
    accommodation_requests: [
      { id: "acc-req-1", linked_program_id: "past-1" },
      { id: "acc-req-2", linked_program_id: "future-1" },
    ],
    accommodation_quotes: [
      { id: "q-1", request_id: "acc-req-1", status: "submitted", auto_closed_reason: null },
      { id: "q-2", request_id: "acc-req-1", status: "selected", auto_closed_reason: null },
      { id: "q-3", request_id: "acc-req-2", status: "submitted", auto_closed_reason: null },
    ],
    admin_todos: [
      { id: "todo-close-1", related_request_id: "past-1", status: "todo", auto_type: "quote_pending_partner" },
      { id: "todo-close-2", related_request_id: "past-1", status: "in_progress", auto_type: "customer_inputs_missing" },
      { id: "todo-keep-billing", related_request_id: "past-1", status: "todo", auto_type: "customer_billing_missing" },
      { id: "todo-keep-terms", related_request_id: "past-1", status: "todo", auto_type: "customer_terms_missing" },
      { id: "todo-keep-invoice", related_request_id: "past-1", status: "todo", auto_type: "bureau_invoice_pending" },
      { id: "todo-keep-future", related_request_id: "future-1", status: "todo", auto_type: "quote_pending_partner" },
    ],
  };
}

const NOW = new Date("2026-07-08T09:00:00.000Z");

Deno.test("runAutoClose sluit pre-executie items/quotes/todos, respecteert facturatie/voorwaarden", async () => {
  const store = seed();
  const client = buildClient(store);
  const res = await runAutoClose(client, { now: NOW });

  assertEquals(res.projects_past_execution, 1, "alleen past-1 is past_execution");
  assertEquals(res.items_confirmed, 2, "item-a + item-b geforceerd naar confirmed");
  assertEquals(res.quotes_expired, 1, "alleen q-1 (submitted) — q-2 (selected) blijft");
  assertEquals(res.todos_closed, 2, "quote_pending_partner + customer_inputs_missing");
  assertEquals(res.projects_marked_ready_for_invoice, 1);

  // Facturatie/voorwaarden/factuur todos ongemoeid
  const kept = store.admin_todos.filter((t) => t.status === "todo" || t.status === "in_progress");
  const keptIds = new Set(kept.map((t) => t.id));
  assertEquals(keptIds.has("todo-keep-billing"), true);
  assertEquals(keptIds.has("todo-keep-terms"), true);
  assertEquals(keptIds.has("todo-keep-invoice"), true);
  assertEquals(keptIds.has("todo-keep-future"), true);

  // past-1 project status
  const past = store.program_requests.find((p) => p.id === "past-1")!;
  assertEquals(past.completion_status, "ready_for_invoice");

  // Toekomstig project ongemoeid
  const futItem = store.program_request_items.find((i) => i.id === "item-d")!;
  assertEquals(futItem.status, "pending");
  assertEquals(futItem.auto_closed_reason, null);
});

Deno.test("runAutoClose is idempotent — tweede run raakt niets meer aan", async () => {
  const store = seed();
  const client = buildClient(store);
  await runAutoClose(client, { now: NOW });
  const res2 = await runAutoClose(client, { now: NOW });
  assertEquals(res2.items_confirmed, 0);
  assertEquals(res2.quotes_expired, 0);
  assertEquals(res2.todos_closed, 0);
  // completion_status is nu 'ready_for_invoice' → geen tweede past_execution marker
  assertEquals(res2.projects_marked_ready_for_invoice, 0);
});

Deno.test("runAutoClose dryRun muteert niets", async () => {
  const store = seed();
  const client = buildClient(store);
  const res = await runAutoClose(client, { now: NOW, dryRun: true });
  assertEquals(res.items_confirmed, 2);
  assertEquals(res.todos_closed, 2);
  // Store onveranderd
  const itemA = store.program_request_items.find((i) => i.id === "item-a")!;
  assertEquals(itemA.status, "pending");
  const past = store.program_requests.find((p) => p.id === "past-1")!;
  assertEquals(past.completion_status, "in_progress");
});
