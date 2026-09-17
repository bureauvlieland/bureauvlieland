import { describe, it, expect } from "vitest";
import {
  planTransportCartOps,
  inferCrossingFromCart,
  availabilityWindow,
  watertaxiBoatsNeeded,
  normalizeWizardTime,
  FERRY_HEEN_ID,
  FERRY_TERUG_ID,
  WATERTAXI_HEEN_ID,
  WATERTAXI_TERUG_ID,
  REGINA_HEEN_ID,
  REGINA_TERUG_ID,
  FIETS_STANDAARD_ID,
  FIETS_EBIKE_ID,
  DEFAULT_TRANSPORT_PREFERENCES,
  DEFAULT_WIZARD_SITUATION,
  type TransportPreferences,
} from "../programWizardCart";

const prefs = (over: Partial<TransportPreferences> = {}): TransportPreferences => ({
  ...DEFAULT_TRANSPORT_PREFERENCES,
  ...over,
});

describe("planTransportCartOps", () => {
  it("adds ferry heen + terug on empty cart for the default choice", () => {
    const ops = planTransportCartOps([], "vanaf_wal", prefs({ bikeChoice: "geen" }), 3, 20);
    expect(ops).toEqual([
      { action: "add", blockId: FERRY_HEEN_ID, dayIndex: 0 },
      { action: "add", blockId: FERRY_TERUG_ID, dayIndex: 2 },
    ]);
  });

  it("puts terug on day 0 for a 1-day program", () => {
    const ops = planTransportCartOps([], "vanaf_wal", prefs({ bikeChoice: "geen" }), 1, 20);
    const terug = ops.find((o) => o.blockId === FERRY_TERUG_ID);
    expect(terug?.dayIndex).toBe(0);
  });

  it("removes existing ferry when the group arranges the crossing itself", () => {
    const cart = [{ blockId: FERRY_HEEN_ID }, { blockId: FERRY_TERUG_ID }];
    const ops = planTransportCartOps(cart, "vanaf_wal", prefs({ crossing: "eigen", bikeChoice: "geen" }), 2, 20);
    expect(ops).toEqual([
      { action: "remove", blockId: FERRY_HEEN_ID, dayIndex: 0 },
      { action: "remove", blockId: FERRY_TERUG_ID, dayIndex: 1 },
    ]);
  });

  it("removes every crossing when the group is already on Vlieland, whatever the crossing pref says", () => {
    const cart = [{ blockId: FERRY_HEEN_ID }, { blockId: WATERTAXI_TERUG_ID }, { blockId: REGINA_HEEN_ID }];
    const ops = planTransportCartOps(cart, "op_vlieland", prefs({ crossing: "doeksen", bikeChoice: "geen" }), 2, 20);
    expect(ops.filter((o) => o.action === "add")).toEqual([]);
    expect(ops.map((o) => o.blockId).sort()).toEqual([FERRY_HEEN_ID, REGINA_HEEN_ID, WATERTAXI_TERUG_ID].sort());
  });

  it("swaps Doeksen for the watertaxi and notes the number of boats above capacity", () => {
    const cart = [{ blockId: FERRY_HEEN_ID }, { blockId: FERRY_TERUG_ID }];
    const ops = planTransportCartOps(cart, "vanaf_wal", prefs({ crossing: "watertaxi", bikeChoice: "geen" }), 1, 20);
    expect(ops).toContainEqual({ action: "remove", blockId: FERRY_HEEN_ID, dayIndex: 0 });
    expect(ops).toContainEqual({ action: "remove", blockId: FERRY_TERUG_ID, dayIndex: 0 });
    expect(ops).toContainEqual({ action: "add", blockId: WATERTAXI_HEEN_ID, dayIndex: 0, notes: "2 watertaxi's voor 20 personen" });
    expect(ops).toContainEqual({ action: "add", blockId: WATERTAXI_TERUG_ID, dayIndex: 0, notes: "2 watertaxi's voor 20 personen" });
  });

  it("adds no boat note when one watertaxi suffices", () => {
    const ops = planTransportCartOps([], "vanaf_wal", prefs({ crossing: "watertaxi", bikeChoice: "geen" }), 1, 10);
    expect(ops).toEqual([
      { action: "add", blockId: WATERTAXI_HEEN_ID, dayIndex: 0 },
      { action: "add", blockId: WATERTAXI_TERUG_ID, dayIndex: 0 },
    ]);
  });

  it("uses the capacity from the building block when given", () => {
    const ops = planTransportCartOps([], "vanaf_wal", prefs({ crossing: "watertaxi", bikeChoice: "geen" }), 1, 20, { watertaxiCapacity: 24 });
    expect(ops.every((o) => !("notes" in o))).toBe(true);
  });

  it("adds the private boat on the first and last day", () => {
    const ops = planTransportCartOps([], "vanaf_wal", prefs({ crossing: "regina", bikeChoice: "geen" }), 2, 40);
    expect(ops).toEqual([
      { action: "add", blockId: REGINA_HEEN_ID, dayIndex: 0 },
      { action: "add", blockId: REGINA_TERUG_ID, dayIndex: 1 },
    ]);
  });

  it("swaps standaard fiets for ebike when user changes type", () => {
    const cart = [{ blockId: FIETS_STANDAARD_ID }];
    const ops = planTransportCartOps(cart, "vanaf_wal", prefs({ crossing: "eigen", bikeChoice: "ebike" }), 2, 20);
    expect(ops).toContainEqual({ action: "remove", blockId: FIETS_STANDAARD_ID, dayIndex: 0 });
    expect(ops).toContainEqual({ action: "add", blockId: FIETS_EBIKE_ID, dayIndex: 0 });
  });

  it("keeps both bike ids out of cart when the group already has bikes", () => {
    const cart = [{ blockId: FIETS_STANDAARD_ID }, { blockId: FIETS_EBIKE_ID }];
    const ops = planTransportCartOps(cart, "op_vlieland", prefs({ bikeChoice: "eigen" }), 2, 20);
    expect(ops).toContainEqual({ action: "remove", blockId: FIETS_STANDAARD_ID, dayIndex: 0 });
    expect(ops).toContainEqual({ action: "remove", blockId: FIETS_EBIKE_ID, dayIndex: 0 });
  });

  it("keeps both bike ids out of cart when choice is geen", () => {
    const cart = [{ blockId: FIETS_STANDAARD_ID }, { blockId: FIETS_EBIKE_ID }];
    const ops = planTransportCartOps(cart, "vanaf_wal", prefs({ bikeChoice: "geen" }), 2, 20);
    expect(ops.filter((o) => o.action === "remove").map((o) => o.blockId).sort()).toEqual([FIETS_EBIKE_ID, FIETS_STANDAARD_ID].sort());
  });

  it("no-op when cart already reflects preferences", () => {
    const cart = [
      { blockId: FERRY_HEEN_ID },
      { blockId: FERRY_TERUG_ID },
      { blockId: FIETS_STANDAARD_ID },
    ];
    const ops = planTransportCartOps(cart, "vanaf_wal", prefs(), 2, 20);
    expect(ops).toEqual([]);
  });
});

describe("inferCrossingFromCart", () => {
  it("recognises a template's own crossing", () => {
    expect(inferCrossingFromCart([{ blockId: WATERTAXI_HEEN_ID }], "doeksen")).toBe("watertaxi");
    expect(inferCrossingFromCart([{ blockId: REGINA_TERUG_ID }], "doeksen")).toBe("regina");
  });
  it("falls back when there is no crossing in the cart", () => {
    expect(inferCrossingFromCart([{ blockId: "lunch-strand" }], "eigen")).toBe("eigen");
  });
});

describe("availabilityWindow", () => {
  it("uses the time window when the group is on the island", () => {
    expect(availabilityWindow({ ...DEFAULT_WIZARD_SITUATION, situation: "op_vlieland", startTime: "09:30", endTime: "16:00" }, prefs())).toEqual({ from: "09:30", to: "16:00" });
  });
  it("uses arrival and departure for an own crossing", () => {
    expect(availabilityWindow(DEFAULT_WIZARD_SITUATION, prefs({ crossing: "eigen", arrivalTime: "11:00", departureTime: "18:00" }))).toEqual({ from: "11:00", to: "18:00" });
  });
  it("is unknown for a Doeksen crossing (the departure picker decides)", () => {
    expect(availabilityWindow(DEFAULT_WIZARD_SITUATION, prefs())).toEqual({ from: null, to: null });
  });
});

describe("helpers", () => {
  it("counts boats", () => {
    expect(watertaxiBoatsNeeded(12)).toBe(1);
    expect(watertaxiBoatsNeeded(13)).toBe(2);
    expect(watertaxiBoatsNeeded(25, 12)).toBe(3);
    expect(watertaxiBoatsNeeded(0)).toBe(1);
  });
  it("normalises times", () => {
    expect(normalizeWizardTime("09:15")).toBe("09:15");
    expect(normalizeWizardTime("9:15")).toBeNull();
    expect(normalizeWizardTime("")).toBeNull();
    expect(normalizeWizardTime(undefined)).toBeNull();
  });
});
