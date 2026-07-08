import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_ANON_KEY", "anon");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "srv");
Deno.env.set("MAILJET_API_KEY", "mj");
Deno.env.set("MAILJET_SECRET_KEY", "mj");

const { handler } = await import("./index.ts");
const url = "http://test-supabase.local/functions/v1/send-ticket-email";

Deno.test({ name: "send-ticket-email: OPTIONS returns CORS", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await handler(new Request(url, { method: "OPTIONS" }));
  assertEquals(res.status, 200);
});

Deno.test({ name: "send-ticket-email: 401 zonder Authorization", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await handler(new Request(url, { method: "POST", body: "{}" }));
  assertEquals(res.status, 401);
  await res.text();
});
