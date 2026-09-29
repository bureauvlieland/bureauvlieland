import { describe, it, expect } from "vitest";
import { aggregateCommissionStatus, resolveInvoiceCommission } from "../purchaseInvoiceCommission";

describe("resolveInvoiceCommission", () => {
  it("geeft null zonder enige commissiebron", () => {
    expect(resolveInvoiceCommission({})).toBeNull();
    expect(resolveInvoiceCommission({ allocations: [] })).toBeNull();
  });

  it("gebruikt de snapshot op de factuurkop als die er is", () => {
    expect(
      resolveInvoiceCommission({
        supplier_commission_excl_vat: 12.5,
        program_request_item: { commission_amount: 99, commission_status: "invoiced" },
      }),
    ).toEqual({ amount: 12.5, status: "invoiced" });
  });

  it("gebruikt het direct gekoppelde onderdeel", () => {
    expect(
      resolveInvoiceCommission({
        program_request_item: { commission_amount: 58.49, commission_status: "pending" },
      }),
    ).toEqual({ amount: 58.49, status: "pending" });
  });

  it("telt de commissies van de allocaties op bij een verzamelfactuur", () => {
    const result = resolveInvoiceCommission({
      supplier_commission_excl_vat: null,
      program_request_item: null,
      allocations: [
        { program_request_item: { commission_amount: 24.17, commission_status: "pending" } },
        { program_request_item: { commission_amount: 119.73, commission_status: "pending" } },
      ],
    });
    expect(result).toEqual({ amount: 143.9, status: "pending" });
  });

  it("negeert allocaties zonder onderdeel en vat gemengde statussen samen", () => {
    const result = resolveInvoiceCommission({
      allocations: [
        { program_request_item: null },
        { program_request_item: { commission_amount: 10, commission_status: "paid" } },
        { program_request_item: { commission_amount: 5, commission_status: "invoiced" } },
      ],
    });
    expect(result).toEqual({ amount: 15, status: "invoiced" });
  });

  it("valt terug op de logies-offerte", () => {
    expect(
      resolveInvoiceCommission({
        accommodation_quote: { commission_amount: 30, commission_status: "paid" },
      }),
    ).toEqual({ amount: 30, status: "paid" });
  });
});

describe("aggregateCommissionStatus", () => {
  it("is Openstaand zodra één onderdeel nog open staat", () => {
    expect(aggregateCommissionStatus(["paid", "pending"])).toBe("pending");
  });
  it("is Betaald als alles betaald is", () => {
    expect(aggregateCommissionStatus(["paid", "paid"])).toBe("paid");
  });
  it("is Openstaand zonder bekende statussen", () => {
    expect(aggregateCommissionStatus([null, undefined])).toBe("pending");
  });
});
