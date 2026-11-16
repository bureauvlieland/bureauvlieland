import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseVatRate, resolveVatRate } from "./vatRate.ts";

Deno.test("tarief van de client gaat voor", () => {
  assertEquals(resolveVatRate(9, 21), 9);
  assertEquals(resolveVatRate("9", "21"), 9);
  assertEquals(resolveVatRate(0, 9), 0);
});

Deno.test("zonder tarief van de client: het tarief van het onderdeel, nooit blind 21%", () => {
  assertEquals(resolveVatRate(undefined, 9), 9);
  assertEquals(resolveVatRate(null, "9"), 9);
  assertEquals(resolveVatRate("", 0), 0);
});

Deno.test("pas zonder beide: 21%", () => {
  assertEquals(resolveVatRate(undefined, null), 21);
  assertEquals(resolveVatRate("abc", "x"), 21);
});

Deno.test("parseVatRate: lege en ongeldige waarden zijn null", () => {
  assertEquals(parseVatRate(""), null);
  assertEquals(parseVatRate(-1), null);
  assertEquals(parseVatRate("21"), 21);
});
