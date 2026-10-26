import { describe, expect, it } from "vitest";
import { PRICE_IN_PROPOSAL, publicBlockPrice, publicBlockPriceLine } from "@/lib/publicPrice";
import { buildFallbackFaq } from "@/lib/activityFallbackFaq";
import type { BuildingBlock } from "@/types/buildingBlock";

const block = {
  id: "zeehondentocht",
  name: "Zeehondentocht",
  price_adult: 25,
  price_type: "per_person",
  price_adult_note: null,
  price_display_override: null,
  is_from_price: false,
  price_extras: {},
  provider: { id: "p1", name: "De Geus" },
} as unknown as BuildingBlock;

describe("publicBlockPrice", () => {
  it("toont het bedrag alleen bij een direct boekbare bouwsteen", () => {
    expect(publicBlockPrice(block, true)).toEqual({ value: "€ 25", note: "p.p." });
    expect(publicBlockPriceLine(block, true)).toBe("€ 25 p.p.");
  });

  it("zet bij de rest de prijs in het voorstel, met de meerwaarde van het bureau", () => {
    const price = publicBlockPrice(block, false);
    expect(price.value).toBe(PRICE_IN_PROPOSAL);
    expect(price.note).toBe("Eén aanspreekpunt, één factuur");
    expect(publicBlockPriceLine(block, false)).toBe(PRICE_IN_PROPOSAL);
  });
});

describe("buildFallbackFaq", () => {
  const kostVraag = (items: ReturnType<typeof buildFallbackFaq>) => items.find((i) => i.question.startsWith("Wat kost"))!;

  it("noemt het bedrag alleen als de bouwsteen direct boekbaar is", () => {
    expect(kostVraag(buildFallbackFaq(block, true)).answer).toContain("€ 25 p.p.");
    const zonder = kostVraag(buildFallbackFaq(block)).answer;
    expect(zonder).not.toContain("€ 25");
    expect(zonder).toContain("in ons voorstel");
  });
});
