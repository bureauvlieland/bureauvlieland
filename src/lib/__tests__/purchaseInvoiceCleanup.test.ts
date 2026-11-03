import { describe, it, expect } from "vitest";
import { linkedItemIds, planResetForItems } from "@/lib/purchaseInvoiceCleanup";

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

describe("onderdelen zonder klantregels terugzetten", () => {
  const program = { id: "p", day_index: 1, block_id: "blok" };
  const worksheetPost = { id: "w", day_index: -1, block_id: null, created_from_purchase_lines: true };
  const manualPost = { id: "m", day_index: -1, block_id: null, created_from_purchase_lines: false };

  it("verwijdert een lege kostenpost van het werkblad en zet een handmatige op nul", () => {
    expect(planResetForItems([program, worksheetPost, manualPost], new Set())).toEqual({
      remove: ["w"],
      zero: ["m"],
      unlock: ["p"],
    });
  });

  it("laat een kostenpost staan zolang er inkoopregels aan hangen", () => {
    expect(planResetForItems([worksheetPost, manualPost], new Set(["w", "m"]))).toEqual({
      remove: [],
      zero: [],
      unlock: ["w", "m"],
    });
  });

  it("ziet een kostenpost met bouwsteen niet als losse post", () => {
    expect(planResetForItems([{ id: "b", day_index: -1, block_id: "blok" }], new Set())).toEqual({
      remove: [],
      zero: [],
      unlock: ["b"],
    });
  });
});
