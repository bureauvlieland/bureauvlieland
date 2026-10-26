import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSelftestTodo, decideSelftestTodoAction } from "./selftestTodo.ts";

const FAILED = [
  { label: "Inhoud verstuurde mail bewaard", detail: "0 rijen", fixHint: "Check email_log" },
  { label: "Partner-notificatie", detail: "timeout" },
];

Deno.test("buildSelftestTodo: titel somt de falende checks op, omschrijving per regel met fix", () => {
  const draft = buildSelftestTodo(FAILED);
  assertEquals(draft.title, "Kritieke zelftest faalt: Inhoud verstuurde mail bewaard, Partner-notificatie");
  assertEquals(
    draft.description,
    "• Inhoud verstuurde mail bewaard: 0 rijen\n  Fix: Check email_log\n• Partner-notificatie: timeout\n  Fix: —",
  );
});

Deno.test("decide: geen bestaande taak → nieuwe taak", () => {
  assertEquals(decideSelftestTodoAction(null, buildSelftestTodo(FAILED)), { kind: "insert" });
});

Deno.test("decide: open taak wordt bijgewerkt, niet gedupliceerd", () => {
  const draft = buildSelftestTodo(FAILED);
  assertEquals(
    decideSelftestTodoAction({ id: "t1", title: "Kritieke zelftest faalt: iets anders", status: "todo" }, draft),
    { kind: "update", id: "t1" },
  );
  assertEquals(
    decideSelftestTodoAction({ id: "t2", title: draft.title, status: "in_progress" }, draft),
    { kind: "update", id: "t2" },
  );
});

Deno.test("decide: bewust genegeerde taak met dezelfde fout komt niet terug", () => {
  const draft = buildSelftestTodo(FAILED);
  assertEquals(
    decideSelftestTodoAction({ id: "t3", title: draft.title, status: "dismissed" }, draft),
    { kind: "skip", reason: "dismissed_same_failure" },
  );
});

Deno.test("decide: genegeerde taak maar andere fout → nieuwe taak", () => {
  const draft = buildSelftestTodo(FAILED);
  assertEquals(
    decideSelftestTodoAction({ id: "t4", title: "Kritieke zelftest faalt: Oude fout", status: "dismissed" }, draft),
    { kind: "insert" },
  );
});

Deno.test("decide: afgeronde taak (zelftest slaagde tussendoor) → nieuwe taak bij hernieuwde fout", () => {
  const draft = buildSelftestTodo(FAILED);
  assertEquals(
    decideSelftestTodoAction({ id: "t5", title: draft.title, status: "done" }, draft),
    { kind: "insert" },
  );
});
