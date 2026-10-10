import { describe, expect, it } from "vitest";
import {
  partnerDaysOverdue,
  partnerInvoiceStatus,
  sortPartnerInvoices,
  summarizePartnerCommissionInvoices,
  type PartnerCommissionInvoice,
} from "@/lib/partnerCommissionInvoices";

const now = new Date("2026-10-10T10:00:00Z");

const invoice = (overrides: Partial<PartnerCommissionInvoice> = {}): PartnerCommissionInvoice => ({
  id: overrides.id ?? `inv-${Math.random()}`,
  invoice_number: "BVC-2610-0001",
  invoice_date: "2026-10-01",
  due_date: "2026-10-15",
  status: "sent",
  amount_excl_vat: 100,
  vat_amount: 21,
  amount_incl_vat: 121,
  vat_rate: 21,
  sent_at: "2026-10-01T10:00:00Z",
  paid_at: null,
  credited_at: null,
  credits_invoice_id: null,
  credit_reason: null,
  notes: null,
  pdfUrl: null,
  lines: [],
  ...overrides,
});

describe("status in partnertaal", () => {
  it("verstuurd en doorgestuurd heten allebei Open", () => {
    expect(partnerInvoiceStatus(invoice({ status: "sent" }), now)).toEqual({ label: "Open", tone: "info" });
    expect(partnerInvoiceStatus(invoice({ status: "forwarded" }), now)).toEqual({ label: "Open", tone: "info" });
  });

  it("over de vervaldatum wordt Te laat met het aantal dagen", () => {
    expect(partnerDaysOverdue(invoice({ due_date: "2026-10-09" }), now)).toBe(1);
    expect(partnerInvoiceStatus(invoice({ due_date: "2026-10-09" }), now)).toEqual({ label: "Te laat (1 dag)", tone: "warning" });
    expect(partnerInvoiceStatus(invoice({ due_date: "2026-10-01" }), now).label).toBe("Te laat (9 dagen)");
    expect(partnerDaysOverdue(invoice({ due_date: "2026-10-10" }), now)).toBeNull();
  });

  it("betaald, gecrediteerd en creditnota; een creditnota is nooit te laat", () => {
    expect(partnerInvoiceStatus(invoice({ status: "paid" }), now)).toEqual({ label: "Betaald", tone: "success" });
    expect(partnerInvoiceStatus(invoice({ status: "credited" }), now)).toEqual({ label: "Gecrediteerd", tone: "neutral" });
    expect(partnerInvoiceStatus(invoice({ due_date: "2026-09-01", credits_invoice_id: "orig" }), now)).toEqual({
      label: "Creditnota",
      tone: "neutral",
    });
  });
});

describe("totalen en volgorde", () => {
  it("telt gefactureerd ex btw, open en betaald incl. btw; creditnota's trekken af en staan niet open", () => {
    const totals = summarizePartnerCommissionInvoices([
      invoice({ status: "sent" }),
      invoice({ status: "forwarded", amount_excl_vat: 50, amount_incl_vat: 60.5 }),
      invoice({ status: "paid", amount_excl_vat: 200, amount_incl_vat: 242 }),
      invoice({ status: "credited", amount_excl_vat: 30, amount_incl_vat: 36.3 }),
      invoice({ status: "sent", amount_excl_vat: -30, amount_incl_vat: -36.3, credits_invoice_id: "x" }),
    ]);
    expect(totals.count).toBe(5);
    expect(totals.invoiced).toBeCloseTo(100 + 50 + 200 + 30 - 30);
    expect(totals.open).toBeCloseTo(121 + 60.5);
    expect(totals.paid).toBeCloseTo(242);
  });

  it("sorteert op factuurdatum, nieuwste eerst", () => {
    const sorted = sortPartnerInvoices([
      invoice({ id: "a", invoice_date: "2026-09-01" }),
      invoice({ id: "b", invoice_date: "2026-10-01", invoice_number: "BVC-2610-0002" }),
      invoice({ id: "c", invoice_date: "2026-10-01", invoice_number: "BVC-2610-0001" }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["b", "c", "a"]);
  });
});
