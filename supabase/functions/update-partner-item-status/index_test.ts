import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "srv");

const { handler } = await import("./index.ts");
const url = "http://test-supabase.local/functions/v1/update-partner-item-status";

Deno.test({ name: "update-partner-item-status: OPTIONS returns CORS", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await handler(new Request(url, { method: "OPTIONS" }));
  assertEquals(res.status, 200);
});

Deno.test({ name: "update-partner-item-status: bevestigen mag zonder voorgestelde tijd", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await handler(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerToken: "test-token",
        itemId: "00000000-0000-0000-0000-000000000001",
        status: "confirmed",
        quotedPrice: 125,
      }),
    }),
  );

  // Zonder deze regressiefix kwam dit direct terug als 400
  // "Proposed time is required..." vóórdat partner/item gevalideerd werden.
  // In de testomgeving is er geen echte partner, dus de verwachte volgende
  // fout is token-validatie.
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error, "Invalid partner token");
});

Deno.test({ name: "update-partner-item-status: alternatief vereist wel een tijd", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await handler(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerToken: "test-token",
        itemId: "00000000-0000-0000-0000-000000000001",
        status: "alternative",
        statusNote: "Kan alleen later op de dag",
      }),
    }),
  );

  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error, "Proposed time is required when proposing alternative");
});