import { describe, it, expect } from "vitest";
import {
  assessItemAvailability,
  assessProgramAvailability,
  suggestReplacement,
  formatIsoDayNL,
  type AvailabilityBlock,
} from "@/lib/programAvailability";

const blocks: AvailabilityBlock[] = [
  { id: "strandspektakel", name: "Strandspektakel", category: "outdoor", provider_id: "voc", sort_order: 5 },
  { id: "wadloop", name: "Wadloopexcursie", category: "outdoor", provider_id: "sne", sort_order: 9 },
  { id: "kanoen", name: "Kanoën", category: "outdoor", provider_id: "kano", sort_order: 2, max_people: 16 },
  { id: "watertaxi", name: "Watertaxi", category: "vervoer", provider_id: "bazuin", max_people: 12 },
  { id: "luxe-lunch", name: "Luxe Lunchbuffet", category: "catering", provider_id: "zuiver", min_people: 15 },
  { id: "zelf", name: "Zelf geregeld", category: "outdoor", provider_id: null, block_type: "self_arranged" },
];

const periods = [
  { partner_id: "voc", start_date: "2026-09-16", end_date: "2027-03-31" },
  { partner_id: "yoga", start_date: "2026-09-11", end_date: "2026-09-16" },
];

describe("assessItemAvailability", () => {
  it("flags a closed partner on the day of the item", () => {
    const r = assessItemAvailability({ blockId: "strandspektakel", dayIndex: 0 }, blocks[0], "2026-10-12", 20, periods);
    expect(r.status).toBe("partner_gesloten");
    expect(r.closedUntil).toBe("2027-03-31");
    expect(r.message).toContain("31 maart");
  });

  it("is available outside the closure", () => {
    const r = assessItemAvailability({ blockId: "strandspektakel", dayIndex: 0 }, blocks[0], "2027-04-02", 20, periods);
    expect(r.status).toBe("beschikbaar");
  });

  it("splits a too-large group into rounds", () => {
    const r = assessItemAvailability({ blockId: "watertaxi", dayIndex: 0 }, blocks[3], "2026-10-12", 20, periods);
    expect(r.status).toBe("te_groot");
    expect(r.rounds).toBe(2);
    expect(r.message).toContain("2 rondes");
  });

  it("flags a too-small group", () => {
    const r = assessItemAvailability({ blockId: "luxe-lunch", dayIndex: 0 }, blocks[4], "2026-10-12", 12, periods);
    expect(r.status).toBe("te_klein");
    expect(r.limit).toBe(15);
  });

  it("is unknown without a block, and available without a date when the capacity fits", () => {
    expect(assessItemAvailability({ blockId: "x", dayIndex: 0 }, undefined, "2026-10-12", 20, periods).status).toBe("onbekend");
    expect(assessItemAvailability({ blockId: "strandspektakel", dayIndex: 0 }, blocks[0], null, 20, periods).status).toBe("beschikbaar");
  });
});

describe("assessProgramAvailability", () => {
  it("summarises a fully available program", () => {
    const r = assessProgramAvailability([{ blockId: "wadloop", dayIndex: 0 }], ["2026-10-12"], 20, periods, blocks);
    expect(r.problems).toHaveLength(0);
    expect(r.summary).toBe("Volledig beschikbaar op uw datum");
  });

  it("names the first problem and counts the rest", () => {
    const r = assessProgramAvailability(
      [
        { blockId: "strandspektakel", dayIndex: 0 },
        { blockId: "watertaxi", dayIndex: 0 },
        { blockId: "wadloop", dayIndex: 1 },
      ],
      ["2026-10-12", "2026-10-13"],
      20,
      periods,
      blocks,
    );
    expect(r.closedCount).toBe(1);
    expect(r.capacityCount).toBe(1);
    expect(r.summary).toBe("2 onderdelen vragen aandacht: Strandspektakel (aanbieder gesloten t/m 31 maart) en 1 ander");
  });

  it("uses the date of the item's own day", () => {
    const r = assessProgramAvailability([{ blockId: "strandspektakel", dayIndex: 1 }], ["2027-03-31", "2027-04-01"], 20, periods, blocks);
    expect(r.problems).toHaveLength(0);
  });

  it("says nothing without dates and without problems", () => {
    const r = assessProgramAvailability([{ blockId: "wadloop", dayIndex: 0 }], [null], 20, periods, blocks);
    expect(r.summary).toBeNull();
  });
});

describe("suggestReplacement", () => {
  it("proposes an open block from the same category that fits the group", () => {
    const problem = assessItemAvailability({ blockId: "strandspektakel", dayIndex: 0 }, blocks[0], "2026-10-12", 20, periods);
    const s = suggestReplacement(problem, blocks, 20, periods, ["strandspektakel"]);
    // kanoën (sort_order 2) is te klein voor 20, dus wadloop
    expect(s?.id).toBe("wadloop");
  });

  it("prefers the lowest sort order when several fit", () => {
    const problem = assessItemAvailability({ blockId: "strandspektakel", dayIndex: 0 }, blocks[0], "2026-10-12", 10, periods);
    expect(suggestReplacement(problem, blocks, 10, periods, [])?.id).toBe("kanoen");
  });

  it("skips blocks already in the program and self-arranged blocks", () => {
    const problem = assessItemAvailability({ blockId: "strandspektakel", dayIndex: 0 }, blocks[0], "2026-10-12", 10, periods);
    expect(suggestReplacement(problem, blocks, 10, periods, ["kanoen", "wadloop"])).toBeNull();
  });
});

describe("formatIsoDayNL", () => {
  it("formats a day in Dutch", () => {
    expect(formatIsoDayNL("2027-03-31")).toBe("31 maart");
    expect(formatIsoDayNL("nonsense")).toBe("nonsense");
  });
});
