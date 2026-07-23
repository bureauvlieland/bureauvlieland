import { describe, it, expect } from "vitest";
import {
  checkCapacity,
  findCapacityIssues,
  getEffectivePeople,
  describeCapacityIssue,
} from "../capacityCheck";

describe("getEffectivePeople", () => {
  it("gebruikt projectaantal als override niet gezet is", () => {
    expect(getEffectivePeople({ overridePeople: null }, 15)).toBe(15);
    expect(getEffectivePeople({ overridePeople: undefined }, 8)).toBe(8);
  });
  it("gebruikt override_people als deze > 0 is", () => {
    expect(getEffectivePeople({ overridePeople: 6 }, 15)).toBe(6);
  });
  it("negeert override_people 0 of negatief", () => {
    expect(getEffectivePeople({ overridePeople: 0 }, 15)).toBe(15);
    expect(getEffectivePeople({ overridePeople: -3 }, 15)).toBe(15);
  });
  it("clamp op minstens 1 personen", () => {
    expect(getEffectivePeople({ overridePeople: null }, 0)).toBe(1);
  });
});

describe("checkCapacity", () => {
  it("markeert 'over' bij groep groter dan max_people (Watertaxi-scenario)", () => {
    const r = checkCapacity(
      { itemId: "a", itemName: "Watertaxi", minPeople: 1, maxPeople: 12 },
      15,
    );
    expect(r.status).toBe("over");
    expect(r.overBy).toBe(3);
  });
  it("markeert 'under' bij groep kleiner dan min_people", () => {
    const r = checkCapacity(
      { itemId: "a", itemName: "Groepstour", minPeople: 10, maxPeople: 30 },
      6,
    );
    expect(r.status).toBe("under");
    expect(r.underBy).toBe(4);
  });
  it("status 'ok' als groep binnen range zit", () => {
    const r = checkCapacity(
      { itemId: "a", itemName: "X", minPeople: 4, maxPeople: 20 },
      12,
    );
    expect(r.status).toBe("ok");
  });
  it("status 'unknown' als er geen grenzen ingesteld zijn", () => {
    const r = checkCapacity(
      { itemId: "a", itemName: "X", minPeople: null, maxPeople: null },
      100,
    );
    expect(r.status).toBe("unknown");
  });
  it("beschouwt max=0 als 'geen limiet' (data-hygiene guard)", () => {
    const r = checkCapacity(
      { itemId: "a", itemName: "X", minPeople: 0, maxPeople: 0 },
      50,
    );
    expect(r.status).toBe("unknown");
  });
  it("gebruikt override_people i.p.v. projectaantal", () => {
    const r = checkCapacity(
      { itemId: "a", itemName: "Workshop", maxPeople: 10, overridePeople: 8 },
      50,
    );
    expect(r.status).toBe("ok");
    expect(r.effectivePeople).toBe(8);
  });
});

describe("findCapacityIssues", () => {
  it("filtert cancelled items eruit", () => {
    const issues = findCapacityIssues(
      [
        { itemId: "1", itemName: "A", maxPeople: 5, status: "cancelled" },
        { itemId: "2", itemName: "B", maxPeople: 5 },
      ],
      10,
    );
    expect(issues.map((i) => i.itemId)).toEqual(["2"]);
  });
  it("teruggeeft alleen problemen, niet 'ok'/'unknown'", () => {
    const issues = findCapacityIssues(
      [
        { itemId: "1", itemName: "OK", maxPeople: 20 },
        { itemId: "2", itemName: "Over", maxPeople: 5 },
        { itemId: "3", itemName: "Onbekend" },
      ],
      10,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].itemId).toBe("2");
  });
});

describe("describeCapacityIssue", () => {
  it("beschrijft over-limit met naam en aantallen", () => {
    const r = checkCapacity(
      { itemId: "a", itemName: "Watertaxi", maxPeople: 12 },
      15,
    );
    expect(describeCapacityIssue(r)).toContain("Watertaxi");
    expect(describeCapacityIssue(r)).toContain("15");
    expect(describeCapacityIssue(r)).toContain("12");
  });
});
