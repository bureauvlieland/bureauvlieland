import { describe, expect, it } from "vitest";
import {
  daysOverdue,
  invoiceBelongsToTab,
  invoiceTabTotals,
  invoicedTotal,
  matchesInvoiceSearch,
  nextInvoiceAction,
  sortInvoices,
  type CommissionInvoiceView,
} from "@/lib/commissionInvoiceView";

const now = new Date("2026-10-06T10:00:00Z");

const invoice = (overrides: Partial<CommissionInvoiceView> = {}): CommissionInvoiceView => ({
  id: overrides.id ?? `inv-${Math.random()}`,
  invoice_number: "BVC-2610-0001",
  invoice_date: "2026-10-01",
  due_date: "2026-10-15",
  partner_id: "zeezicht",
  recipient_name: "Hotel Zeezicht",
  recipient_email: "info@zeezicht.nl",
  amount_excl_vat: 100,
  vat_amount: 21,
  amount_incl_vat: 121,
  vat_rate: 21,
  status: "sent",
  pdf_path: "zeezicht/BVC-2610-0001.pdf",
  notes: null,
  sent_at: "2026-10-01T10:00:00Z",
  forwarded_to_accounting_at: null,
  paid_at: null,
  finalized_at: "2026-10-01T09:00:00Z",
  credits_invoice_id: null,
  credit_reason: null,
  credited_at: null,
  partner: { id: "zeezicht", name: "Hotel Zeezicht", email: null, contact_email: null },
  lines: [
    {
      id: "l1",
      item_id: "i1",
      quote_id: null,
      purchase_invoice_id: null,
      item_type: "activity",
      block_name: "Diner",
      customer_label: "Acme BV",
      event_date: "2026-09-20",
      reference_number: "BV-2609-0007",
      invoiced_amount_excl_vat: 1000,
      commission_percentage: 10,
      commission_amount: 100,
      description: "Commissie Diner – Acme BV",
      sort_order: 0,
    },
  ],
  ...overrides,
});

describe("te laat", () => {
  it("alleen een openstaande factuur met verstreken vervaldatum is te laat", () => {
    expect(daysOverdue(invoice({ due_date: "2026-09-30" }), now)).toBe(6);
    expect(daysOverdue(invoice({ due_date: "2026-10-06" }), now)).toBeNull();
    expect(daysOverdue(invoice({ due_date: "2026-09-30", status: "paid" }), now)).toBeNull();
    expect(daysOverdue(invoice({ due_date: "2026-09-30", status: "final" }), now)).toBeNull();
    expect(daysOverdue(invoice({ due_date: null }), now)).toBeNull();
  });

  it("de tegel Te laat is een zicht: de factuur blijft ook in Verstuurd", () => {
    const late = invoice({ due_date: "2026-09-30" });
    expect(invoiceBelongsToTab(late, "sent", now)).toBe(true);
    expect(invoiceBelongsToTab(late, "overdue", now)).toBe(true);
    const totals = invoiceTabTotals([late, invoice()], now);
    expect(totals.sent.count).toBe(2);
    expect(totals.overdue.count).toBe(1);
    expect(totals.overdue.amount).toBe(121);
  });
});

describe("totaal en zoeken", () => {
  it("concepten tellen niet mee, creditnota's trekken af", () => {
    const list = [
      invoice({ status: "draft", invoice_number: null }),
      invoice({ status: "paid" }),
      invoice({ status: "credited" }),
      invoice({ status: "final", invoice_number: "BVC-2610-0002", amount_incl_vat: -121, credits_invoice_id: "x" }),
    ];
    expect(invoicedTotal(list)).toBe(121);
  });

  it("zoekt op nummer, partner, klant en referentie", () => {
    const inv = invoice();
    expect(matchesInvoiceSearch(inv, "2610-0001")).toBe(true);
    expect(matchesInvoiceSearch(inv, "zeezicht")).toBe(true);
    expect(matchesInvoiceSearch(inv, "acme")).toBe(true);
    expect(matchesInvoiceSearch(inv, "bv-2609-0007")).toBe(true);
    expect(matchesInvoiceSearch(inv, "oliva")).toBe(false);
    expect(matchesInvoiceSearch(inv, "")).toBe(true);
  });
});

describe("volgende stap en volgorde", () => {
  it("per status één volgende stap; een creditnota wordt niet betaald", () => {
    expect(nextInvoiceAction(invoice({ status: "draft" }))).toBe("finalize");
    expect(nextInvoiceAction(invoice({ status: "final" }))).toBe("send");
    expect(nextInvoiceAction(invoice({ status: "sent" }))).toBe("forward");
    expect(nextInvoiceAction(invoice({ status: "forwarded" }))).toBe("markPaid");
    expect(nextInvoiceAction(invoice({ status: "forwarded", credits_invoice_id: "orig" }))).toBeNull();
    expect(nextInvoiceAction(invoice({ status: "paid" }))).toBeNull();
    expect(nextInvoiceAction(invoice({ status: "credited" }))).toBeNull();
  });

  it("concepten bovenaan, daarna nieuwste factuurdatum eerst", () => {
    const sorted = sortInvoices([
      invoice({ id: "a", invoice_date: "2026-09-01" }),
      invoice({ id: "b", invoice_date: "2026-10-01" }),
      invoice({ id: "c", status: "draft", invoice_number: null, invoice_date: "2026-08-01" }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });
});
