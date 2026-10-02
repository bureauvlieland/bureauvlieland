import { describe, expect, it } from "vitest";
import {
  countUnforwardedInvoices,
  daysUntilEventEnd,
  formatRelativeDays,
  matchesSearch,
  sortRequests,
  type InvoicingViewRequest,
} from "../adminInvoicingView";

const make = (over: Partial<InvoicingViewRequest & { outstanding: number }> = {}) => ({
  reference_number: "BV-2026-001",
  customer_name: "Anna de Vries",
  customer_company: "Noorderlicht BV",
  customer_email: "anna@noorderlicht.nl",
  selected_dates: ["2026-09-10", "2026-09-11"],
  invoices: [],
  outstanding: 100,
  ...over,
});

describe("daysUntilEventEnd", () => {
  const now = new Date(2026, 8, 14, 15, 0);
  it("telt vanaf de laatste dag", () => {
    expect(daysUntilEventEnd(["2026-09-10", "2026-09-11"], now)).toBe(-3);
    expect(daysUntilEventEnd(["2026-09-20"], now)).toBe(6);
    expect(daysUntilEventEnd(["2026-09-14"], now)).toBe(0);
  });
  it("geeft null zonder datums", () => {
    expect(daysUntilEventEnd([], now)).toBeNull();
  });
});

describe("formatRelativeDays", () => {
  it("formuleert in het Nederlands", () => {
    expect(formatRelativeDays(0)).toBe("vandaag");
    expect(formatRelativeDays(1)).toBe("morgen");
    expect(formatRelativeDays(-1)).toBe("gisteren");
    expect(formatRelativeDays(5)).toBe("over 5 dagen");
    expect(formatRelativeDays(-3)).toBe("3 dagen geleden");
  });
});

describe("matchesSearch", () => {
  const request = make({
    invoices: [{ invoice_number: "2026-0042", status: null, forwarded_to_accounting_at: null }],
  });
  it("zoekt op klant, bedrijf, referentie en factuurnummer", () => {
    expect(matchesSearch(request, "anna")).toBe(true);
    expect(matchesSearch(request, "noorderlicht")).toBe(true);
    expect(matchesSearch(request, "bv-2026-001")).toBe(true);
    expect(matchesSearch(request, "0042")).toBe(true);
    expect(matchesSearch(request, "anna zeeman")).toBe(false);
  });
  it("laat alles door bij een leeg zoekveld", () => {
    expect(matchesSearch(request, "  ")).toBe(true);
  });
});

describe("countUnforwardedInvoices", () => {
  it("telt facturen zonder doorstuurmoment of -status", () => {
    const invoices = [
      { invoice_number: "1", status: "forwarded", forwarded_to_accounting_at: null },
      { invoice_number: "2", status: null, forwarded_to_accounting_at: "2026-09-01" },
      { invoice_number: "3", status: "registered", forwarded_to_accounting_at: null },
    ];
    expect(countUnforwardedInvoices({ invoices })).toBe(1);
  });
});

describe("sortRequests", () => {
  const a = make({ customer_company: "Zee", selected_dates: ["2026-09-20"], outstanding: 50 });
  const b = make({ customer_company: "Baai", selected_dates: ["2026-09-01"], outstanding: 500 });
  const c = make({ customer_company: "Duin", selected_dates: [], outstanding: 10 });
  it("zet het oudste evenement bovenaan en projecten zonder datum onderaan", () => {
    expect(sortRequests([a, c, b], "event_oldest")).toEqual([b, a, c]);
  });
  it("sorteert op bedrag en op klant", () => {
    expect(sortRequests([a, b, c], "amount_desc")).toEqual([b, a, c]);
    expect(sortRequests([a, b, c], "customer")).toEqual([b, c, a]);
  });
});
