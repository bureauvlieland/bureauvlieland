import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { partnerIbans } from "./partnerIbans.ts";

Deno.test("alle bekende IBAN's van een partner, genormaliseerd en zonder dubbelen", () => {
  assertEquals(
    partnerIbans({ iban: "nl91 abna 0417 1643 00", bank_iban: "NL91ABNA0417164300", extra_ibans: ["NL39RABO0300065264", "", null as unknown as string] }),
    ["NL91ABNA0417164300", "NL39RABO0300065264"],
  );
  assertEquals(partnerIbans({ iban: null, bank_iban: null, extra_ibans: null }), []);
  assertEquals(partnerIbans(null), []);
});
