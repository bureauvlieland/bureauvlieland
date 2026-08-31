import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { z } from "https://esm.sh/zod@3.23.8";

// Spiegelt BodySchema uit index.ts — de functie zelf importeren zou een echte
// Supabase-client opzetten, dat hoort niet in een unit-test.
const BodySchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
  reopenItems: z.boolean().optional().default(true),
  extendValidity: z.boolean().optional().default(false),
});

const id = "bea99336-6622-45a5-b22c-44662c80e16f";

Deno.test("reopen: reden is verplicht", () => {
  assertEquals(BodySchema.safeParse({ requestId: id }).success, false);
  assertEquals(BodySchema.safeParse({ requestId: id, reason: "ok" }).success, false);
  assertEquals(
    BodySchema.safeParse({ requestId: id, reason: "Klant meldt zich alsnog" }).success,
    true,
  );
});

Deno.test("reopen: onderdelen standaard mee, geldigheid niet", () => {
  const parsed = BodySchema.parse({ requestId: id, reason: "Klant meldt zich alsnog" });
  assertEquals(parsed.reopenItems, true);
  assertEquals(parsed.extendValidity, false);
});

Deno.test("reopen: requestId moet een uuid zijn", () => {
  assertEquals(BodySchema.safeParse({ requestId: "BV-2606-0026", reason: "test123" }).success, false);
});
