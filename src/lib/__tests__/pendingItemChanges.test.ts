import { describe, it, expect } from "vitest";
import {
  effectivePreferredTime,
  isCancelledItem,
  pendingChangeChipLabel,
  pendingChangeKind,
  pendingChangeLabels,
  sortByEffectiveTime,
} from "@/lib/pendingItemChanges";

describe("pendingItemChanges", () => {
  it("gebruikt pending tijd boven live tijd", () => {
    expect(effectivePreferredTime({ preferred_time: "09:00", pending_preferred_time: "14:30" })).toBe("14:30");
    expect(effectivePreferredTime({ preferred_time: "09:00" })).toBe("09:00");
    expect(effectivePreferredTime({})).toBeNull();
  });

  it("sorteert op effectieve tijd, items zonder tijd onderaan", () => {
    const sorted = sortByEffectiveTime([
      { preferred_time: "12:00" },
      { preferred_time: null },
      { preferred_time: "09:00", pending_preferred_time: "18:00" },
      { preferred_time: "10:00" },
    ]);
    expect(sorted.map((i) => effectivePreferredTime(i))).toEqual(["10:00", "12:00", "18:00", null]);
  });

  it("herkent toegevoegd, verwijderd en gewijzigd", () => {
    expect(pendingChangeKind({ pending_added: true })).toBe("added");
    expect(pendingChangeKind({ pending_marked_for_removal: true })).toBe("removed");
    expect(pendingChangeKind({ pending_admin_price_override: 120 })).toBe("changed");
    expect(pendingChangeKind({})).toBeNull();
  });

  it("bundelt gewijzigde velden in leesbare labels", () => {
    expect(pendingChangeLabels({ pending_admin_price_override: 10, pending_override_people: 8 })).toEqual([
      "personen",
      "prijs",
    ]);
    expect(pendingChangeLabels({ pending_location_lat: 1, pending_location_lng: 2 })).toEqual(["locatie"]);
    expect(pendingChangeChipLabel({ pending_preferred_time: "10:00" })).toBe("Gewijzigd: tijd");
    expect(pendingChangeChipLabel({ pending_marked_for_removal: true })).toBe("Wordt verwijderd");
    expect(pendingChangeChipLabel({})).toBeNull();
  });

  it("markeert geannuleerde onderdelen", () => {
    expect(isCancelledItem({ status: "cancelled" })).toBe(true);
    expect(isCancelledItem({ status: "confirmed" })).toBe(false);
  });
});
