import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildBlockUpdate, formatDurationHours, pickPricePerPerson } from "../_shared/map-sync.ts";

Deno.test("formatDurationHours", () => {
  assertEquals(formatDurationHours(1), "1 uur");
  assertEquals(formatDurationHours(1.5), "1,5 uur");
  assertEquals(formatDurationHours(0.75), "45 minuten");
  assertEquals(formatDurationHours(2.6), "2,5 uur");
  assertEquals(formatDurationHours(null), null);
  assertEquals(formatDurationHours(0), null);
});

Deno.test("pickPricePerPerson neemt het eerstvolgende geldige moment", () => {
  const now = new Date("2026-09-08T12:00:00Z");
  const acts = [
    { ActivityTypeId: 7, Departure: "2026-09-01T10:00:00", PricePerPerson: 10 }, // verleden
    { ActivityTypeId: 7, Departure: "2026-09-20T10:00:00", PricePerPerson: 14, IsCancelled: true },
    { ActivityTypeId: 7, Departure: "2026-09-25T10:00:00", PricePerPerson: 12.5 },
    { ActivityTypeId: 7, Departure: "2026-09-10T10:00:00", PricePerPerson: 0 },
    { ActivityTypeId: 8, Departure: "2026-09-09T10:00:00", PricePerPerson: 99 },
  ];
  assertEquals(pickPricePerPerson(acts, 7, now), 12.5);
  assertEquals(pickPricePerPerson(acts, 9, now), null);
});

Deno.test("buildBlockUpdate laat naam en prijs met rust tenzij gevraagd", () => {
  const block = { id: "b", map_activity_type_id: 7, map_sync_price: false, description: "Oud", duration: "2 uur", price_adult: 30 };
  const type = { Id: 7, Name: "Wadlopen", Description: "Nieuw", Duration: 2, Image: "ref123" };
  assertEquals(buildBlockUpdate(block, type, 25), { description: "Nieuw", imageRef: "ref123" });
  assertEquals(buildBlockUpdate({ ...block, map_sync_price: true }, type, 25), { description: "Nieuw", imageRef: "ref123", price_adult: 25 });
  assertEquals(buildBlockUpdate({ ...block, description: "Nieuw" }, { ...type, Image: null }, null), {});
});
