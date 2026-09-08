import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { aiErrorMessage, isModelFallbackStatus, modelChain, normalizeModel } from "./ai.ts";

Deno.test("normalizeModel haalt de gateway-prefix weg", () => {
  assertEquals(normalizeModel("google/gemini-2.5-pro"), "gemini-2.5-pro");
  assertEquals(normalizeModel("gemini-2.5-flash"), "gemini-2.5-flash");
});

Deno.test("modelChain: gevraagde model eerst, terugval erachter, geen dubbelen", () => {
  assertEquals(modelChain("google/gemini-3.6-flash"), ["gemini-3.6-flash", "gemini-2.5-flash"]);
  assertEquals(modelChain("google/gemini-2.5-flash"), ["gemini-2.5-flash"]);
  assertEquals(modelChain("x", ["y", "google/y"]), ["x", "y"]);
});

Deno.test("isModelFallbackStatus", () => {
  assertEquals(isModelFallbackStatus(429), true);
  assertEquals(isModelFallbackStatus(404), true);
  assertEquals(isModelFallbackStatus(401), false);
  assertEquals(isModelFallbackStatus(500), false);
});

Deno.test("aiErrorMessage leest de Google-fout of valt terug op de tekst", () => {
  assertEquals(aiErrorMessage(429, JSON.stringify({ error: { message: "Quota exceeded for model x", code: 429 } })), "Quota exceeded for model x");
  assertEquals(aiErrorMessage(502, "Bad gateway"), "Bad gateway");
  assertEquals(aiErrorMessage(503, ""), "HTTP 503");
});
