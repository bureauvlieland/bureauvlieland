import { describe, it, expect } from "vitest";
import {
  amountMatchFor,
  matchesSearch,
  sortLinkTargets,
  type LinkTarget,
} from "@/lib/purchaseInvoiceLinkTargets";

const target = (over: Partial<LinkTarget> = {}): LinkTarget => ({
  id: "a",
  label: "Zeehondentocht",
  projectReference: "BV-2606-0011",
  projectLabel: "RMD Trainingen",
  amountIncl: 100,
  ...over,
});

describe("amountMatchFor", () => {
  it("herkent een exacte match binnen een cent", () => {
    expect(amountMatchFor(target({ amountIncl: 40 }), 40)).toBe("exact");
    expect(amountMatchFor(target({ amountIncl: 40 }), 40.01)).toBe("exact");
  });

  it("herkent een bijna-match tot 5%", () => {
    expect(amountMatchFor(target({ amountIncl: 100 }), 104)).toBe("close");
    expect(amountMatchFor(target({ amountIncl: 100 }), 120)).toBeNull();
  });

  it("geeft null zonder verwacht bedrag", () => {
    expect(amountMatchFor(target({ amountIncl: null }), 40)).toBeNull();
    expect(amountMatchFor(target({ amountIncl: 40 }), null)).toBeNull();
  });
});

describe("matchesSearch", () => {
  it("zoekt op naam, referentie en klant", () => {
    expect(matchesSearch(target(), "zeehond")).toBe(true);
    expect(matchesSearch(target(), "2606-0011")).toBe(true);
    expect(matchesSearch(target(), "rmd")).toBe(true);
    expect(matchesSearch(target(), "boot")).toBe(false);
  });

  it("laat alles door bij een lege term", () => {
    expect(matchesSearch(target(), "  ")).toBe(true);
  });
});

describe("sortLinkTargets", () => {
  it("zet exacte bedragen bovenaan en behoudt daarna de volgorde", () => {
    const list = [
      target({ id: "1", amountIncl: 500 }),
      target({ id: "2", amountIncl: 41 }),
      target({ id: "3", amountIncl: 40 }),
      target({ id: "4", amountIncl: null }),
    ];
    expect(sortLinkTargets(list, 40).map((t) => t.id)).toEqual(["3", "2", "1", "4"]);
  });

  it("filtert op zoekterm", () => {
    const list = [
      target({ id: "1", label: "Taxiritten" }),
      target({ id: "2", label: "Diner" }),
    ];
    expect(sortLinkTargets(list, 40, "taxi").map((t) => t.id)).toEqual(["1"]);
  });
});
