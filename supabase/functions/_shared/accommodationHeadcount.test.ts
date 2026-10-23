import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  inferPricedForGuests,
  needsHeadcountConfirmation,
  nightsBetween,
  parseHeadcountProposal,
  recalculateLodgingCommission,
  recalculatePricePerPersonPerNight,
} from "./accommodationHeadcount.ts";

Deno.test("accommodationHeadcount: gasten terugrekenen uit totaal en p.p.p.n.", () => {
  assertEquals(inferPricedForGuests({ price_total: 1336, price_per_person_per_night: 133.6 }, 1, 8), 10);
  assertEquals(inferPricedForGuests({ price_total: 1336, price_per_person_per_night: null }, 1, 8), 8);
  assertEquals(nightsBetween("2026-11-05", "2026-11-08"), 3);
});

Deno.test("accommodationHeadcount: bevestiging nodig bij afwijkend aantal zonder voorstel", () => {
  assertEquals(needsHeadcountConfirmation({ status: "selected", priced_for_guests: 10 }, 8), true);
  assertEquals(needsHeadcountConfirmation({ status: "selected", priced_for_guests: 8 }, 8), false);
  assertEquals(needsHeadcountConfirmation({ status: "pending", priced_for_guests: 10 }, 8), false);
  assertEquals(
    needsHeadcountConfirmation({ status: "selected", priced_for_guests: 10, headcount_proposal: { price_total: 1000, guests: 8 } }, 8),
    false,
  );
});

Deno.test("accommodationHeadcount: voorstel lezen en herberekenen", () => {
  const p = parseHeadcountProposal({ price_total: "1068.80", guests: 8, previous_price_total: 1336, previous_guests: 10, proposed_at: "x" });
  assertEquals(p?.price_total, 1068.8);
  assertEquals(parseHeadcountProposal({ guests: 8 }), null);
  assertEquals(recalculatePricePerPersonPerNight(1068.8, 8, 1), 133.6);
  assertEquals(recalculateLodgingCommission(1068.8, 0, 10), 106.88);
});
