import { describe, it, expect } from "vitest";
import {
  describeHeadcountChange,
  hasPendingHeadcountProposal,
  inferPricedForGuests,
  needsHeadcountConfirmation,
  nightsBetween,
  parseHeadcountProposal,
  recalculateLodgingCommission,
  recalculatePricePerPersonPerNight,
} from "../accommodationHeadcount";

describe("nightsBetween", () => {
  it("telt nachten tussen aankomst en vertrek, minimaal 1", () => {
    expect(nightsBetween("2026-11-05", "2026-11-06")).toBe(1);
    expect(nightsBetween("2026-11-05", "2026-11-08")).toBe(3);
    expect(nightsBetween("2026-11-05", "2026-11-05")).toBe(1);
    expect(nightsBetween(null, "2026-11-05")).toBe(1);
  });
});

describe("inferPricedForGuests", () => {
  it("rekent het aantal gasten terug uit totaal en p.p.p.n. (BV-2608-0002: 1336 / 133,60)", () => {
    expect(inferPricedForGuests({ price_total: 1336, price_per_person_per_night: 133.6 }, 1, 8)).toBe(10);
    expect(inferPricedForGuests({ price_total: "1690", price_per_person_per_night: "169" }, 1, 8)).toBe(10);
  });

  it("deelt ook door het aantal nachten", () => {
    expect(inferPricedForGuests({ price_total: 2400, price_per_person_per_night: 100 }, 2, null)).toBe(12);
  });

  it("valt terug op het opgegeven aantal zonder bruikbare p.p.p.n. of zonder rond getal", () => {
    expect(inferPricedForGuests({ price_total: 1336, price_per_person_per_night: null }, 1, 8)).toBe(8);
    expect(inferPricedForGuests({ price_total: 0, price_per_person_per_night: 133.6 }, 1, 8)).toBe(8);
    expect(inferPricedForGuests({ price_total: 1000, price_per_person_per_night: 133.6 }, 1, 8)).toBe(8);
  });
});

describe("needsHeadcountConfirmation", () => {
  const selected = { status: "selected", priced_for_guests: 10 };

  it("is waar als een gekozen offerte voor een ander aantal geldt dan de aanvraag", () => {
    expect(needsHeadcountConfirmation(selected, 8)).toBe(true);
  });

  it("is onwaar bij gelijk aantal, andere status, onbekend aantal of een openstaand voorstel", () => {
    expect(needsHeadcountConfirmation(selected, 10)).toBe(false);
    expect(needsHeadcountConfirmation({ ...selected, status: "submitted" }, 8)).toBe(false);
    expect(needsHeadcountConfirmation({ status: "selected", priced_for_guests: null }, 8)).toBe(false);
    expect(needsHeadcountConfirmation(selected, null)).toBe(false);
    expect(
      needsHeadcountConfirmation(
        { ...selected, headcount_proposal: { price_total: 1100, guests: 8, previous_price_total: 1336, previous_guests: 10, proposed_at: "2026-10-23T10:00:00Z" } },
        8,
      ),
    ).toBe(false);
  });
});

describe("parseHeadcountProposal", () => {
  it("leest een geldig voorstel en negeert rommel", () => {
    const p = parseHeadcountProposal({ price_total: "1068.80", guests: 8, previous_price_total: 1336, previous_guests: 10, note: " kamer minder ", proposed_at: "2026-10-23T10:00:00Z" });
    expect(p).toMatchObject({ price_total: 1068.8, guests: 8, previous_price_total: 1336, previous_guests: 10, note: " kamer minder " });
    expect(parseHeadcountProposal(null)).toBeNull();
    expect(parseHeadcountProposal({ guests: 8 })).toBeNull();
    expect(parseHeadcountProposal("x")).toBeNull();
    expect(hasPendingHeadcountProposal({ headcount_proposal: { price_total: 1, guests: 1 } })).toBe(true);
    expect(hasPendingHeadcountProposal({ headcount_proposal: null })).toBe(false);
  });
});

describe("herberekeningen", () => {
  it("p.p.p.n. volgt dezelfde formule als bij indienen", () => {
    expect(recalculatePricePerPersonPerNight(1068.8, 8, 1)).toBeCloseTo(133.6, 5);
    expect(recalculatePricePerPersonPerNight(2400, 12, 2)).toBe(100);
    expect(recalculatePricePerPersonPerNight(0, 8, 1)).toBeNull();
    expect(recalculatePricePerPersonPerNight(100, 0, 1)).toBeNull();
  });

  it("commissie volgt select-accommodation-quote: percentage over totaal plus extra's", () => {
    expect(recalculateLodgingCommission(1068.8, 0, 10)).toBe(106.88);
    expect(recalculateLodgingCommission(1000, 50, 12.5)).toBe(131.25);
    expect(recalculateLodgingCommission(1336, 0, null)).toBe(133.6);
  });

  it("omschrijft de wijziging", () => {
    expect(describeHeadcountChange(10, 8)).toBe("van 10 naar 8 gasten");
    expect(describeHeadcountChange(null, 8)).toBe("naar 8 gasten");
  });
});
