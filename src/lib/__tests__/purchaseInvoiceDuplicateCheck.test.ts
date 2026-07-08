import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ data: [] })) })) })) })),
    })),
  },
}));

import { normalizeInvoiceNumber } from "@/lib/purchaseInvoiceDuplicateCheck";

describe("purchaseInvoiceDuplicateCheck", () => {
  it("normalizeInvoiceNumber verwijdert spaties, streepjes, punten en underscores", () => {
    expect(normalizeInvoiceNumber("F-2026-001")).toBe("F2026001");
    expect(normalizeInvoiceNumber("f2026.001")).toBe("F2026001");
    expect(normalizeInvoiceNumber("F 2026 001")).toBe("F2026001");
    expect(normalizeInvoiceNumber("F_2026-001.2")).toBe("F20260012");
  });

  it("normalizeInvoiceNumber uppercases", () => {
    expect(normalizeInvoiceNumber("abc123")).toBe("ABC123");
  });

  it("normalizeInvoiceNumber handleert null/undefined", () => {
    expect(normalizeInvoiceNumber(null)).toBe("");
    expect(normalizeInvoiceNumber(undefined)).toBe("");
  });

  it("normalizeInvoiceNumber is idempotent", () => {
    const once = normalizeInvoiceNumber("F-2026-001");
    expect(normalizeInvoiceNumber(once)).toBe(once);
  });
});
