import { describe, it, expect } from "vitest";
import { linkedItemIds } from "@/lib/purchaseInvoiceCleanup";

describe("onderdelen waar een inkoopfactuur aan hangt", () => {
  it("neemt de kop en de verdeling samen, zonder dubbelen", () => {
    expect(
      linkedItemIds({
        item_id: "a",
        allocations: [{ item_id: "a" }, { item_id: "b" }, { item_id: "b" }],
      }),
    ).toEqual(["a", "b"]);
  });

  it("is leeg voor een factuur die alleen aan het project hangt", () => {
    expect(linkedItemIds({ item_id: null, allocations: [] })).toEqual([]);
    expect(linkedItemIds({})).toEqual([]);
  });
});
