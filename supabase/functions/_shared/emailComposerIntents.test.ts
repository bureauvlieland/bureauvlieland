import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { firstNameFrom } from "./emailComposerIntents.ts";

Deno.test("firstNameFrom slaat aanspreektitels over", () => {
  assertEquals(firstNameFrom("Mevrouw. Karlijn Smit"), "Karlijn");
  assertEquals(firstNameFrom("Dhr. R. Dijkstra"), "R");
  assertEquals(firstNameFrom("De heer Jan de Vries"), "Jan");
  assertEquals(firstNameFrom("Familie Jansen"), "Jansen");
  assertEquals(firstNameFrom("Marianne Swagerman"), "Marianne");
  assertEquals(firstNameFrom("Mevrouw"), "heer/mevrouw");
  assertEquals(firstNameFrom(null), "heer/mevrouw");
});
