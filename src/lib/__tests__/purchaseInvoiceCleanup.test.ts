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
  const post = { id: "m", day_index: -1, block_id: null };

  it("zet een lege kostenpost op nul en laat een gewoon onderdeel met rust", () => {
    expect(planResetForItems([program, post], new Set())).toEqual({ zero: ["m"], unlock: ["p"] });
  });

  it("laat een kostenpost staan zolang er inkoopregels aan hangen", () => {
    expect(planResetForItems([post], new Set(["m"]))).toEqual({ zero: [], unlock: ["m"] });
  });
});
