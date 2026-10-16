import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { aiErrorMessage, anthropicErrorMessage, isModelFallbackStatus, isProviderFallbackStatus, modelChain, normalizeModel } from "./ai.ts";

Deno.test("normalizeModel haalt de gateway-prefix weg", () => {
  assertEquals(normalizeModel("google/gemini-2.5-pro"), "gemini-2.5-pro");
  assertEquals(normalizeModel("gemini-2.5-flash"), "gemini-2.5-flash");
});

Deno.test("modelChain: gevraagde model eerst, terugval erachter, geen dubbelen", () => {
  assertEquals(modelChain("google/gemini-3.6-flash"), ["gemini-3.6-flash", "gemini-3-flash-preview", "gemini-2.5-pro"]);
  assertEquals(modelChain("google/gemini-2.5-pro"), ["gemini-2.5-pro", "gemini-3.6-flash", "gemini-3-flash-preview"]);
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

Deno.test("isProviderFallbackStatus: Gemini neemt over bij limiet, storing en afgekeurde sleutel", () => {
  assertEquals(isProviderFallbackStatus(401), true);
  assertEquals(isProviderFallbackStatus(403), true);
  assertEquals(isProviderFallbackStatus(429), true);
  assertEquals(isProviderFallbackStatus(500), true);
  assertEquals(isProviderFallbackStatus(529), true);
  assertEquals(isProviderFallbackStatus(400), false);
  assertEquals(isProviderFallbackStatus(422), false);
});

Deno.test("anthropicErrorMessage: ongeldige sleutel in gewone taal, met Anthropics tekst erachter", () => {
  const body = JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" }, request_id: "req_1" });
  assertEquals(
    anthropicErrorMessage(401, `401 ${body}`),
    "AI-sleutel van Claude is ongeldig: vervang het secret ANTHROPIC_API_KEY bij de edge functions (invalid x-api-key).",
  );
  assertEquals(anthropicErrorMessage(429, "429 " + JSON.stringify({ error: { message: "rate_limit" } })), "Claude zit aan zijn limiet; probeer het zo opnieuw (rate_limit).");
  assertEquals(anthropicErrorMessage(529, "529 overloaded"), "Storing bij Claude (529); probeer het zo opnieuw (overloaded).");
  assertEquals(anthropicErrorMessage(400, "400 " + JSON.stringify({ error: { message: "max_tokens too large" } })), "max_tokens too large");
});

Deno.test("aiErrorMessage haalt de boodschap ook uit een Anthropic-body in scan_error", () => {
  const body = JSON.stringify({ error: { message: "AI-sleutel van Claude is ongeldig: vervang het secret ANTHROPIC_API_KEY bij de edge functions (invalid x-api-key)." } });
  assertEquals(aiErrorMessage(401, body), "AI-sleutel van Claude is ongeldig: vervang het secret ANTHROPIC_API_KEY bij de edge functions (invalid x-api-key).");
});
