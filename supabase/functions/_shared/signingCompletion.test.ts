import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { firstProgramDay, markReadyForInvoiceAtSigning } from "./signingCompletion.ts";

const TODAY = "2026-10-26";

Deno.test("firstProgramDay sorteert en negeert rommel", () => {
  assertEquals(firstProgramDay(["2026-11-07", "2026-11-05T00:00:00Z", "x"]), "2026-11-05");
  assertEquals(firstProgramDay([]), null);
  assertEquals(firstProgramDay(null), null);
});

Deno.test("tekenen vóór het evenement zet het project niet op facturatie", () => {
  assertEquals(markReadyForInvoiceAtSigning(["2026-11-05"], TODAY), false);
  assertEquals(markReadyForInvoiceAtSigning(["2026-10-26"], TODAY), false);
  assertEquals(markReadyForInvoiceAtSigning([], TODAY), false);
});

Deno.test("tekenen ná het evenement wel", () => {
  assertEquals(markReadyForInvoiceAtSigning(["2026-10-20", "2026-10-21"], TODAY), true);
});
