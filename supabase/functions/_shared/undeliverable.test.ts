import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { reasonLabel, undeliverableTodoText } from "./undeliverable.ts";

Deno.test("reasonLabel vertaalt Mailjet-redenen", () => {
  assertEquals(reasonLabel("blocked"), "geblokkeerd door Mailjet");
  assertEquals(reasonLabel("onbekend"), "onbekend");
});

Deno.test("undeliverableTodoText noemt adres, reden, onderwerp en de stappen", () => {
  const t = undeliverableTodoText({ email: "x@y.nl", reason: "blocked", subject: "Offerte", detail: "preblocked" });
  assertEquals(t.title, "E-mail niet afgeleverd: x@y.nl");
  assertStringIncludes(t.description, "geblokkeerd door Mailjet");
  assertStringIncludes(t.description, "Onderwerp: Offerte");
  assertStringIncludes(t.description, "Mailjet: preblocked");
  assertStringIncludes(t.description, "Email health");
});
