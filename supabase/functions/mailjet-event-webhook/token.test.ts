import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractWebhookToken, isWebhookAuthorized } from "./token.ts";

const URL_BASE = "https://example.supabase.co/functions/v1/mailjet-event-webhook";

Deno.test("token uit query-param", () => {
  assertEquals(extractWebhookToken(`${URL_BASE}?token=abc`, new Headers()), "abc");
});

Deno.test("token uit x-mailjet-token header", () => {
  assertEquals(
    extractWebhookToken(URL_BASE, new Headers({ "x-mailjet-token": "abc" })),
    "abc",
  );
});

Deno.test("token uit x-webhook-token header als alternatief", () => {
  assertEquals(
    extractWebhookToken(URL_BASE, new Headers({ "x-webhook-token": "abc" })),
    "abc",
  );
});

Deno.test("query-param heeft voorrang op header", () => {
  assertEquals(
    extractWebhookToken(`${URL_BASE}?token=query`, new Headers({ "x-mailjet-token": "header" })),
    "query",
  );
});

Deno.test("geen token ⇒ null en niet geautoriseerd", () => {
  assertEquals(extractWebhookToken(URL_BASE, new Headers()), null);
  assertEquals(isWebhookAuthorized(URL_BASE, new Headers(), "secret"), false);
});

Deno.test("verkeerd token ⇒ niet geautoriseerd", () => {
  assertEquals(isWebhookAuthorized(`${URL_BASE}?token=wrong`, new Headers(), "secret"), false);
});

Deno.test("juist token via header ⇒ geautoriseerd", () => {
  assertEquals(
    isWebhookAuthorized(URL_BASE, new Headers({ "x-mailjet-token": "secret" }), "secret"),
    true,
  );
});
