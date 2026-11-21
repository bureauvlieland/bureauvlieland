import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  PARTNER_STATUS_UPDATE_TTL_DAYS,
  shouldClosePartnerStatusUpdate,
} from "./partnerStatusUpdateTodo.ts";

const now = new Date("2026-11-21T10:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

Deno.test("een verse bevestiging blijft staan: confirmed is geen reden om te sluiten", () => {
  assertEquals(
    shouldClosePartnerStatusUpdate({ created_at: daysAgo(1) }, { status: "confirmed" }, now),
    false,
  );
});

Deno.test("ook accepted, executed en unavailable sluiten de taak niet binnen de termijn", () => {
  for (const status of ["accepted", "executed", "unavailable", "alternative", "pending"]) {
    assertEquals(
      shouldClosePartnerStatusUpdate({ created_at: daysAgo(2) }, { status }, now),
      false,
      status,
    );
  }
});

Deno.test("na de bewaartermijn gaat de taak dicht", () => {
  assertEquals(
    shouldClosePartnerStatusUpdate(
      { created_at: daysAgo(PARTNER_STATUS_UPDATE_TTL_DAYS + 1) },
      { status: "confirmed" },
      now,
    ),
    true,
  );
  assertEquals(
    shouldClosePartnerStatusUpdate(
      { created_at: daysAgo(PARTNER_STATUS_UPDATE_TTL_DAYS - 1) },
      { status: "confirmed" },
      now,
    ),
    false,
  );
});

Deno.test("verdwenen of geannuleerd onderdeel sluit de taak direct", () => {
  assertEquals(shouldClosePartnerStatusUpdate({ created_at: daysAgo(0) }, null, now), true);
  assertEquals(
    shouldClosePartnerStatusUpdate({ created_at: daysAgo(0) }, { status: "cancelled" }, now),
    true,
  );
});

Deno.test("onleesbare datum: niet sluiten", () => {
  assertEquals(
    shouldClosePartnerStatusUpdate({ created_at: "geen datum" }, { status: "confirmed" }, now),
    false,
  );
});
