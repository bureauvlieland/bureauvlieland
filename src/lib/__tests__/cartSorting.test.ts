/**
 * Contract voor `sortCartItemsForDay`: veer/fiets-pinning.
 *
 * Business-regel (memory): veer heen + fiets bovenaan dag 0, veer terug
 * onderaan laatste dag. Deze test dwingt af dat een refactor van de
 * blockId-constanten of getPinRank() de pinning niet stilzwijgend breekt.
 */
import { describe, it, expect } from "vitest";
import { sortCartItemsForDay } from "@/lib/cartSorting";
import type { CartItemDetail } from "@/types/buildingBlock";

const item = (blockId: string, extra: Partial<CartItemDetail> = {}): CartItemDetail =>
  ({
    blockId,
    blockName: blockId,
    quantity: 1,
    preferredTime: null,
    ...extra,
  } as unknown as CartItemDetail);

describe("sortCartItemsForDay — ferry & bike pinning", () => {
  it("dag 0: ferry-heen bovenaan, fiets meteen daaronder, rest daarna", () => {
    const items = [
      item("wadloop"),
      item("boot-enkel-terug"), // op dag 0 telt deze als 'normaal', geen bottom-pin
      item("fiets-huur"),
      item("boot-enkel-heen"),
    ];
    const sorted = sortCartItemsForDay(items, 0, 2);
    expect(sorted[0].blockId).toBe("boot-enkel-heen");
    expect(sorted[1].blockId).toBe("fiets-huur");
  });

  it("laatste dag: ferry-terug wordt naar onderaan gepind", () => {
    const items = [item("boot-enkel-terug"), item("diner"), item("wadloop")];
    const sorted = sortCartItemsForDay(items, 1, 2);
    expect(sorted[sorted.length - 1].blockId).toBe("boot-enkel-terug");
  });

  it("op een tussenliggende dag (niet 0, niet laatste) gedragen ferry/fiets zich als normaal item", () => {
    const items = [
      item("boot-enkel-heen"),
      item("wadloop", { preferredTime: "09:00" }),
      item("fiets-huur"),
      item("boot-enkel-terug"),
    ];
    const sorted = sortCartItemsForDay(items, 1, 3);
    // Geen pin-plek meer, dus sort valt terug op preferredTime; wadloop met 09:00 komt vooraan.
    expect(sorted[0].blockId).toBe("wadloop");
  });

  it("binnen dezelfde rank sorteert op preferredTime (null achteraan)", () => {
    const items = [
      item("a", { preferredTime: null }),
      item("b", { preferredTime: "10:00" }),
      item("c", { preferredTime: "09:00" }),
    ];
    const sorted = sortCartItemsForDay(items, 0, 1);
    expect(sorted.map((i) => i.blockId)).toEqual(["c", "b", "a"]);
  });

  it("muteert de input array niet", () => {
    const items = [item("boot-enkel-heen"), item("wadloop")];
    const before = items.map((i) => i.blockId);
    sortCartItemsForDay(items, 0, 1);
    expect(items.map((i) => i.blockId)).toEqual(before);
  });
});
