import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildReplyFallbackSubject } from "./subject.ts";

Deno.test("terugval-onderwerp: dossiernummer tussen haakjes als het bekend is", () => {
  assertEquals(buildReplyFallbackSubject("customer", "BV-2611-0012"), "Nieuw bericht van Bureau Vlieland (BV-2611-0012)");
  assertEquals(buildReplyFallbackSubject("customer", ""), "Nieuw bericht van Bureau Vlieland");
  assertEquals(buildReplyFallbackSubject("accommodation_partner", "LOG-2611-0003"), "Nieuw bericht over logiesaanvraag LOG-2611-0003");
  assertEquals(buildReplyFallbackSubject("accommodation_partner", ""), "Nieuw bericht over een logiesaanvraag");
});
