import { describe, it, expect } from "vitest";
import {
  buildInvoicePresenceIndex,
  hasPartnerInvoiceSignal,
  invoicePresenceKey,
} from "../../../supabase/functions/_shared/partner-invoice-presence";

const item = (over: Partial<Parameters<typeof hasPartnerInvoiceSignal>[0]> = {}) => ({
  id: "item-1",
  provider_id: "zeehonden",
  invoiced_number: null,
  partner_dismissed_at: null,
  ...over,
});

describe("invoicePresenceKey", () => {
  it("normaliseert partner en factuurnummer", () => {
    expect(invoicePresenceKey("Zeehonden", " 2026 058 ")).toBe("zeehonden::2026058");
    expect(invoicePresenceKey(null, null)).toBe("::");
  });
});

describe("hasPartnerInvoiceSignal", () => {
  it("herkent directe koppeling via item_id", () => {
    const index = buildInvoicePresenceIndex({ invoices: [{ item_id: "item-1", partner_id: "zeehonden" }] });
    expect(hasPartnerInvoiceSignal(item(), index)).toBe(true);
  });

  it("herkent toewijzing via een verzamelfactuur-allocatie", () => {
    const index = buildInvoicePresenceIndex({ invoices: [], allocations: [{ item_id: "item-1" }] });
    expect(hasPartnerInvoiceSignal(item(), index)).toBe(true);
  });

  it("herkent factuurnummer op het onderdeel bij factuur zonder item_id", () => {
    const index = buildInvoicePresenceIndex({
      invoices: [{ item_id: null, partner_id: "zeehonden", invoice_number: "2026058" }],
    });
    expect(hasPartnerInvoiceSignal(item({ invoiced_number: "2026058" }), index)).toBe(true);
  });

  it("matcht ook bij afwijkende notatie (spaties/case)", () => {
    const index = buildInvoicePresenceIndex({
      invoices: [{ item_id: null, partner_id: "Zeehonden", invoice_number: "2026 058" }],
    });
    expect(hasPartnerInvoiceSignal(item({ invoiced_number: "2026058" }), index)).toBe(true);
  });

  it("beschouwt een geregistreerd factuurnummer zonder factuurrij als binnen", () => {
    const index = buildInvoicePresenceIndex({ invoices: [] });
    expect(hasPartnerInvoiceSignal(item({ invoiced_number: "2026058" }), index)).toBe(true);
  });

  it("slaat onderdelen over die de partner met 'geen factuur' heeft gesloten", () => {
    const index = buildInvoicePresenceIndex({ invoices: [] });
    expect(hasPartnerInvoiceSignal(item({ partner_dismissed_at: "2026-08-01T10:00:00Z" }), index)).toBe(true);
  });

  it("een factuur van een andere partner met hetzelfde nummer telt niet", () => {
    const index = buildInvoicePresenceIndex({
      invoices: [{ item_id: "other-item", partner_id: "andere-partner", invoice_number: "2026058" }],
    });
    expect(hasPartnerInvoiceSignal(item(), index)).toBe(false);
  });

  it("geeft false als er echt geen factuursignaal is", () => {
    const index = buildInvoicePresenceIndex({ invoices: [{ item_id: "other-item", partner_id: "zeehonden" }] });
    expect(hasPartnerInvoiceSignal(item(), index)).toBe(false);
  });
});
