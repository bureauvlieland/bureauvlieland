import { describe, it, expect } from "vitest";
import { summarizeDayAvailability } from "@/lib/mapAvailability";
import type { MapActivity } from "@/hooks/useMapActivities";

const act = (over: Partial<MapActivity>): MapActivity => ({
  Id: 1, ActivityTypeName: "Wadlopen", ActivityTypeId: 7, Departure: "2026-10-12T10:00:00", PricePerPerson: 20,
  PricePerChild: null, MaxPersons: 20, MaxBookings: 20, NumberOfPersonsBooked: 6, BookingCount: 3, RemainingSlots: 14,
  IsActive: true, IsCancelled: false, Duration: 2, Notes: null, Description: null, ...over,
});

describe("summarizeDayAvailability", () => {
  it("zegt niets als er geen momenten op de dag staan", () => {
    const r = summarizeDayAvailability([act({ Departure: "2026-10-13T10:00:00" })], 7, "2026-10-12");
    expect(r.hasMoments).toBe(false);
    expect(r.summary).toBeNull();
  });

  it("noemt de momenten met plek, gesorteerd, en negeert geannuleerde", () => {
    const r = summarizeDayAvailability([
      act({ Departure: "2026-10-12T14:00:00", RemainingSlots: 6 }),
      act({ Departure: "2026-10-12T10:00:00", RemainingSlots: 14 }),
      act({ Departure: "2026-10-12T16:00:00", RemainingSlots: 9, IsCancelled: true }),
      act({ ActivityTypeId: 8, RemainingSlots: 99 }),
    ], 7, "2026-10-12");
    expect(r.summary).toBe("Beschikbaar op deze dag: 10.00 (14 plaatsen) · 14.00 (6 plaatsen)");
    expect(r.totalRemaining).toBe(20);
  });

  it("meldt vol zonder te blokkeren", () => {
    const r = summarizeDayAvailability([act({ RemainingSlots: 0 })], 7, "2026-10-12");
    expect(r.hasMoments).toBe(true);
    expect(r.summary).toMatch(/vol/);
  });

  it("houdt rekening met de groepsgrootte", () => {
    const r = summarizeDayAvailability([act({ RemainingSlots: 14 }), act({ Departure: "2026-10-12T14:00:00", RemainingSlots: 30 })], 7, "2026-10-12", 20);
    expect(r.summary).toBe("Beschikbaar op deze dag: 14.00 (30 plaatsen)");
    const small = summarizeDayAvailability([act({ RemainingSlots: 4 })], 7, "2026-10-12", 20);
    expect(small.summary).toMatch(/^Op deze dag nog 4 losse plaatsen/);
  });
});
