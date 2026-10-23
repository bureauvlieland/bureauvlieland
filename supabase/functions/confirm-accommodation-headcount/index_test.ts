import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "srv");
Deno.env.set("SUPABASE_ANON_KEY", "anon");

const { handler, sanitizeRoomConfiguration } = await import("./index.ts");
const url = "http://test-supabase.local/functions/v1/confirm-accommodation-headcount";
const opts = { sanitizeOps: false, sanitizeResources: false };

Deno.test({ name: "confirm-accommodation-headcount: OPTIONS geeft CORS", ...opts }, async () => {
  const res = await handler(new Request(url, { method: "OPTIONS" }));
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test({ name: "confirm-accommodation-headcount: 401 zonder Authorization", ...opts }, async () => {
  const res = await handler(
    new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoteId: "x", priceTotal: 100 }) }),
  );
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error, "Niet ingelogd");
});

Deno.test({ name: "confirm-accommodation-headcount: kamerindeling wordt opgeschoond", ...opts }, () => {
  assertEquals(sanitizeRoomConfiguration(null), null);
  assertEquals(sanitizeRoomConfiguration("x"), null);
  const rooms = sanitizeRoomConfiguration([
    { type: "Classic Garden", count: "5", price_per_night: "120", occupancy: 1, room_type_id: "rt1" },
    { type: "zonder aantal", count: 0 },
    "rommel",
  ]);
  assertEquals(rooms?.length, 1);
  assertEquals(rooms?.[0].count, 5);
  assertEquals(rooms?.[0].price_per_night, 120);
  assertEquals(rooms?.[0].room_type_id, "rt1");
});
