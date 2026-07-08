import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "srv");
Deno.env.set("MAILJET_API_KEY", "mj");
Deno.env.set("MAILJET_SECRET_KEY", "mj");

const { handler } = await import("./index.ts");
const url = "http://test-supabase.local/functions/v1/send-customer-aftersales";

Deno.test({ name: "send-customer-aftersales: OPTIONS returns CORS", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await handler(new Request(url, { method: "OPTIONS" }));
  assertEquals(res.status, 200);
});

Deno.test({ name: "send-customer-aftersales: 400 zonder request_id", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await handler(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
  );
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error, "request_id is verplicht");
});
