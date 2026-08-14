import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fallbackBookingUrl, safeReturnUrl } from "./map.ts";

Deno.test("safeReturnUrl accepteert toegestane hosts", () => {
  assertEquals(
    safeReturnUrl("https://visitvlieland.nl/boeken?x=1"),
    "https://visitvlieland.nl/boeken?x=1",
  );
  assertEquals(
    safeReturnUrl("https://www.visitvlieland.nl/boeken"),
    "https://www.visitvlieland.nl/boeken",
  );
  assertEquals(
    safeReturnUrl("https://preview.lovable.app/retour"),
    "https://preview.lovable.app/retour",
  );
});

Deno.test("safeReturnUrl accepteert de Bureau Vlieland hosts", () => {
  assertEquals(
    safeReturnUrl("https://bureauvlieland.nl/boeking-status"),
    "https://bureauvlieland.nl/boeking-status",
  );
  assertEquals(
    safeReturnUrl("https://www.bureauvlieland.nl/boeking-status"),
    "https://www.bureauvlieland.nl/boeking-status",
  );


Deno.test("safeReturnUrl weigert http, onbekende hosts en rommel", () => {
  assertEquals(safeReturnUrl("http://visitvlieland.nl/boeken"), null);
  assertEquals(safeReturnUrl("https://evil.example.com/boeken"), null);
  assertEquals(safeReturnUrl("https://visitvlieland.nl.evil.com/"), null);
  assertEquals(safeReturnUrl("javascript:alert(1)"), null);
  assertEquals(safeReturnUrl("niet-een-url"), null);
  assertEquals(safeReturnUrl(null), null);
  assertEquals(safeReturnUrl(""), null);
});

Deno.test("fallbackBookingUrl wijst naar de MAP-pagina van de aanbieder", () => {
  assertEquals(
    fallbackBookingUrl("zeehondentochten"),
    "https://portal.mijnactiviteitenplanner.nl/zeehondentochten",
  );
});
