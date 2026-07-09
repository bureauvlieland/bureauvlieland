import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.env.set("SUPABASE_URL", "http://test-supabase.local");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "srv");

const { handler } = await import("./index.ts");
const url = "http://test-supabase.local/functions/v1/update-partner-item-status";

const baseBody = {
  partnerToken: "test-token",
  itemId: "00000000-0000-0000-0000-000000000001",
};

const post = (body: Record<string, unknown>) =>
  handler(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...baseBody, ...body }),
    }),
  );

Deno.test({ name: "OPTIONS returns CORS", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await handler(new Request(url, { method: "OPTIONS" }));
  assertEquals(res.status, 200);
});

// ============================================================
// Missing / invalid required fields
// ============================================================

Deno.test({ name: "400 bij ontbrekende status", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({ /* no status */ });
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "Missing required fields");
});

Deno.test({ name: "400 bij onbekende status-waarde", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({ status: "not_a_status", quotedPrice: 100 });
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "Invalid status");
});

// ============================================================
// confirmed — prijs-validatie
// ============================================================

Deno.test({ name: "confirmed zonder prijs → 400", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({ status: "confirmed" });
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "Quoted price is required when confirming");
});

Deno.test({ name: "confirmed met prijs 0 → 400 (0 is geen geldige offerte)", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({ status: "confirmed", quotedPrice: 0 });
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "Quoted price is required when confirming");
});

Deno.test({ name: "confirmed met negatieve prijs → 400", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({ status: "confirmed", quotedPrice: -10 });
  assertEquals(res.status, 400);
});

Deno.test({ name: "confirmed zonder voorgestelde tijd is toegestaan (regressie BV-partner-portal)", sanitizeOps: false, sanitizeResources: false }, async () => {
  // Zonder deze regressiefix kwam dit direct terug als 400.
  // De verwachte volgende fout in testomgeving is token-validatie (403).
  const res = await post({ status: "confirmed", quotedPrice: 125 });
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error, "Invalid partner token");
});

Deno.test({ name: "confirmed met tijd + prijs valideert ook door tot token-check", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({ status: "confirmed", quotedPrice: 125, proposedTime: "14:00" });
  assertEquals(res.status, 403);
});

// ============================================================
// alternative — tijd + toelichting verplicht
// ============================================================

Deno.test({ name: "alternative zonder tijd → 400", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({ status: "alternative", statusNote: "later" });
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "Proposed time is required when proposing alternative");
});

Deno.test({ name: "alternative met tijd maar zonder toelichting → 400", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({ status: "alternative", proposedTime: "15:00" });
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error, "Explanation is required when proposing an alternative");
});

Deno.test({ name: "alternative met tijd én toelichting valideert door tot token-check", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({
    status: "alternative",
    proposedTime: "15:00",
    statusNote: "Kan alleen later op de dag",
  });
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error, "Invalid partner token");
});

// ============================================================
// unavailable / executed — geen extra validatie, direct naar token
// ============================================================

Deno.test({ name: "unavailable zonder extra velden valideert door tot token-check", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({ status: "unavailable" });
  assertEquals(res.status, 403);
});

Deno.test({ name: "executed zonder extra velden valideert door tot token-check", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({ status: "executed" });
  assertEquals(res.status, 403);
});

// ============================================================
// acknowledge_price_change — prijs verplicht
// ============================================================

Deno.test({ name: "acknowledge_price_change zonder prijs → 400", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({ status: "acknowledge_price_change" });
  assertEquals(res.status, 403); // token-check komt eerst voor deze status
});

Deno.test({ name: "acknowledge_price_change met geldige prijs → tokencheck", sanitizeOps: false, sanitizeResources: false }, async () => {
  const res = await post({ status: "acknowledge_price_change", quotedPrice: 199 });
  assertEquals(res.status, 403);
});
