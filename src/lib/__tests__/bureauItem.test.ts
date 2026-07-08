import { describe, it, expect } from "vitest";
import { isBureauItem, excludeBureauItems } from "@/lib/bureauItem";

describe("bureauItem", () => {
  it("provider_id 'bureau' is bureau-item", () => {
    expect(isBureauItem({ provider_id: "bureau" })).toBe(true);
  });

  it("provider_id 'bureau-vlieland' is bureau-item", () => {
    expect(isBureauItem({ provider_id: "bureau-vlieland" })).toBe(true);
  });

  it("managed service vervoer is bureau-item", () => {
    expect(
      isBureauItem({
        provider_id: "rederij",
        block_type: "bureau",
        block_category: "vervoer",
      }),
    ).toBe(true);
  });

  it("managed service niet-vervoer is géén bureau-item", () => {
    expect(
      isBureauItem({
        provider_id: "rederij",
        block_type: "activity",
        block_category: "catering",
      }),
    ).toBe(false);
  });

  it("partner item is géén bureau-item", () => {
    expect(isBureauItem({ provider_id: "partner-uuid" })).toBe(false);
  });

  it("null item is géén bureau-item", () => {
    expect(isBureauItem(null)).toBe(false);
  });

  it("excludeBureauItems filtert bureau items", () => {
    const items = [
      { provider_id: "bureau" },
      { provider_id: "partner-uuid" },
      { provider_id: "rederij", block_type: "bureau", block_category: "vervoer" },
    ];
    expect(excludeBureauItems(items).length).toBe(1);
    expect(excludeBureauItems(items)[0].provider_id).toBe("partner-uuid");
  });
});
