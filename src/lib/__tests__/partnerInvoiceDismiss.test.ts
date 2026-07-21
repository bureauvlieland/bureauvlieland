import { describe, it, expect } from "vitest";
import { canPartnerDismissInvoiceItem, validateDismissReason } from "@/lib/partnerInvoiceDismiss";

describe("canPartnerDismissInvoiceItem", () => {
  const base = { status: "executed", invoiced_number: null, partner_dismissed_at: null };

  it("laat executed zonder factuur toe", () => {
    expect(canPartnerDismissInvoiceItem(base)).toBe(true);
  });

  it("laat accepted en confirmed ook toe", () => {
    expect(canPartnerDismissInvoiceItem({ ...base, status: "accepted" })).toBe(true);
    expect(canPartnerDismissInvoiceItem({ ...base, status: "confirmed" })).toBe(true);
  });

  it("weigert reeds gefactureerd", () => {
    expect(canPartnerDismissInvoiceItem({ ...base, invoiced_number: "2026-001" })).toBe(false);
  });

  it("weigert reeds gesloten", () => {
    expect(canPartnerDismissInvoiceItem({ ...base, partner_dismissed_at: new Date().toISOString() })).toBe(false);
  });

  it("weigert pending / cancelled / unavailable", () => {
    for (const status of ["pending", "cancelled", "unavailable", "counter_proposed"]) {
      expect(canPartnerDismissInvoiceItem({ ...base, status })).toBe(false);
    }
  });
});

describe("validateDismissReason", () => {
  it("accepteert normale reden", () => {
    expect(validateDismissReason("Was gratis proefsessie")).toEqual({ ok: true });
  });
  it("weigert te kort", () => {
    const r = validateDismissReason("ok");
    expect(r.ok).toBe(false);
  });
  it("weigert alleen whitespace", () => {
    const r = validateDismissReason("     ");
    expect(r.ok).toBe(false);
  });
  it("weigert > 500 tekens", () => {
    const r = validateDismissReason("a".repeat(501));
    expect(r.ok).toBe(false);
  });
});
