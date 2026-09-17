import { describe, it, expect } from "vitest";
import { buildCartItemsFromTemplate, templateHasOwnCrossing } from "../programTemplateCart";
import type { ProgramTemplate, ProgramTemplateItem } from "@/types/programTemplate";

const item = (block_id: string, day_index = 0, sort_order = 0, preferred_time: string | null = null): ProgramTemplateItem => ({
  id: `${block_id}-${day_index}`,
  template_id: "t",
  block_id,
  day_index,
  preferred_time,
  notes: null,
  sort_order,
});

const template = (duration_days: number, items: ProgramTemplateItem[]): ProgramTemplate => ({
  id: "t",
  name: "Test",
  description: null,
  short_description: null,
  duration_days,
  target_group: null,
  image_url: null,
  indicative_price_pp: null,
  is_published: true,
  sort_order: 0,
  items,
});

const allAvailable = () => true;

describe("buildCartItemsFromTemplate", () => {
  it("adds Doeksen heen/terug and bikes by default, terug on the last day", () => {
    const cart = buildCartItemsFromTemplate(template(3, [item("zeehondentocht-exclusief", 1)]), { isBlockAvailable: allAvailable });
    expect(cart.map((c) => `${c.blockId}@${c.dayIndex}`)).toEqual([
      "boot-enkel-heen@0",
      "boot-enkel-terug@2",
      "fiets-huur@0",
      "zeehondentocht-exclusief@1",
    ]);
  });

  it("skips the default ferry when the template has its own crossing", () => {
    const cart = buildCartItemsFromTemplate(
      template(1, [item("watertaxi-harlingen-vlieland"), item("luxe-lunch", 0, 1)]),
      { isBlockAvailable: allAvailable },
    );
    expect(cart.map((c) => c.blockId)).toEqual(["fiets-huur", "watertaxi-harlingen-vlieland", "luxe-lunch"]);
  });

  it("skips unpublished blocks so the customer never carries an invisible item", () => {
    const cart = buildCartItemsFromTemplate(
      template(1, [item("vrije-tijd"), item("lunch-strand", 0, 1)]),
      { isBlockAvailable: (id) => id !== "vrije-tijd" },
    );
    expect(cart.map((c) => c.blockId)).not.toContain("vrije-tijd");
    expect(cart.map((c) => c.blockId)).toContain("lunch-strand");
  });

  it("leaves transport out entirely when the wizard's transport step handles it", () => {
    const cart = buildCartItemsFromTemplate(
      template(2, [item("boot-enkel-heen"), item("fiets-huur"), item("lunch-strand", 1)]),
      { isBlockAvailable: allAvailable, includeDefaultTransport: false },
    );
    expect(cart.map((c) => `${c.blockId}@${c.dayIndex}`)).toEqual(["lunch-strand@1"]);
  });

  it("keeps template ferry rows out and does not duplicate items", () => {
    const cart = buildCartItemsFromTemplate(
      template(1, [item("boot-enkel-terug"), item("lunch-strand"), item("lunch-strand", 0, 5)]),
      { isBlockAvailable: allAvailable },
    );
    expect(cart.filter((c) => c.blockId === "lunch-strand")).toHaveLength(1);
    expect(cart.filter((c) => c.blockId === "boot-enkel-terug")).toHaveLength(1);
  });

  it("orders items by day and sort order and keeps preferred times", () => {
    const cart = buildCartItemsFromTemplate(
      template(2, [item("b", 1, 0, "10:00"), item("a", 0, 1, "12:30"), item("c", 0, 0)]),
      { isBlockAvailable: allAvailable, includeDefaultTransport: false },
    );
    expect(cart.map((c) => c.blockId)).toEqual(["c", "a", "b"]);
    expect(cart.find((c) => c.blockId === "a")?.preferredTime).toBe("12:30");
  });

  it("clamps a day index beyond the template duration to the last day", () => {
    const cart = buildCartItemsFromTemplate(template(1, [item("x", 3)]), { isBlockAvailable: allAvailable, includeDefaultTransport: false });
    expect(cart[0].dayIndex).toBe(0);
  });

  it("detects an own crossing", () => {
    expect(templateHasOwnCrossing(template(1, [item("regina-andrea-prive-heen")]))).toBe(true);
    expect(templateHasOwnCrossing(template(1, [item("lunch-strand")]))).toBe(false);
  });
});
