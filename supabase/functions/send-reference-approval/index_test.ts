import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { BodySchema, approvalUrl } from "./index.ts";

Deno.test("approvalUrl: productie tenzij lokaal", () => {
  assertEquals(approvalUrl(undefined, "abc123"), "https://bureauvlieland.nl/referentie-akkoord/abc123");
  assertEquals(approvalUrl("https://bureauvlieland.nl", "abc123"), "https://bureauvlieland.nl/referentie-akkoord/abc123");
  assertEquals(approvalUrl("http://localhost:8080", "abc123"), "http://localhost:8080/referentie-akkoord/abc123");
});

Deno.test("BodySchema: case_id moet een uuid zijn", () => {
  assertEquals(BodySchema.safeParse({ case_id: "nee" }).success, false);
  assertEquals(BodySchema.safeParse({ case_id: "33333333-3333-4333-8333-333333333333" }).success, true);
});
