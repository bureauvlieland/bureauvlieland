import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { requestIdForTodo } from "./todoRequestLink.ts";

const REQ = "6f1c2b3a-1111-4222-8333-444455556666";

Deno.test("expliciete koppeling heeft voorrang", () => {
  assertEquals(
    requestIdForTodo({ auto_type: "new_program_request", auto_entity_id: "other", related_request_id: REQ }),
    REQ,
  );
});

Deno.test("wees-taak van project-gebonden type valt terug op auto_entity_id", () => {
  assertEquals(
    requestIdForTodo({ auto_type: "new_program_request", auto_entity_id: REQ, related_request_id: null }),
    REQ,
  );
});

Deno.test("niet-projectgebonden type zonder koppeling hangt nergens aan", () => {
  assertEquals(
    requestIdForTodo({ auto_type: "commission_pending", auto_entity_id: REQ, related_request_id: null }),
    null,
  );
  assertEquals(
    requestIdForTodo({ auto_type: "critical_selftest_failure", auto_entity_id: "critical-selftest", related_request_id: null }),
    null,
  );
});

Deno.test("ongeldig entity-id wordt genegeerd", () => {
  assertEquals(
    requestIdForTodo({ auto_type: "new_program_request", auto_entity_id: "selftest-2026-10-26", related_request_id: null }),
    null,
  );
});
