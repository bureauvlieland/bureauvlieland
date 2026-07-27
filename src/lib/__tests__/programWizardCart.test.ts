import { describe, it, expect } from "vitest";
import {
  planTransportCartOps,
  FERRY_HEEN_ID,
  FERRY_TERUG_ID,
  FIETS_STANDAARD_ID,
  FIETS_EBIKE_ID,
} from "../programWizardCart";

describe("planTransportCartOps", () => {
  it("adds ferry heen + terug on empty cart when ferry included", () => {
    const ops = planTransportCartOps([], { ferryIncluded: true, bikeChoice: "geen" }, 3);
    expect(ops).toEqual([
      { action: "add", blockId: FERRY_HEEN_ID, dayIndex: 0 },
      { action: "add", blockId: FERRY_TERUG_ID, dayIndex: 2 },
    ]);
  });

  it("puts terug on day 0 for a 1-day program", () => {
    const ops = planTransportCartOps([], { ferryIncluded: true, bikeChoice: "geen" }, 1);
    const terug = ops.find((o) => o.blockId === FERRY_TERUG_ID);
    expect(terug?.dayIndex).toBe(0);
  });

  it("removes existing ferry when user opts out", () => {
    const cart = [{ blockId: FERRY_HEEN_ID }, { blockId: FERRY_TERUG_ID }];
    const ops = planTransportCartOps(cart, { ferryIncluded: false, bikeChoice: "geen" }, 2);
    expect(ops).toEqual([
      { action: "remove", blockId: FERRY_HEEN_ID, dayIndex: 0 },
      { action: "remove", blockId: FERRY_TERUG_ID, dayIndex: 1 },
    ]);
  });

  it("swaps standaard fiets for ebike when user changes type", () => {
    const cart = [{ blockId: FIETS_STANDAARD_ID }];
    const ops = planTransportCartOps(cart, { ferryIncluded: false, bikeChoice: "ebike" }, 2);
    expect(ops).toContainEqual({ action: "remove", blockId: FIETS_STANDAARD_ID, dayIndex: 0 });
    expect(ops).toContainEqual({ action: "add", blockId: FIETS_EBIKE_ID, dayIndex: 0 });
  });

  it("keeps both bike ids out of cart when choice is geen", () => {
    const cart = [{ blockId: FIETS_STANDAARD_ID }, { blockId: FIETS_EBIKE_ID }];
    const ops = planTransportCartOps(cart, { ferryIncluded: true, bikeChoice: "geen" }, 2);
    expect(ops).toContainEqual({ action: "remove", blockId: FIETS_STANDAARD_ID, dayIndex: 0 });
    expect(ops).toContainEqual({ action: "remove", blockId: FIETS_EBIKE_ID, dayIndex: 0 });
  });

  it("no-op when cart already reflects preferences", () => {
    const cart = [
      { blockId: FERRY_HEEN_ID },
      { blockId: FERRY_TERUG_ID },
      { blockId: FIETS_STANDAARD_ID },
    ];
    const ops = planTransportCartOps(cart, { ferryIncluded: true, bikeChoice: "standaard" }, 2);
    expect(ops).toEqual([]);
  });
});
