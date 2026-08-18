import { describe, it, expect } from "vitest";
import { formatDurationWindow, isExactDuration } from "@/lib/timeUtils";

describe("isExactDuration", () => {
  it("accepteert eenduidige duren", () => {
    expect(isExactDuration("1,5 uur")).toBe(true);
    expect(isExactDuration("45 minuten")).toBe(true);
    expect(isExactDuration("2 uur")).toBe(true);
  });

  it("weigert bereiken en marges", () => {
    expect(isExactDuration("2-3 uur")).toBe(false);
    expect(isExactDuration("4-6")).toBe(false);
    expect(isExactDuration("Max 4 uur")).toBe(false);
    expect(isExactDuration("ca. 2 uur")).toBe(false);
    expect(isExactDuration(null)).toBe(false);
    expect(isExactDuration("")).toBe(false);
  });
});

describe("formatDurationWindow", () => {
  it("berekent eindtijd bij eenduidige duur", () => {
    expect(formatDurationWindow("18:30", "1,5 uur")).toBe("18:30 – 20:00 (1,5 uur)");
    expect(formatDurationWindow("10:00:00", "45 minuten")).toBe("10:00 – 10:45 (45 minuten)");
  });

  it("toont geen eindtijd bij een bereik of marge", () => {
    expect(formatDurationWindow("13:00", "2-3 uur")).toBe("13:00 (2-3 uur)");
    expect(formatDurationWindow("13:00", "Max 4 uur")).toBe("13:00 (Max 4 uur)");
  });

  it("werkt zonder starttijd of zonder duur", () => {
    expect(formatDurationWindow(null, "1,5 uur")).toBe("1,5 uur");
    expect(formatDurationWindow("18:30", null)).toBe("18:30");
    expect(formatDurationWindow(null, null)).toBeNull();
  });

  it("gaat om met niet-klok starttijden zoals flexibel", () => {
    expect(formatDurationWindow("flexibel", "2 uur")).toBe("flexibel (2 uur)");
  });
});
