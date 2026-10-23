import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "srv");
Deno.env.set("SUPABASE_ANON_KEY", "anon");

const { handler } = await import("./index.ts");
const url = "http://test-supabase.local/functions/v1/approve-accommodation-headcount";
const opts = { sanitizeOps: false, sanitizeResources: false };

Deno.test({ name: "approve-accommodation-headcount: OPTIONS geeft CORS", ...opts }, async () => {
  const res = await handler(new Request(url, { method: "OPTIONS" }));
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test({ name: "approve-accommodation-headcount: 401 zonder Authorization", ...opts }, async () => {
  const res = await handler(
    new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoteId: "x", decision: "approve" }) }),
  );
  assertEquals(res.status, 401);
  assertEquals((await res.json()).error, "Niet ingelogd");
});
