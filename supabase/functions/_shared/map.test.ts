import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isReturnUrlRejection,
  providerFallbackUrl,
  resolveReturnUrl,
  safeReturnUrl,
} from "./map.ts";


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
});






Deno.test("safeReturnUrl weigert http, onbekende hosts en rommel", () => {
  assertEquals(safeReturnUrl("http://visitvlieland.nl/boeken"), null);
  assertEquals(safeReturnUrl("https://evil.example.com/boeken"), null);
  assertEquals(safeReturnUrl("https://visitvlieland.nl.evil.com/"), null);
  assertEquals(safeReturnUrl("javascript:alert(1)"), null);
  assertEquals(safeReturnUrl("niet-een-url"), null);
  assertEquals(safeReturnUrl(null), null);
  assertEquals(safeReturnUrl(""), null);
});

Deno.test("providerFallbackUrl gebruikt de eigen site of niets", () => {
  assertEquals(
    providerFallbackUrl({ websiteUrl: "https://kaasbunker.nl" }),
    "https://kaasbunker.nl/",
  );
  assertEquals(
    providerFallbackUrl({ websiteUrl: "kaasbunker.nl/boeken" }),
    "https://kaasbunker.nl/boeken",
  );
  assertEquals(providerFallbackUrl({ websiteUrl: null }), null);
  assertEquals(providerFallbackUrl({ websiteUrl: "   " }), null);
});

Deno.test("resolveReturnUrl geeft de aanbieder-origin voorrang", () => {
  assertEquals(
    resolveReturnUrl("https://bureauvlieland.nl/boeking-status", "https://visitvlieland.nl"),
    "https://visitvlieland.nl/boeking-status",
  );
  assertEquals(
    resolveReturnUrl("https://bureauvlieland.nl/boeking-status", "visitvlieland.nl"),
    "https://visitvlieland.nl/boeking-status",
  );
  assertEquals(
    resolveReturnUrl("https://bureauvlieland.nl/boeking-status", null),
    "https://bureauvlieland.nl/boeking-status",
  );
  // onbruikbare origin valt terug op de client-URL
  assertEquals(
    resolveReturnUrl("https://bureauvlieland.nl/boeking-status", "http://onveilig.nl"),
    "https://bureauvlieland.nl/boeking-status",
  );
});

Deno.test("isReturnUrlRejection herkent de MAP-whitelistmelding", () => {
  assertEquals(
    isReturnUrlRejection(
      400,
      '{"Message":"returnUrl is missing, invalid, or its host is not whitelisted for this API key."}',
    ),
    true,
  );
  assertEquals(isReturnUrlRejection(400, '{"Message":"Booking already paid"}'), false);
  assertEquals(isReturnUrlRejection(500, "returnUrl not whitelisted"), false);
});

