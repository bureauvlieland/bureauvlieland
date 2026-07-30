import { describe, it, expect } from "vitest";
import {
  FALLBACK_VALIDITY_DAYS,
  MIN_SHORT_TERM_DAYS,
  QUOTE_VALIDITY_LEAD_DAYS,
  addDaysLocal,
  describeQuoteValidity,
  diffInDays,
  firstProgramDate,
  isQuoteExpired,
  isQuoteValidUntilDateDisabled,
  startOfDay,
  suggestQuoteValidUntil,
} from "../quoteValidity";

const today = new Date("2026-07-30T14:00:00");
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("quoteValidity – standaard: één maand vóór aankomst", () => {
  it("stelt 30 dagen vóór aankomst voor bij ruime aanvraag", () => {
    const s = suggestQuoteValidUntil({ arrivalDate: "2026-10-01", today });
    expect(s.mode).toBe("standard");
    expect(iso(s.date)).toBe("2026-09-01");
    expect(s.daysUntilArrival).toBe(63);
    expect(s.daysValid).toBe(33);
    expect(describeQuoteValidity(s)).toMatch(/één maand vóór aankomst/);
  });

  it("gebruikt exact QUOTE_VALIDITY_LEAD_DAYS", () => {
    const arrival = addDaysLocal(today, 90);
    const s = suggestQuoteValidUntil({ arrivalDate: arrival, today });
    expect(diffInDays(s.date, arrival)).toBe(QUOTE_VALIDITY_LEAD_DAYS);
  });

  it("blijft standaard zolang het voorstel minstens 7 dagen weg is", () => {
    // aankomst over 37 dagen -> voorstel over 7 dagen -> nog net standaard
    const s = suggestQuoteValidUntil({ arrivalDate: addDaysLocal(today, 37), today });
    expect(s.mode).toBe("standard");
    expect(s.daysValid).toBe(7);
  });
});

describe("quoteValidity – korte termijn", () => {
  it("valt terug op een halvering bij aankomst binnen een maand", () => {
    const s = suggestQuoteValidUntil({ arrivalDate: addDaysLocal(today, 12), today });
    expect(s.mode).toBe("short_term");
    expect(s.daysValid).toBe(6);
    expect(describeQuoteValidity(s)).toMatch(/Aankomst is over 12 dag\(en\)/);
  });

  it("houdt het minimum van 3 dagen aan bij zeer late aanvragen", () => {
    const s = suggestQuoteValidUntil({ arrivalDate: addDaysLocal(today, 5), today });
    expect(s.mode).toBe("short_term");
    expect(s.daysValid).toBe(MIN_SHORT_TERM_DAYS);
  });

  it("kapt af op de dag vóór aankomst", () => {
    const arrival = addDaysLocal(today, 2);
    const s = suggestQuoteValidUntil({ arrivalDate: arrival, today });
    expect(s.daysValid).toBe(1);
    expect(iso(s.date)).toBe(iso(addDaysLocal(arrival, -1)));
  });

  it("stelt morgen voor als de aankomst vandaag of in het verleden ligt", () => {
    for (const offset of [1, 0, -3]) {
      const s = suggestQuoteValidUntil({ arrivalDate: addDaysLocal(today, offset), today });
      expect(s.mode).toBe("short_term");
      expect(iso(s.date)).toBe(iso(addDaysLocal(today, 1)));
    }
  });

  it("stelt nooit een datum ná aankomst of vóór morgen voor", () => {
    for (let offset = -2; offset <= 120; offset++) {
      const arrival = addDaysLocal(today, offset);
      const s = suggestQuoteValidUntil({ arrivalDate: arrival, today });
      expect(s.date.getTime()).toBeGreaterThanOrEqual(addDaysLocal(today, 1).getTime());
      if (offset >= 2) {
        expect(s.date.getTime()).toBeLessThan(arrival.getTime());
      }
    }
  });
});

describe("quoteValidity – terugval zonder programmadatum", () => {
  it("gebruikt vandaag + 14 dagen", () => {
    for (const value of [null, undefined, ""]) {
      const s = suggestQuoteValidUntil({ arrivalDate: value as never, today });
      expect(s.mode).toBe("fallback");
      expect(s.daysValid).toBe(FALLBACK_VALIDITY_DAYS);
      expect(s.daysUntilArrival).toBeNull();
      expect(describeQuoteValidity(s)).toMatch(/Nog geen programmadatum/);
    }
  });
});

describe("quoteValidity – meerdaags programma", () => {
  it("ankert op de eerste datum, ook bij ongesorteerde invoer", () => {
    const first = firstProgramDate(["2026-10-03", "2026-10-01", "2026-10-02"]);
    expect(iso(first!)).toBe("2026-10-01");
    const s = suggestQuoteValidUntil({ arrivalDate: first, today });
    expect(iso(s.date)).toBe("2026-09-01");
  });

  it("geeft null bij lege of ontbrekende datumlijst", () => {
    expect(firstProgramDate([])).toBeNull();
    expect(firstProgramDate(null)).toBeNull();
  });
});

describe("quoteValidity – verlopen-check", () => {
  it("is geldig t/m de datum zelf, ongeacht tijdstip", () => {
    expect(isQuoteExpired("2026-07-30", new Date("2026-07-30T23:59:00"))).toBe(false);
    expect(isQuoteExpired("2026-07-30", new Date("2026-07-31T00:01:00"))).toBe(true);
    expect(isQuoteExpired(null, today)).toBe(false);
    expect(isQuoteExpired("kapot", today)).toBe(false);
  });
});

describe("quoteValidity – datepicker-grenzen", () => {
  it("blokkeert vandaag en het verleden", () => {
    expect(isQuoteValidUntilDateDisabled(startOfDay(today), { today })).toBe(true);
    expect(isQuoteValidUntilDateDisabled(addDaysLocal(today, -1), { today })).toBe(true);
    expect(isQuoteValidUntilDateDisabled(addDaysLocal(today, 1), { today })).toBe(false);
  });

  it("blokkeert de aankomstdatum en daarna", () => {
    const arrival = addDaysLocal(today, 10);
    expect(isQuoteValidUntilDateDisabled(addDaysLocal(arrival, -1), { arrivalDate: arrival, today })).toBe(false);
    expect(isQuoteValidUntilDateDisabled(arrival, { arrivalDate: arrival, today })).toBe(true);
    expect(isQuoteValidUntilDateDisabled(addDaysLocal(arrival, 5), { arrivalDate: arrival, today })).toBe(true);
  });

  it("laat morgen toe als de aankomst al bijna is", () => {
    const arrival = addDaysLocal(today, 1);
    expect(isQuoteValidUntilDateDisabled(addDaysLocal(today, 1), { arrivalDate: arrival, today })).toBe(false);
  });
});
