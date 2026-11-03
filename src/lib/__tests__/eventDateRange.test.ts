import { describe, it, expect } from "vitest";
import { formatEventDates } from "@/lib/eventDateRange";

describe("leverdatum als bereik", () => {
  it("één dag", () => {
    expect(formatEventDates(["2026-10-16"])).toBe("16 okt. 2026");
  });

  it("aaneengesloten dagen in dezelfde maand (BV-2606-0013)", () => {
    expect(formatEventDates(["2026-10-16", "2026-10-17", "2026-10-18"])).toBe("16 t/m 18 okt. 2026");
  });

  it("over een maandgrens en over een jaargrens", () => {
    expect(formatEventDates(["2026-10-30", "2026-10-31", "2026-11-01"])).toBe("30 okt. t/m 1 nov. 2026");
    expect(formatEventDates(["2026-12-31", "2027-01-01"])).toBe("31 dec. 2026 t/m 1 jan. 2027");
  });

  it("losse dagen in dezelfde maand", () => {
    expect(formatEventDates(["2026-10-16", "2026-10-18", "2026-10-20"])).toBe("16, 18 en 20 okt. 2026");
    expect(formatEventDates(["2026-10-16", "2026-10-17", "2026-10-20"])).toBe("16 t/m 17 en 20 okt. 2026");
  });

  it("losse dagen in verschillende maanden", () => {
    expect(formatEventDates(["2026-10-16", "2026-11-20"])).toBe("16 okt. 2026 en 20 nov. 2026");
  });

  it("sorteert, ontdubbelt en slaat ongeldige waarden over", () => {
    expect(formatEventDates(["2026-10-18", "2026-10-16", "2026-10-17", "2026-10-16", "", null, "geen datum"])).toBe(
      "16 t/m 18 okt. 2026",
    );
    expect(formatEventDates([])).toBe("");
    expect(formatEventDates(null)).toBe("");
  });
});
