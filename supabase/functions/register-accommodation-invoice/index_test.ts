import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "srv");

const { handler } = await import("./index.ts");
const url = "http://test-supabase.local/functions/v1/register-accommodation-invoice";

Deno.test("register-accommodation-invoice: OPTIONS returns CORS", async () => {
  const res = await handler(new Request(url, { method: "OPTIONS" }));
  assertEquals(res.status, 200);
});

Deno.test("register-accommodation-invoice: 400 bij ontbrekende velden", async () => {
  const res = await handler(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
  );
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error, "Alle velden zijn verplicht");
});
