import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ maybeSingle: vi.fn(() => ({ data: null })) })),
    })),
  },
}));

import { autoTodoTitles, autoTodoTypeConfig } from "@/lib/autoTodoCreator";

describe("autoTodoCreator pure helpers", () => {
  it("partner_reminder title", () => {
    expect(autoTodoTitles.partner_reminder("Zeezicht", "Wadlopen")).toBe(
      'Partner Zeezicht heeft niet gereageerd op "Wadlopen"',
    );
  });

  it("commission_pending title", () => {
    expect(autoTodoTitles.commission_pending("Badhotel", 123.45)).toBe("Commissie factureren: Badhotel - €123.45");
  });

  it("terms_reminder title", () => {
    expect(autoTodoTitles.terms_reminder("Janssen BV")).toBe("Klant Janssen BV moet voorwaarden accepteren");
  });

  it("invoicing_ready title", () => {
    expect(autoTodoTitles.invoicing_ready("Janssen BV", 500)).toBe("Facturatie: Janssen BV - €500.00");
  });

  it("quote_ready_to_send title", () => {
    expect(autoTodoTitles.quote_ready_to_send("Janssen BV")).toBe("Offerte klaar: Janssen BV — verstuur naar klant");
  });

  it("send_items_to_partners title", () => {
    expect(autoTodoTitles.send_items_to_partners("Janssen BV")).toBe("Akkoord ontvangen: Janssen BV — stuur items naar partners");
  });

  it("autoTodoTypeConfig heeft label, color en bgColor voor elk type", () => {
    const keys = Object.keys(autoTodoTypeConfig) as Array<keyof typeof autoTodoTypeConfig>;
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const cfg = autoTodoTypeConfig[key];
      expect(cfg.label).toBeTruthy();
      expect(cfg.color.startsWith("text-")).toBe(true);
      expect(cfg.bgColor.startsWith("bg-")).toBe(true);
    }
  });
});
