import { describe, it, expect } from "vitest";
import { resolveCustomerItemDescription } from "@/lib/customerItemDescription";

describe("resolveCustomerItemDescription", () => {
  it("gebruikt block_description als die aanwezig is", () => {
    expect(
      resolveCustomerItemDescription({
        block_description: "Volledige bouwsteenomschrijving",
        is_custom_quote: true,
        custom_briefing: "Briefing tekst",
      }),
    ).toBe("Volledige bouwsteenomschrijving");
  });

  it("valt terug op custom_briefing bij maatwerk zonder bouwsteen", () => {
    expect(
      resolveCustomerItemDescription({
        block_description: null,
        is_custom_quote: true,
        custom_briefing: "Op maat: bruiloftsdiner voor 40 gasten",
      }),
    ).toBe("Op maat: bruiloftsdiner voor 40 gasten");
  });

  it("gebruikt briefing NIET wanneer item geen maatwerk is", () => {
    expect(
      resolveCustomerItemDescription({
        block_description: null,
        is_custom_quote: false,
        custom_briefing: "Interne notitie",
      }),
    ).toBeNull();
  });

  it("negeert lege/whitespace-only waarden", () => {
    expect(
      resolveCustomerItemDescription({
        block_description: "   ",
        is_custom_quote: true,
        custom_briefing: "Briefing",
      }),
    ).toBe("Briefing");
    expect(
      resolveCustomerItemDescription({
        block_description: null,
        is_custom_quote: true,
        custom_briefing: "  ",
      }),
    ).toBeNull();
  });
});
