import { describe, it, expect } from "vitest";
import {
  daysSinceProgram,
  isAftersalesCandidate,
  isAftersalesDue,
  isBookedProgram,
  isLateAftersales,
  lastProgramDate,
} from "@/lib/aftersalesEligibility";

const today = "2026-09-23";
const booked = {
  status: "active",
  cancelled_at: null,
  customer_email: "klant@example.nl",
  aftersales_sent_at: null,
  quote_status: "akkoord_ontvangen",
};

describe("lastProgramDate / daysSinceProgram", () => {
  it("pakt de laatste geldige datum", () => {
    expect(lastProgramDate(["2026-09-18", "2026-09-19T00:00:00Z", "rommel"])).toBe("2026-09-19");
    expect(lastProgramDate([])).toBeNull();
    expect(lastProgramDate(null)).toBeNull();
  });
  it("telt hele dagen", () => {
    expect(daysSinceProgram(["2026-09-20"], today)).toBe(3);
    expect(daysSinceProgram(["2026-09-23"], today)).toBe(0);
  });
});

describe("isBookedProgram", () => {
  it("AV getekend, akkoord of facturatie telt als geboekt", () => {
    expect(isBookedProgram({ terms_accepted_at: "2026-08-01" })).toBe(true);
    expect(isBookedProgram({ quote_status: "definitief_bevestigd" })).toBe(true);
    expect(isBookedProgram({ completion_status: "ready_for_invoice" })).toBe(true);
  });
  it("uitgevoerd of klantakkoord op een onderdeel telt ook", () => {
    expect(isBookedProgram({ quote_status: "offerte_verstuurd" }, [{ status: "executed", executed_at: "2026-09-01" }])).toBe(true);
    expect(isBookedProgram({}, [{ status: "confirmed", customer_accepted_at: "2026-08-01" }])).toBe(true);
  });
  it("een losse aanvraag of offerte niet", () => {
    expect(isBookedProgram({ quote_status: "offerte_verstuurd" }, [{ status: "pending" }])).toBe(false);
    expect(isBookedProgram({ quote_status: "concept" })).toBe(false);
  });
});

describe("isAftersalesCandidate", () => {
  it("afgelopen geboekt programma zonder nazorgmail", () => {
    expect(isAftersalesCandidate({ ...booked, selected_dates: ["2026-07-01"] }, [], today)).toBe(true);
  });
  it("niet als het nog niet voorbij is", () => {
    expect(isAftersalesCandidate({ ...booked, selected_dates: ["2026-09-23"] }, [], today)).toBe(false);
    expect(isAftersalesCandidate({ ...booked, selected_dates: ["2026-10-01"] }, [], today)).toBe(false);
  });
  it("niet als geannuleerd, al verstuurd of zonder e-mail", () => {
    const dates = ["2026-07-01"];
    expect(isAftersalesCandidate({ ...booked, selected_dates: dates, cancelled_at: "2026-06-01" }, [], today)).toBe(false);
    expect(isAftersalesCandidate({ ...booked, selected_dates: dates, status: "cancelled" }, [], today)).toBe(false);
    expect(isAftersalesCandidate({ ...booked, selected_dates: dates, aftersales_sent_at: "2026-07-05" }, [], today)).toBe(false);
    expect(isAftersalesCandidate({ ...booked, selected_dates: dates, customer_email: null }, [], today)).toBe(false);
  });
  it("niet als het nooit geboekt is", () => {
    expect(isAftersalesCandidate({ ...booked, quote_status: "offerte_verstuurd", selected_dates: ["2026-07-01"] }, [], today)).toBe(false);
  });
  it("partners hoeven onderdelen niet op uitgevoerd te zetten", () => {
    const items = [{ status: "confirmed" }, { status: "pending" }];
    expect(isAftersalesCandidate({ ...booked, selected_dates: ["2026-09-18"] }, items, today)).toBe(true);
  });
});

describe("isAftersalesDue", () => {
  it("vanaf N dagen na de laatste datum", () => {
    expect(isAftersalesDue({ ...booked, selected_dates: ["2026-09-21"] }, [], today, 3)).toBe(false);
    expect(isAftersalesDue({ ...booked, selected_dates: ["2026-09-20"] }, [], today, 3)).toBe(true);
  });
  it("niet meer automatisch na 30 dagen (dat gaat via de inhaallijst)", () => {
    expect(isAftersalesDue({ ...booked, selected_dates: ["2026-08-24"] }, [], today, 3)).toBe(true);
    expect(isAftersalesDue({ ...booked, selected_dates: ["2026-08-23"] }, [], today, 3)).toBe(false);
  });
});

describe("isLateAftersales", () => {
  it("andere openingszin na meer dan 30 dagen", () => {
    expect(isLateAftersales(["2026-08-24"], today)).toBe(false);
    expect(isLateAftersales(["2026-08-23"], today)).toBe(true);
    expect(isLateAftersales([], today)).toBe(false);
  });
});
