import { describe, it, expect } from "vitest";
import {
  getEffectiveChildren,
  getChildUnitPrice,
  hasChildTier,
  getParticipantTotal,
  multiplyUnitPrice,
  getPriceComponents,
  getChildTierLabel,
  getDisplayUnitPrice,
  getDisplayLineTotal,
  getPriceBreakdownLabel,
} from "../portalPricing";

describe("kindtarief helpers", () => {
  it("geeft 0 kinderen bij ontbrekende of ongeldige waarde", () => {
    expect(getEffectiveChildren({})).toBe(0);
    expect(getEffectiveChildren({ override_children: null })).toBe(0);
    expect(getEffectiveChildren({ override_children: -3 })).toBe(0);
    expect(getEffectiveChildren({ override_children: 4 })).toBe(4);
  });

  it("kindprijs alleen relevant als er kinderen zijn", () => {
    expect(getChildUnitPrice({ override_children: 0, child_unit_price: 15 })).toBeNull();
    expect(getChildUnitPrice({ override_children: 3, child_unit_price: null })).toBeNull();
    expect(getChildUnitPrice({ override_children: 3, child_unit_price: 15 })).toBe(15);
    expect(hasChildTier({ override_children: 3, child_unit_price: 15 })).toBe(true);
  });

  it("telt volwassenen + kinderen op", () => {
    expect(getParticipantTotal({ override_people: 20, override_children: 7 }, 27)).toBe(27);
    expect(getParticipantTotal({}, 12)).toBe(12);
  });

  it("labelt de leeftijdsrange", () => {
    expect(getChildTierLabel({ child_min_age: 4, child_max_age: 12 })).toBe("Kinderen (4–12 jr)");
    expect(getChildTierLabel({ child_max_age: 12 })).toBe("Kinderen (t/m 12 jr)");
    expect(getChildTierLabel({ child_min_age: 2 })).toBe("Kinderen (vanaf 2 jr)");
    expect(getChildTierLabel({})).toBe("Kinderen");
  });
});

describe("multiplyUnitPrice", () => {
  const base = { price_type: "per_person", override_people: 20, override_children: 7, child_unit_price: 18 };

  it("rekent volwassenen én kinderen door", () => {
    expect(multiplyUnitPrice(base, 32, 27)).toBe(20 * 32 + 7 * 18);
  });

  it("vermenigvuldigt met dagen bij p.p.p.d.", () => {
    const item = { ...base, price_type: "per_person_per_day" };
    expect(multiplyUnitPrice(item, 32, 27, 3)).toBe((20 * 32 + 7 * 18) * 3);
  });

  it("negeert kinderen bij totaalprijs-items", () => {
    expect(multiplyUnitPrice({ ...base, price_type: "total" }, 500, 27)).toBe(500);
  });

  it("valt terug op programma-aantal zonder overrides", () => {
    expect(multiplyUnitPrice({ price_type: "per_person" }, 25, 12)).toBe(300);
  });
});

describe("getPriceComponents", () => {
  it("splitst in volwassenen- en kinderregel", () => {
    const item = {
      price_type: "per_person",
      admin_price_override: 32,
      admin_price_override_updated_at: "2026-01-01T00:00:00Z",
      override_people: 20,
      override_children: 7,
      child_unit_price: 18,
      child_min_age: 4,
      child_max_age: 12,
    };
    const rows = getPriceComponents(item, 27);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: "adult", count: 20, unitPrice: 32, total: 640 });
    expect(rows[1]).toMatchObject({ kind: "child", count: 7, unitPrice: 18, total: 126 });
    expect(rows[1].label).toBe("Kinderen (4–12 jr)");
  });

  it("geeft één regel zonder kinderen", () => {
    const rows = getPriceComponents({ price_type: "per_person", admin_price_override: 25 }, 10);
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe("Personen");
  });

  it("geeft geen regels voor totaalprijs-items", () => {
    expect(getPriceComponents({ price_type: "total", admin_price_override: 400 }, 10)).toEqual([]);
  });
});

describe("quoted_price met kindtarief", () => {
  const item = {
    price_type: "per_person",
    quoted_price: 766,
    override_people: 20,
    override_children: 7,
    child_unit_price: 18,
  };

  it("leidt het volwassenentarief af door de kindregels af te trekken", () => {
    // 766 - (7 × 18 = 126) = 640 / 20 = 32
    expect(getDisplayUnitPrice(item, 27)).toBe(32);
  });

  it("houdt quoted_price als groepstotaal", () => {
    expect(getDisplayLineTotal(item, 27)).toBe(766);
  });
});

describe("getPriceBreakdownLabel", () => {
  it("toont beide tarieven", () => {
    const label = getPriceBreakdownLabel(
      { price_type: "per_person", admin_price_override: 32, override_people: 20, override_children: 7, child_unit_price: 18 },
      27,
    );
    expect(label).toBe("20 × €32,00 + 7 × €18,00");
  });

  it("voegt dagen toe bij p.p.p.d.", () => {
    const label = getPriceBreakdownLabel(
      { price_type: "per_person_per_day", admin_price_override: 32, override_people: 20, override_children: 7, child_unit_price: 18 },
      27,
      3,
    );
    expect(label).toBe("20 × €32,00 + 7 × €18,00 × 3 dagen");
  });

  it("blijft het klassieke label gebruiken zonder kinderen", () => {
    expect(getPriceBreakdownLabel({ price_type: "per_person", admin_price_override: 25 }, 10)).toBe(
      "€25,00 p.p. × 10 personen",
    );
  });
});
