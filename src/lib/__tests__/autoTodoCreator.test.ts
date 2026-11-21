import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ maybeSingle: vi.fn(() => ({ data: null })) })),
    })),
  },
}));

import { autoTodoLabel, autoTodoTitles, autoTodoTypeConfig, todoPriorityLabel } from "@/lib/autoTodoCreator";

describe("autoTodoCreator pure helpers", () => {
  it("partner_reminder title", () => {
    expect(autoTodoTitles.partner_reminder("Zeezicht", "Wadlopen")).toBe(
      'Partner Zeezicht heeft niet gereageerd op "Wadlopen"',
    );
  });

  it("commission_pending title", () => {
    expect(autoTodoTitles.commission_pending("Badhotel", 123.45)).toBe("Commissie factureren: Badhotel — €\u00a0123,45");
  });

  it("terms_reminder title", () => {
    expect(autoTodoTitles.terms_reminder("Janssen BV")).toBe(
      "Vraag Janssen BV akkoord te geven en te ondertekenen in het klantportaal",
    );
  });

  it("invoicing_ready title", () => {
    expect(autoTodoTitles.invoicing_ready("Janssen BV", 500)).toBe("Facturatie: Janssen BV — €\u00a0500,00");
  });

  it("quote_ready_to_send title", () => {
    expect(autoTodoTitles.quote_ready_to_send("Janssen BV")).toBe(
      "Alle onderdelen akkoord: Janssen BV — controleer en vraag ondertekening",
    );
  });

  it("send_items_to_partners title", () => {
    expect(autoTodoTitles.send_items_to_partners("Janssen BV")).toBe(
      "Akkoord ontvangen: Janssen BV — stuur de onderdelen naar de partners",
    );
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

  it("autoTodoLabel: Nederlands label, onbekende sleutel valt terug op de sleutel", () => {
    expect(autoTodoLabel("commission_missing_invoice")).toBe("Factuur partner ontbreekt");
    expect(autoTodoLabel("system_cron_failure")).toBe("Systeem: taak draait niet");
    expect(autoTodoLabel("iets_onbekends")).toBe("iets_onbekends");
    expect(autoTodoLabel(null)).toBeNull();
  });

  it("todoPriorityLabel is Nederlands", () => {
    expect(todoPriorityLabel("high")).toBe("hoog");
    expect(todoPriorityLabel("normal")).toBe("normaal");
    expect(todoPriorityLabel("low")).toBe("laag");
    expect(todoPriorityLabel(undefined)).toBe("normaal");
  });

  it("samengevoegde sleutels staan niet meer in de labelkaart", () => {
    const keys = Object.keys(autoTodoTypeConfig);
    for (const legacy of ["customer_status_email_due", "post_execution_feedback", "post_execution_invoice_check", "new_request_received"]) {
      expect(keys).not.toContain(legacy);
    }
  });
});
